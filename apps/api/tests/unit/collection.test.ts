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
    query: {
      collections: { findMany: vi.fn() },
    },
  };

  return { chain, returningResult, db };
});

vi.mock('@/db', () => ({ db }));

import { collectionRoutes } from '@/modules/collection/collection.routes';

const USER_ID = 'user-1';
const COL_ID = 'col-1';
const PID = 'prod-1';

function authHeader(app: FastifyInstance) {
  return { authorization: `Bearer ${app.jwt.sign({ id: USER_ID })}` };
}

function makeCollection(overrides: Record<string, unknown> = {}) {
  return { id: COL_ID, userId: USER_ID, name: 'Favorit Saya', ...overrides };
}

describe('collection module', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(jwt, { secret: 'test-jwt-secret-min-32-characters!!' });
    await app.register(collectionRoutes, { prefix: '/api/collections' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.resetAllMocks();
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
      values: vi.fn().mockReturnValue({
        returning: returningResult,
      }),
    });
    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: returningResult,
        }),
      }),
    });
    db.delete.mockReturnValue({
      where: vi.fn(),
    });
  });

  // ==================== LIST ====================
  describe('GET /api/collections', () => {
    it('lists the user collections', async () => {
      // Route: db.query.collections.findMany({...})
      // Then: db.select({...}).from(reviews).where(inArray(...)).groupBy(reviews.productId)
      db.query.collections.findMany.mockResolvedValueOnce([
        makeCollection({ items: [{ product: { id: 'p1' } }] }),
      ]);
      chain.groupBy.mockResolvedValueOnce([{ productId: 'p1', count: 0 }]);

      const res = await app.inject({ method: 'GET', url: '/api/collections', headers: authHeader(app) });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toHaveLength(1);
    });

    it('returns 401 without a token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/collections' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== CREATE ====================
  describe('POST /api/collections', () => {
    it('creates a collection', async () => {
      // Route: db.insert(collections).values({...}).returning()
      returningResult.mockResolvedValueOnce([makeCollection()]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/collections',
        headers: authHeader(app),
        payload: { name: '  Favorit Saya  ' },
      });

      expect(res.statusCode).toBe(201);
      expect(db.insert).toHaveBeenCalled();
    });

    it('returns 400 when the name is empty', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/collections',
        headers: authHeader(app),
        payload: { name: '   ' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ==================== DETAIL ====================
  describe('GET /api/collections/:id', () => {
    it('returns the collection detail', async () => {
      // Route: db.query.collections.findMany({where, with, limit: 1})
      // Then: db.select({...}).from(reviews).where(inArray(...)).groupBy(reviews.productId)
      db.query.collections.findMany.mockResolvedValueOnce([
        makeCollection({ items: [{ product: { id: 'p1' } }] }),
      ]);
      chain.groupBy.mockResolvedValueOnce([{ productId: 'p1', count: 0 }]);

      const res = await app.inject({
        method: 'GET',
        url: `/api/collections/${COL_ID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.id).toBe(COL_ID);
    });

    it('returns 404 when not owned', async () => {
      // Route: db.query.collections.findMany({where, with, limit: 1}) → []
      db.query.collections.findMany.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'GET',
        url: `/api/collections/${COL_ID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== UPDATE ====================
  describe('PUT /api/collections/:id', () => {
    it('renames the collection', async () => {
      // Route: db.select().from(collections).where(and(...)).limit(1)
      // Chain: select → from → where → limit (terminal)
      chain.limit.mockResolvedValueOnce([makeCollection()]);
      // Route: db.update(collections).set({...}).where(eq(...)).returning()
      returningResult.mockResolvedValueOnce([makeCollection({ name: 'Koleksi Baru' })]);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/collections/${COL_ID}`,
        headers: authHeader(app),
        payload: { name: 'Koleksi Baru' },
      });

      expect(res.statusCode).toBe(200);
      expect(db.update).toHaveBeenCalled();
    });

    it('returns 404 when the collection is not owned', async () => {
      // Route: db.select().from(collections).where(and(...)).limit(1) → []
      chain.limit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/collections/${COL_ID}`,
        headers: authHeader(app),
        payload: { name: 'X' },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== DELETE ====================
  describe('DELETE /api/collections/:id', () => {
    it('deletes the collection and its items', async () => {
      // Route: db.select().from(collections).where(and(...)).limit(1)
      chain.limit.mockResolvedValueOnce([makeCollection()]);
      // Route: db.delete(collectionItems).where(...)
      const whereMock1 = vi.fn();
      // Route: db.delete(collections).where(...)
      const whereMock2 = vi.fn();
      db.delete
        .mockReturnValueOnce({ where: whereMock1 })
        .mockReturnValueOnce({ where: whereMock2 });

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/collections/${COL_ID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(db.delete).toHaveBeenCalledTimes(2);
    });

    it('returns 404 when the collection is not owned', async () => {
      chain.limit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/collections/${COL_ID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== ADD PRODUCT ====================
  describe('POST /api/collections/:id/products', () => {
    it('adds a product to the collection', async () => {
      // Q1: db.select().from(collections).where(and(...)).limit(1) → chain.limit
      // Q2: db.select().from(products).where(eq(...)).limit(1) → chain.limit
      // Q3: db.select().from(collectionItems).where(and(...)).limit(1) → chain.limit
      // Q4: db.select({itemCount}).from(collectionItems).where(eq(...)) → chain.where (terminal!)
      // Q5: db.insert(collectionItems).values({...}) → insert (no returning)
      chain.limit
        .mockResolvedValueOnce([makeCollection()])   // Q1
        .mockResolvedValueOnce([{ id: PID }])         // Q2
        .mockResolvedValueOnce([]);                    // Q3
      chain.where
        .mockReturnValueOnce(chain)                    // Q1 .where() chaining
        .mockReturnValueOnce(chain)                    // Q2 .where() chaining
        .mockReturnValueOnce(chain)                    // Q3 .where() chaining
        .mockResolvedValueOnce([{ itemCount: 0 }]);   // Q4 .where() terminal

      const res = await app.inject({
        method: 'POST',
        url: `/api/collections/${COL_ID}/products`,
        headers: authHeader(app),
        payload: { productId: PID },
      });

      expect(res.statusCode).toBe(201);
      expect(db.insert).toHaveBeenCalled();
    });

    it('returns 404 when the collection is not owned', async () => {
      // Q1: db.select().from(collections).where(and(...)).limit(1) → []
      chain.limit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'POST',
        url: `/api/collections/${COL_ID}/products`,
        headers: authHeader(app),
        payload: { productId: PID },
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 404 when the product does not exist', async () => {
      // Q1: db.select().from(collections).where(and(...)).limit(1) → [makeCollection()]
      // Q2: db.select().from(products).where(eq(...)).limit(1) → []
      chain.limit
        .mockResolvedValueOnce([makeCollection()])
        .mockResolvedValueOnce([]);
      chain.where
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(chain);

      const res = await app.inject({
        method: 'POST',
        url: `/api/collections/${COL_ID}/products`,
        headers: authHeader(app),
        payload: { productId: PID },
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 409 when the product is already in the collection', async () => {
      // Q1: db.select().from(collections).where(and(...)).limit(1) → [makeCollection()]
      // Q2: db.select().from(products).where(eq(...)).limit(1) → [{id: PID}]
      // Q3: db.select().from(collectionItems).where(and(...)).limit(1) → [{id: 'item-1'}]
      chain.limit
        .mockResolvedValueOnce([makeCollection()])
        .mockResolvedValueOnce([{ id: PID }])
        .mockResolvedValueOnce([{ id: 'item-1' }]);
      chain.where
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(chain);

      const res = await app.inject({
        method: 'POST',
        url: `/api/collections/${COL_ID}/products`,
        headers: authHeader(app),
        payload: { productId: PID },
      });

      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe('CONFLICT');
    });
  });

  // ==================== REMOVE PRODUCT ====================
  describe('DELETE /api/collections/:id/products/:productId', () => {
    it('removes a product from the collection', async () => {
      // Q1: db.select().from(collections).where(and(...)).limit(1) → [makeCollection()]
      // Q2: db.select().from(collectionItems).where(and(...)).limit(1) → [{id: 'item-1'}]
      // Q3: db.delete(collectionItems).where(eq(...))
      chain.limit
        .mockResolvedValueOnce([makeCollection()])
        .mockResolvedValueOnce([{ id: 'item-1' }]);
      chain.where
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(chain);
      const whereMock = vi.fn();
      db.delete.mockReturnValueOnce({ where: whereMock });

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/collections/${COL_ID}/products/${PID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(db.delete).toHaveBeenCalled();
    });

    it('returns 404 when the collection is not owned', async () => {
      chain.limit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/collections/${COL_ID}/products/${PID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 404 when the product is not in the collection', async () => {
      // Q1: db.select().from(collections).where(and(...)).limit(1) → [makeCollection()]
      // Q2: db.select().from(collectionItems).where(and(...)).limit(1) → []
      chain.limit
        .mockResolvedValueOnce([makeCollection()])
        .mockResolvedValueOnce([]);
      chain.where
        .mockReturnValueOnce(chain)
        .mockReturnValueOnce(chain);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/collections/${COL_ID}/products/${PID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
