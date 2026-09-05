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

const redis = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}));

vi.mock('@/db', () => ({ db }));
vi.mock('@/config/redis', () => ({ redis }));

import { cartRoutes } from '@/modules/cart/cart.routes';

const USER_ID = 'user-1';
const PID = '11111111-1111-1111-1111-111111111111';

function authHeader(app: FastifyInstance) {
  return { authorization: `Bearer ${app.jwt.sign({ id: USER_ID })}` };
}

function cartJson(items: Array<Record<string, unknown>>) {
  return JSON.stringify(items);
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
}

describe('cart module (TC-020 – TC-024)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(jwt, { secret: 'test-jwt-secret-min-32-characters!!' });
    await app.register(cartRoutes, { prefix: '/api/cart' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.resetAllMocks();
    setupChainDefaults();

    redis.set.mockResolvedValue('OK');
    redis.del.mockResolvedValue(1);
    redis.get.mockResolvedValue(null);
  });

  describe('GET /api/cart', () => {
    it('returns an empty cart summary when nothing is stored', async () => {
      redis.get.mockResolvedValue(null);

      const res = await app.inject({ method: 'GET', url: '/api/cart', headers: authHeader(app) });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.summary).toEqual({ subtotal: 0, totalItems: 0 });
    });

    it('hydrates stored items with product detail and computes totals', async () => {
      redis.get.mockResolvedValue(cartJson([{ productId: PID, quantity: 2, giftWrap: false, addedAt: 'x' }]));
      chain.where.mockResolvedValueOnce([
        { id: PID, name: 'Amber', slug: 'amber', price: 250000, comparePrice: null, images: [], stock: 10, categoryName: 'Unisex' },
      ]);

      const res = await app.inject({ method: 'GET', url: '/api/cart', headers: authHeader(app) });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.items).toHaveLength(1);
      expect(data.summary).toEqual({ subtotal: 500000, totalItems: 2 });
    });

    it('returns 401 without a token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/cart' });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('TC-020: POST /api/cart/items', () => {
    it('adds a new item to the cart', async () => {
      chain.limit.mockResolvedValueOnce([{ id: PID, stock: 20 }]);
      redis.get.mockResolvedValue(null);

      const res = await app.inject({
        method: 'POST',
        url: '/api/cart/items',
        headers: authHeader(app),
        payload: { productId: PID, quantity: 2 },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.totalItems).toBe(2);
      expect(redis.set).toHaveBeenCalledWith(
        `cart:${USER_ID}`,
        expect.stringContaining(PID),
        'EX',
        expect.any(Number)
      );
    });

    it('returns 404 when the product does not exist', async () => {
      chain.limit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/cart/items',
        headers: authHeader(app),
        payload: { productId: PID, quantity: 1 },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('NOT_FOUND');
    });

    it('returns 400 INSUFFICIENT_STOCK when quantity exceeds stock', async () => {
      chain.limit.mockResolvedValueOnce([{ id: PID, stock: 1 }]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/cart/items',
        headers: authHeader(app),
        payload: { productId: PID, quantity: 5 },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('INSUFFICIENT_STOCK');
    });

    it('returns 429 when the cart lock cannot be acquired', async () => {
      chain.limit.mockResolvedValueOnce([{ id: PID, stock: 20 }]);
      redis.set.mockResolvedValueOnce(null);

      const res = await app.inject({
        method: 'POST',
        url: '/api/cart/items',
        headers: authHeader(app),
        payload: { productId: PID, quantity: 1 },
      });

      expect(res.statusCode).toBe(429);
      expect(res.json().error.code).toBe('RATE_LIMIT');
    });

    it('returns 400 VALIDATION_ERROR for an invalid productId', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/cart/items',
        headers: authHeader(app),
        payload: { productId: 'not-a-uuid', quantity: 1 },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });

    it('merges quantity when the item already exists in the cart', async () => {
      chain.limit.mockResolvedValueOnce([{ id: PID, stock: 20 }]);
      redis.get.mockResolvedValue(cartJson([{ productId: PID, quantity: 2, giftWrap: false, addedAt: 'x' }]));

      const res = await app.inject({
        method: 'POST',
        url: '/api/cart/items',
        headers: authHeader(app),
        payload: { productId: PID, quantity: 3, giftWrap: true },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.totalItems).toBe(5);
      const saved = JSON.parse(redis.set.mock.calls.find((c) => c[0] === `cart:${USER_ID}`)![1] as string);
      expect(saved[0].quantity).toBe(5);
      expect(saved[0].giftWrap).toBe(true);
    });

    it('returns 400 MAX_QUANTITY when the merged quantity exceeds 10', async () => {
      chain.limit.mockResolvedValueOnce([{ id: PID, stock: 20 }]);
      redis.get.mockResolvedValue(cartJson([{ productId: PID, quantity: 9, giftWrap: false, addedAt: 'x' }]));

      const res = await app.inject({
        method: 'POST',
        url: '/api/cart/items',
        headers: authHeader(app),
        payload: { productId: PID, quantity: 5 },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('MAX_QUANTITY');
    });
  });

  describe('TC-021: PUT /api/cart/items/:productId', () => {
    it('updates the quantity of an existing item', async () => {
      chain.limit.mockResolvedValueOnce([{ id: PID, stock: 20 }]);
      redis.get.mockResolvedValue(cartJson([{ productId: PID, quantity: 1, giftWrap: false, addedAt: 'x' }]));

      const res = await app.inject({
        method: 'PUT',
        url: `/api/cart/items/${PID}`,
        headers: authHeader(app),
        payload: { quantity: 3 },
      });

      expect(res.statusCode).toBe(200);
      expect(redis.set).toHaveBeenCalled();
    });

    it('returns 404 when the item is not in the cart', async () => {
      chain.limit.mockResolvedValueOnce([{ id: PID, stock: 20 }]);
      redis.get.mockResolvedValue(cartJson([]));

      const res = await app.inject({
        method: 'PUT',
        url: `/api/cart/items/${PID}`,
        headers: authHeader(app),
        payload: { quantity: 3 },
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 400 INSUFFICIENT_STOCK when quantity exceeds stock', async () => {
      chain.limit.mockResolvedValueOnce([{ id: PID, stock: 2 }]);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/cart/items/${PID}`,
        headers: authHeader(app),
        payload: { quantity: 5 },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('INSUFFICIENT_STOCK');
    });
  });

  describe('TC-022: DELETE /api/cart/items/:productId', () => {
    it('removes an existing item', async () => {
      redis.get.mockResolvedValue(cartJson([{ productId: PID, quantity: 1, giftWrap: false, addedAt: 'x' }]));

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/cart/items/${PID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(redis.set).toHaveBeenCalled();
    });

    it('returns 404 when removing an item not in the cart', async () => {
      redis.get.mockResolvedValue(cartJson([]));

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/cart/items/${PID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('TC-023: POST /api/cart/apply-promo', () => {
    function activePromo(overrides: Record<string, unknown> = {}) {
      return {
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

    it('applies a percentage discount', async () => {
      chain.limit.mockResolvedValueOnce([activePromo()]);
      redis.get.mockResolvedValue(cartJson([{ productId: PID, quantity: 2, giftWrap: false, addedAt: 'x' }]));
      chain.where.mockReturnValueOnce(chain);
      chain.where.mockResolvedValueOnce([{ id: PID, price: 250000 }]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/cart/apply-promo',
        headers: authHeader(app),
        payload: { code: 'hemat10' },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.subtotal).toBe(500000);
      expect(data.discount).toBe(50000);
      expect(data.total).toBe(450000);
    });

    it('caps a percentage discount at maxDiscount', async () => {
      chain.limit.mockResolvedValueOnce([activePromo({ value: 50, maxDiscount: 100000 })]);
      redis.get.mockResolvedValue(cartJson([{ productId: PID, quantity: 2, giftWrap: false, addedAt: 'x' }]));
      chain.where.mockReturnValueOnce(chain);
      chain.where.mockResolvedValueOnce([{ id: PID, price: 250000 }]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/cart/apply-promo',
        headers: authHeader(app),
        payload: { code: 'HEMAT10' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.discount).toBe(100000);
    });

    it('applies a fixed-amount discount', async () => {
      chain.limit.mockResolvedValueOnce([activePromo({ type: 'FIXED', value: 30000 })]);
      redis.get.mockResolvedValue(cartJson([{ productId: PID, quantity: 1, giftWrap: false, addedAt: 'x' }]));
      chain.where.mockReturnValueOnce(chain);
      chain.where.mockResolvedValueOnce([{ id: PID, price: 250000 }]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/cart/apply-promo',
        headers: authHeader(app),
        payload: { code: 'HEMAT10' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.discount).toBe(30000);
      expect(res.json().data.total).toBe(220000);
    });

    it('returns 400 VALIDATION_ERROR when the code is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/cart/apply-promo',
        headers: authHeader(app),
        payload: {},
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 for an unknown promo code', async () => {
      chain.limit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/cart/apply-promo',
        headers: authHeader(app),
        payload: { code: 'NOPE' },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('NOT_FOUND');
    });

    it('returns 400 when the promo is inactive', async () => {
      chain.limit.mockResolvedValueOnce([activePromo({ status: 'INACTIVE' })]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/cart/apply-promo',
        headers: authHeader(app),
        payload: { code: 'HEMAT10' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('PROMO_INACTIVE');
    });

    it('returns 400 when the promo requires a higher minimum order', async () => {
      chain.limit.mockResolvedValueOnce([activePromo({ minOrder: 1000000 })]);
      redis.get.mockResolvedValue(cartJson([{ productId: PID, quantity: 1, giftWrap: false, addedAt: 'x' }]));
      chain.where.mockReturnValueOnce(chain);
      chain.where.mockResolvedValueOnce([{ id: PID, price: 250000 }]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/cart/apply-promo',
        headers: authHeader(app),
        payload: { code: 'HEMAT10' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('MIN_ORDER');
    });

    it('returns 400 when the cart is empty', async () => {
      chain.limit.mockResolvedValueOnce([activePromo()]);
      redis.get.mockResolvedValue(cartJson([]));

      const res = await app.inject({
        method: 'POST',
        url: '/api/cart/apply-promo',
        headers: authHeader(app),
        payload: { code: 'HEMAT10' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('EMPTY_CART');
    });
  });

  describe('TC-024: DELETE /api/cart', () => {
    it('empties the cart', async () => {
      const res = await app.inject({ method: 'DELETE', url: '/api/cart', headers: authHeader(app) });

      expect(res.statusCode).toBe(200);
      expect(redis.del).toHaveBeenCalledWith(`cart:${USER_ID}`);
    });
  });
});
