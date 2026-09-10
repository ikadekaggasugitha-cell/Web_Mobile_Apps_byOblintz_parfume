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
  const returningResult = vi.fn();

  const db = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn(),
    transaction: vi.fn(),
  };

  return { chain, returningResult, db };
});

vi.mock('@/db', () => ({ db }));

import { stockRoutes } from '@/modules/stock/stock.routes';

const PRODUCT_ID = '11111111-1111-1111-1111-111111111111';

function adminHeader(app: FastifyInstance) {
  return { authorization: `Bearer ${app.jwt.sign({ id: 'admin-1', role: 'ADMIN' })}` };
}
function userHeader(app: FastifyInstance) {
  return { authorization: `Bearer ${app.jwt.sign({ id: 'user-1', role: 'USER' })}` };
}

function makeProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: PRODUCT_ID,
    name: 'Test Parfum',
    sku: 'SKU-1',
    stock: 10,
    price: '250000',
    status: 'ACTIVE',
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

describe('stock module', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(jwt, { secret: 'test-jwt-secret-min-32-characters!!' });
    await app.register(stockRoutes, { prefix: '/api/stock' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.resetAllMocks();
    setupChainDefaults();

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

  describe('POST /api/stock/adjustment', () => {
    it('RESTOCK adds stock', async () => {
      chain.limit.mockResolvedValueOnce([makeProduct({ stock: 10 })]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/stock/adjustment',
        headers: adminHeader(app),
        payload: { productId: PRODUCT_ID, quantity: 5, type: 'RESTOCK' },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.product.previousStock).toBe(10);
      expect(data.product.currentStock).toBe(15);
      expect(db.transaction).toHaveBeenCalled();
    });

    it('ADJUSTMENT reduces stock', async () => {
      chain.limit.mockResolvedValueOnce([makeProduct({ stock: 10 })]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/stock/adjustment',
        headers: adminHeader(app),
        payload: { productId: PRODUCT_ID, quantity: 3, type: 'ADJUSTMENT' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.product.currentStock).toBe(7);
    });

    it('RETURN adds stock back to inventory (regression: must not subtract)', async () => {
      chain.limit.mockResolvedValueOnce([makeProduct({ stock: 10 })]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/stock/adjustment',
        headers: adminHeader(app),
        payload: { productId: PRODUCT_ID, quantity: 4, type: 'RETURN' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.product.currentStock).toBe(14);
    });

    it('rejects an ADJUSTMENT that would drive stock below zero', async () => {
      chain.limit.mockResolvedValueOnce([makeProduct({ stock: 10 })]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/stock/adjustment',
        headers: adminHeader(app),
        payload: { productId: PRODUCT_ID, quantity: 20, type: 'ADJUSTMENT' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('INSUFFICIENT_STOCK');
      expect(db.transaction).not.toHaveBeenCalled();
    });

    it('returns 404 when the product does not exist', async () => {
      chain.limit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/stock/adjustment',
        headers: adminHeader(app),
        payload: { productId: PRODUCT_ID, quantity: 5, type: 'RESTOCK' },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('NOT_FOUND');
    });

    it('returns 400 VALIDATION_ERROR for an invalid type', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/stock/adjustment',
        headers: adminHeader(app),
        payload: { productId: PRODUCT_ID, quantity: 5, type: 'NONSENSE' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a non-admin caller with 403', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/stock/adjustment',
        headers: userHeader(app),
        payload: { productId: PRODUCT_ID, quantity: 5, type: 'RESTOCK' },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /api/stock/recap', () => {
    it('returns aggregated stock stats', async () => {
      // Four parallel .from().where() terminal queries, in order.
      chain.where
        .mockResolvedValueOnce([{ count: 12 }])   // totalProducts
        .mockResolvedValueOnce([{ count: 3 }])    // lowStock
        .mockResolvedValueOnce([{ count: 1 }])    // outOfStock
        .mockResolvedValueOnce([{ total: 5000000 }]); // totalStockValue

      const res = await app.inject({
        method: 'GET',
        url: '/api/stock/recap',
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toEqual({
        totalProducts: 12,
        lowStock: 3,
        outOfStock: 1,
        totalStockValue: 5000000,
      });
    });
  });
});
