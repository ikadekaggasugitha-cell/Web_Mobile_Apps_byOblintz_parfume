import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';

const prisma = vi.hoisted(() => ({
  product: { findMany: vi.fn(), updateMany: vi.fn() },
  promoCode: { findUnique: vi.fn(), update: vi.fn() },
  order: { create: vi.fn() },
  orderItem: { create: vi.fn() },
  giftWrapping: { create: vi.fn() },
  $transaction: vi.fn(),
}));

const redis = vi.hoisted(() => ({ get: vi.fn(), del: vi.fn() }));

vi.mock('@/config/database', () => ({ default: prisma, prisma }));
vi.mock('@/config/redis', () => ({ redis }));
vi.mock('nanoid', () => ({ nanoid: () => 'TESTORDR' }));

import { checkoutRoutes } from '@/modules/checkout/checkout.routes';
import { processCheckout } from '@/modules/checkout/checkout.service';

const USER_ID = 'user-1';
const PID = '11111111-1111-1111-1111-111111111111';

const ADDRESS = {
  name: 'Budi',
  phone: '081234567890',
  address: 'Jl. Merdeka No. 1',
  city: 'Jakarta',
  province: 'DKI Jakarta',
  postalCode: '12345',
};

function authHeader(app: FastifyInstance) {
  return { authorization: `Bearer ${app.jwt.sign({ id: USER_ID })}` };
}

function cartJson(items: Array<Record<string, unknown>>) {
  return JSON.stringify(items);
}

function activePromo(overrides: Record<string, unknown> = {}) {
  return {
    id: 'promo-1',
    code: 'HEMAT10',
    status: 'ACTIVE',
    startDate: null,
    endDate: null,
    usageLimit: null,
    usedCount: 0,
    minOrder: null,
    type: 'PERCENTAGE',
    value: 10,
    maxDiscount: null,
    ...overrides,
  };
}

