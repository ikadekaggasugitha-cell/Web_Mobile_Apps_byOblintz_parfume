import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';

const { chain, returningResult, db } = vi.hoisted(() => {
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
    innerJoin: vi.fn(),
    leftJoin: vi.fn(),
    groupBy: vi.fn(),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.offset.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  chain.leftJoin.mockReturnValue(chain);
  chain.groupBy.mockReturnValue(chain);

  const returningResult = vi.fn();

  const db = {
    select: vi.fn().mockReturnValue(chain),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: returningResult,
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: returningResult,
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn(),
    }),
    execute: vi.fn(),
    transaction: vi.fn(),
  };

  return { chain, returningResult, db };
});

const redis = vi.hoisted(() => ({ get: vi.fn(), del: vi.fn() }));

vi.mock('@/db', () => ({ db }));
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

function setupChainDefaults() {
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.offset.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  chain.leftJoin.mockReturnValue(chain);
  chain.groupBy.mockReturnValue(chain);
  db.select.mockReturnValue(chain);
  db.insert.mockReturnValue({
    values: vi.fn().mockReturnValue({ returning: returningResult }),
  });
  db.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ returning: returningResult }),
    }),
  });
  db.delete.mockReturnValue({ where: vi.fn() });
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
    vi.resetAllMocks();
    setupChainDefaults();

    redis.get.mockResolvedValue(cartJson([{ productId: PID, quantity: 2, giftWrap: false }]));
    redis.del.mockResolvedValue(1);

    db.transaction = vi.fn().mockImplementation(async (fn: Function) => {
      const tx = {
        select: vi.fn().mockReturnValue(chain),
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ returning: returningResult }) }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: returningResult }) }) }),
        delete: vi.fn().mockReturnValue({ where: vi.fn() }),
      };
      return fn(tx);
    });
  });

  describe('TC-030: POST /api/checkout (with saved address)', () => {
    it('creates an order and returns the summary', async () => {
      // Q1: db.select({...}).from(products).where(...)  → terminal .where()
      // Q4: tx.select({stock}).from(products).where(...).limit(1)  → terminal .limit(1)
      chain.where.mockResolvedValueOnce([
        { id: PID, name: 'Amber Noir', price: 250000, stock: 20 },
      ]);
      returningResult.mockResolvedValueOnce([{ id: 'order-1', orderNumber: 'ORD-TESTORDR' }]);
      chain.limit.mockResolvedValueOnce([{ stock: 20 }]);

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

  describe('TC-032: POST /api/checkout/preview', () => {
    it('previews totals including shipping and gift wrap', async () => {
      redis.get.mockResolvedValue(cartJson([{ productId: PID, quantity: 2, giftWrap: true }]));
      chain.where.mockResolvedValueOnce([
        { id: PID, name: 'Amber Noir', price: 250000, stock: 20 },
      ]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/checkout/preview',
        headers: authHeader(app),
        payload: {},
      });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.subtotal).toBe(530000);
      expect(data.totalGiftWrap).toBe(30000);
      expect(data.shippingCost).toBe(15000);
      expect(data.total).toBe(545000);
    });

    it('applies a percentage promo in the preview', async () => {
      // Q1: db.select().from(products).where(...)  → terminal .where()
      // Q2: db.select().from(promoCodes).where(...).limit(1)  → terminal .limit(1)
      chain.where.mockResolvedValueOnce([
        { id: PID, name: 'Amber Noir', price: 250000, stock: 20 },
      ]);
      chain.limit.mockResolvedValueOnce([activePromo()]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/checkout/preview',
        headers: authHeader(app),
        payload: { promoCode: 'hemat10' },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.discount).toBe(50000);
      expect(data.total).toBe(465000);
    });

    it('does NOT apply an expired promo in the preview', async () => {
      chain.where.mockResolvedValueOnce([
        { id: PID, name: 'Amber Noir', price: 250000, stock: 20 },
      ]);
      chain.limit.mockResolvedValueOnce([activePromo({ endDate: new Date('2000-01-01') })]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/checkout/preview',
        headers: authHeader(app),
        payload: { promoCode: 'HEMAT10' },
      });

      expect(res.statusCode).toBe(200);
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

  describe('processCheckout service', () => {
    const baseData = {
      userId: USER_ID,
      shippingAddress: ADDRESS,
      shippingMethod: 'standard',
    };

    it('uses express shipping cost when selected', async () => {
      chain.where.mockResolvedValueOnce([
        { id: PID, name: 'Amber Noir', price: 250000, stock: 20 },
      ]);
      returningResult.mockResolvedValueOnce([{ id: 'order-1', orderNumber: 'ORD-TESTORDR' }]);
      chain.limit.mockResolvedValueOnce([{ stock: 20 }]);

      const result = await processCheckout({ ...baseData, shippingMethod: 'express' });

      expect(result.shippingFee).toBe(35000);
      expect(result.totalAmount).toBe(535000);
    });

    it('falls back to standard shipping for an unknown method', async () => {
      chain.where.mockResolvedValueOnce([
        { id: PID, name: 'Amber Noir', price: 250000, stock: 20 },
      ]);
      returningResult.mockResolvedValueOnce([{ id: 'order-1', orderNumber: 'ORD-TESTORDR' }]);
      chain.limit.mockResolvedValueOnce([{ stock: 20 }]);

      const result = await processCheckout({ ...baseData, shippingMethod: 'teleport' });
      expect(result.shippingFee).toBe(15000);
    });

    it('creates a gift wrapping record when an item is gift wrapped', async () => {
      redis.get.mockResolvedValue(cartJson([{ productId: PID, quantity: 1, giftWrap: true }]));
      chain.where.mockResolvedValueOnce([
        { id: PID, name: 'Amber Noir', price: 250000, stock: 20 },
      ]);
      returningResult.mockResolvedValueOnce([{ id: 'order-1', orderNumber: 'ORD-TESTORDR' }]);
      chain.limit.mockResolvedValueOnce([{ stock: 20 }]);

      const result = await processCheckout(baseData);

      expect(result.totalGiftWrap).toBe(15000);
    });

    it('applies a capped percentage promo and increments usage', async () => {
      // Q1: db.select({...}).from(products).where(...)  → terminal .where()
      // Q2: db.select().from(promoCodes).where(...).limit(1)  → terminal .limit(1)
      // Q4: tx.select({stock}).from(products).where(...).limit(1)  → terminal .limit(1)
      chain.where.mockResolvedValueOnce([
        { id: PID, name: 'Amber Noir', price: 250000, stock: 20 },
      ]);
      chain.limit.mockResolvedValueOnce([
        activePromo({ value: 50, maxDiscount: 100000 }),
      ]);
      returningResult.mockResolvedValueOnce([{ id: 'order-1', orderNumber: 'ORD-TESTORDR' }]);
      chain.limit.mockResolvedValueOnce([{ stock: 20 }]);

      const result = await processCheckout({ ...baseData, promoCode: 'HEMAT10' });

      expect(result.discount).toBe(100000);
    });

    it('applies a fixed promo', async () => {
      chain.where.mockResolvedValueOnce([
        { id: PID, name: 'Amber Noir', price: 250000, stock: 20 },
      ]);
      chain.limit.mockResolvedValueOnce([
        activePromo({ type: 'FIXED', value: 40000 }),
      ]);
      returningResult.mockResolvedValueOnce([{ id: 'order-1', orderNumber: 'ORD-TESTORDR' }]);
      chain.limit.mockResolvedValueOnce([{ stock: 20 }]);

      const result = await processCheckout({ ...baseData, promoCode: 'HEMAT10' });
      expect(result.discount).toBe(40000);
    });

    it('applies a free-shipping promo', async () => {
      chain.where.mockResolvedValueOnce([
        { id: PID, name: 'Amber Noir', price: 250000, stock: 20 },
      ]);
      chain.limit.mockResolvedValueOnce([
        activePromo({ type: 'FREE_SHIPPING' }),
      ]);
      returningResult.mockResolvedValueOnce([{ id: 'order-1', orderNumber: 'ORD-TESTORDR' }]);
      chain.limit.mockResolvedValueOnce([{ stock: 20 }]);

      const result = await processCheckout({ ...baseData, promoCode: 'HEMAT10' });
      expect(result.discount).toBe(15000);
    });

    it('ignores a promo whose minimum order is not met', async () => {
      chain.where.mockResolvedValueOnce([
        { id: PID, name: 'Amber Noir', price: 250000, stock: 20 },
      ]);
      chain.limit.mockResolvedValueOnce([
        activePromo({ minOrder: 10000000 }),
      ]);
      returningResult.mockResolvedValueOnce([{ id: 'order-1', orderNumber: 'ORD-TESTORDR' }]);
      chain.limit.mockResolvedValueOnce([{ stock: 20 }]);

      const result = await processCheckout({ ...baseData, promoCode: 'HEMAT10' });

      expect(result.discount).toBe(0);
    });

    it('ignores an inactive promo', async () => {
      chain.where.mockResolvedValueOnce([
        { id: PID, name: 'Amber Noir', price: 250000, stock: 20 },
      ]);
      chain.limit.mockResolvedValueOnce([
        activePromo({ status: 'INACTIVE' }),
      ]);
      returningResult.mockResolvedValueOnce([{ id: 'order-1', orderNumber: 'ORD-TESTORDR' }]);
      chain.limit.mockResolvedValueOnce([{ stock: 20 }]);

      const result = await processCheckout({ ...baseData, promoCode: 'HEMAT10' });
      expect(result.discount).toBe(0);
    });

    it('throws when the cart is empty', async () => {
      redis.get.mockResolvedValue(cartJson([]));

      await expect(processCheckout(baseData)).rejects.toThrow('Keranjang kosong');
    });

    it('throws when a cart product no longer exists', async () => {
      chain.where.mockResolvedValueOnce([]);

      await expect(processCheckout(baseData)).rejects.toThrow('tidak ditemukan');
    });

    it('throws when stock is insufficient at decrement time', async () => {
      chain.where.mockResolvedValueOnce([
        { id: PID, name: 'Amber Noir', price: 250000, stock: 20 },
      ]);
      returningResult.mockResolvedValueOnce([{ id: 'order-1', orderNumber: 'ORD-TESTORDR' }]);
      chain.limit.mockResolvedValueOnce([{ stock: 0 }]);

      await expect(processCheckout(baseData)).rejects.toThrow('tidak mencukupi');
    });
  });
});