describe('checkout module (TC-030 – TC-033)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(jwt, { secret: 'test-jwt-secret-min-32-characters!!' });
    await app.register(checkoutRoutes, { prefix: '/api/checkout' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    redis.get.mockResolvedValue(cartJson([{ productId: PID, quantity: 2, giftWrap: false }]));
    redis.del.mockResolvedValue(1);
    prisma.product.findMany.mockResolvedValue([
      { id: PID, name: 'Amber Noir', price: 250000, stock: 20 },
    ]);
    prisma.product.updateMany.mockResolvedValue({ count: 1 });
    prisma.order.create.mockResolvedValue({ id: 'order-1', orderNumber: 'ORD-TESTORDR' });
    prisma.orderItem.create.mockResolvedValue({});
    prisma.giftWrapping.create.mockResolvedValue({});
    prisma.promoCode.update.mockResolvedValue({});
    prisma.$transaction.mockImplementation(
      async (cb: (tx: typeof prisma) => unknown) => cb(prisma)
    );
  });

  // ==================== ROUTE: POST /api/checkout ====================
  describe('TC-030: POST /api/checkout (with saved address)', () => {
    it('creates an order and returns the summary', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/checkout',
        headers: authHeader(app),
        payload: { shippingAddress: ADDRESS, shippingMethod: 'standard' },
      });

      expect(res.statusCode).toBe(201);
      const data = res.json().data;
      expect(data.orderNumber).toBe('ORD-TESTORDR');
      expect(data.subtotal).toBe(500000);
      expect(data.shippingFee).toBe(15000);
      expect(data.totalAmount).toBe(515000);
      expect(redis.del).toHaveBeenCalledWith(`cart:${USER_ID}`);
    });

    it('returns 400 CHECKOUT_ERROR when the cart is empty', async () => {
      redis.get.mockResolvedValue(null);

      const res = await app.inject({
        method: 'POST',
        url: '/api/checkout',
        headers: authHeader(app),
        payload: { shippingAddress: ADDRESS },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('CHECKOUT_ERROR');
    });

    it('returns 400 VALIDATION_ERROR on invalid shipping address', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/checkout',
        headers: authHeader(app),
        payload: { shippingAddress: { name: 'X' } },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 401 without a token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/checkout',
        payload: { shippingAddress: ADDRESS },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== ROUTE: POST /api/checkout/preview ====================
  describe('TC-032: POST /api/checkout/preview (select method / review totals)', () => {
    it('previews totals including shipping and gift wrap', async () => {
      redis.get.mockResolvedValue(cartJson([{ productId: PID, quantity: 2, giftWrap: true }]));

      const res = await app.inject({
        method: 'POST',
        url: '/api/checkout/preview',
        headers: authHeader(app),
        payload: {},
      });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      // 2 × 250000 + gift wrap (2 × 15000) = 530000 subtotal
      expect(data.subtotal).toBe(530000);
      expect(data.totalGiftWrap).toBe(30000);
      expect(data.shippingCost).toBe(15000);
      expect(data.total).toBe(545000);
    });

    it('applies a percentage promo in the preview', async () => {
      prisma.promoCode.findUnique.mockResolvedValue(activePromo());

      const res = await app.inject({
        method: 'POST',
        url: '/api/checkout/preview',
        headers: authHeader(app),
        payload: { promoCode: 'hemat10' },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.discount).toBe(50000); // 10% of 500000
      expect(data.total).toBe(465000); // 500000 + 15000 - 50000
    });

    it('does NOT apply an expired promo in the preview (M1 consistency)', async () => {
      prisma.promoCode.findUnique.mockResolvedValue(activePromo({ endDate: new Date('2000-01-01') }));

      const res = await app.inject({
        method: 'POST',
        url: '/api/checkout/preview',
        headers: authHeader(app),
        payload: { promoCode: 'HEMAT10' },
      });

      expect(res.statusCode).toBe(200);
      // Previously preview ignored dates and applied 50000; now it agrees with checkout.
      expect(res.json().data.discount).toBe(0);
    });

    it('returns 400 EMPTY_CART when the cart is empty', async () => {
      redis.get.mockResolvedValue(null);

      const res = await app.inject({
        method: 'POST',
        url: '/api/checkout/preview',
        headers: authHeader(app),
        payload: {},
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('EMPTY_CART');
    });
  });

  // ==================== SERVICE: processCheckout branches ====================
  describe('processCheckout service', () => {
    const baseData = {
      userId: USER_ID,
      shippingAddress: ADDRESS,
      shippingMethod: 'standard',
    };

    it('uses express shipping cost when selected', async () => {
      const result = await processCheckout({ ...baseData, shippingMethod: 'express' });

      expect(result.shippingFee).toBe(35000);
      expect(result.totalAmount).toBe(535000); // 500000 + 35000
    });

    it('falls back to standard shipping for an unknown method', async () => {
      const result = await processCheckout({ ...baseData, shippingMethod: 'teleport' });
      expect(result.shippingFee).toBe(15000);
    });

    it('creates a gift wrapping record when an item is gift wrapped', async () => {
      redis.get.mockResolvedValue(cartJson([{ productId: PID, quantity: 1, giftWrap: true }]));

      const result = await processCheckout(baseData);

      expect(result.totalGiftWrap).toBe(15000);
      expect(prisma.giftWrapping.create).toHaveBeenCalled();
    });

    it('applies a capped percentage promo and increments usage', async () => {
      prisma.promoCode.findUnique.mockResolvedValue(
        activePromo({ value: 50, maxDiscount: 100000 })
      );

      const result = await processCheckout({ ...baseData, promoCode: 'HEMAT10' });

      expect(result.discount).toBe(100000); // capped
      expect(prisma.promoCode.update).toHaveBeenCalledWith({
        where: { id: 'promo-1' },
        data: { usedCount: { increment: 1 } },
      });
    });

    it('applies a fixed promo', async () => {
      prisma.promoCode.findUnique.mockResolvedValue(
        activePromo({ type: 'FIXED', value: 40000 })
      );

      const result = await processCheckout({ ...baseData, promoCode: 'HEMAT10' });
      expect(result.discount).toBe(40000);
    });

    it('applies a free-shipping promo', async () => {
      prisma.promoCode.findUnique.mockResolvedValue(
        activePromo({ type: 'FREE_SHIPPING' })
      );

      const result = await processCheckout({ ...baseData, promoCode: 'HEMAT10' });
      expect(result.discount).toBe(15000); // equals shipping fee
    });

    it('ignores a promo whose minimum order is not met', async () => {
      prisma.promoCode.findUnique.mockResolvedValue(
        activePromo({ minOrder: 10000000 })
      );

      const result = await processCheckout({ ...baseData, promoCode: 'HEMAT10' });

      expect(result.discount).toBe(0);
      expect(prisma.promoCode.update).not.toHaveBeenCalled();
    });

    it('ignores an inactive promo', async () => {
      prisma.promoCode.findUnique.mockResolvedValue(
        activePromo({ status: 'INACTIVE' })
      );

      const result = await processCheckout({ ...baseData, promoCode: 'HEMAT10' });
      expect(result.discount).toBe(0);
    });

    it('throws when the cart is empty', async () => {
      redis.get.mockResolvedValue(cartJson([]));

      await expect(processCheckout(baseData)).rejects.toThrow('Keranjang kosong');
    });

    it('throws when a cart product no longer exists', async () => {
      prisma.product.findMany.mockResolvedValue([]);

      await expect(processCheckout(baseData)).rejects.toThrow('tidak ditemukan');
    });

    it('throws when stock is insufficient at decrement time', async () => {
      prisma.product.updateMany.mockResolvedValue({ count: 0 });

      await expect(processCheckout(baseData)).rejects.toThrow('tidak mencukupi');
    });
  });
});
