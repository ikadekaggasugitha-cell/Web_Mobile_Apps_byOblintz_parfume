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
  };

  return { chain, returningResult, db };
});

vi.mock('@/db', () => ({ db }));

import { productRoutes } from '@/modules/product/product.routes';

const ADMIN_TOKEN = (app: FastifyInstance) =>
  app.jwt.sign({ id: 'admin-1', role: 'ADMIN' });

function makeProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prod-1',
    name: 'Amber Noir',
    slug: 'amber-noir',
    description: 'Aroma hangat dan mendalam',
    price: 250000,
    comparePrice: 300000,
    stock: 20,
    images: ['https://cdn/amber.jpg'],
    category: { id: 'cat-1', name: 'Unisex', slug: 'unisex' },
    _count: { reviews: 3 },
    ...overrides,
  };
}

describe('product module (TC-010 – TC-014)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(jwt, { secret: 'test-jwt-secret-min-32-characters!!' });
    await app.register(productRoutes, { prefix: '/api/products' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.resetAllMocks();
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
    chain.from.mockReturnValue(chain);
    chain.where.mockReturnValue(chain);
    chain.orderBy.mockReturnValue(chain);
    chain.limit.mockReturnValue(chain);
    chain.offset.mockReturnValue(chain);
    chain.innerJoin.mockReturnValue(chain);
    chain.leftJoin.mockReturnValue(chain);
    chain.groupBy.mockReturnValue(chain);
  });

  // ==================== TC-010: PRODUCT LIST ====================
  describe('TC-010: GET /api/products', () => {
    it('returns a paginated product list', async () => {
      // Q1: .from().leftJoin().where().orderBy().limit().offset(skip) → where non-term, limit non-term, offset terminal
      // Q2: .from().leftJoin().where() → where terminal
      chain.where
        .mockReturnValueOnce(chain)               // Q1 .where() non-terminal
        .mockResolvedValueOnce([{ total: 1 }]);    // Q2 .where() terminal
      chain.limit
        .mockReturnValueOnce(chain);               // Q1 .limit() non-terminal
      chain.offset
        .mockResolvedValueOnce([makeProduct()]);   // Q1 .offset() terminal
      chain.groupBy
        .mockResolvedValueOnce([]);                // Q3 .groupBy() terminal

      const res = await app.inject({ method: 'GET', url: '/api/products' });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.products).toHaveLength(1);
      expect(data.pagination).toEqual({ page: 1, limit: 12, total: 1, totalPages: 1 });
    });

    it('honours price, occasion and sort query params', async () => {
      // Same chain as list: where non-terminal, limit non-terminal, offset terminal
      chain.where
        .mockReturnValueOnce(chain)
        .mockResolvedValueOnce([{ total: 0 }]);
      chain.limit
        .mockReturnValueOnce(chain);
      chain.offset
        .mockResolvedValueOnce([]);
      chain.groupBy
        .mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/products?minPrice=100000&maxPrice=500000&occasion=daily&sort=price_asc&page=2&limit=6',
      });

      expect(res.statusCode).toBe(200);
      expect(db.select).toHaveBeenCalled();
    });

    // M6: cover every branch of the sort switch
    it.each([
      ['price_desc'],
      ['popular'],
      ['name'],
      ['newest'],
    ])('maps sort=%s to the correct orderBy', async (sort) => {
      chain.where
        .mockReturnValueOnce(chain)
        .mockResolvedValueOnce([{ total: 0 }]);
      chain.limit
        .mockReturnValueOnce(chain);
      chain.offset
        .mockResolvedValueOnce([]);
      chain.groupBy
        .mockResolvedValueOnce([]);

      await app.inject({ method: 'GET', url: `/api/products?sort=${sort}` });

      expect(db.select).toHaveBeenCalled();
    });
  });

  // ==================== TC-011: SEARCH ====================
  describe('TC-011: GET /api/products/search', () => {
    it('returns search results for a query', async () => {
      // Q1: .from().leftJoin().where().orderBy().limit().offset(skip) → where non-term, limit non-term, offset terminal
      // Q2: .from().where(and(...)) → where terminal
      chain.where
        .mockReturnValueOnce(chain)               // Q1 .where() non-terminal
        .mockResolvedValueOnce([{ total: 1 }]);    // Q2 .where() terminal
      chain.limit
        .mockReturnValueOnce(chain);               // Q1 .limit() non-terminal
      chain.offset
        .mockResolvedValueOnce([makeProduct()]);   // Q1 .offset() terminal
      chain.groupBy
        .mockResolvedValueOnce([]);                // Q3 .groupBy() terminal

      const res = await app.inject({
        method: 'GET',
        url: '/api/products/search?q=amber',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.query).toBe('amber');
      expect(res.json().data.products).toHaveLength(1);
    });

    it('returns 400 when the query is empty', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/products/search?q=',
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ==================== TC-012: FILTER BY CATEGORY ====================
  describe('TC-012: GET /api/products?category=', () => {
    it('filters products by category slug', async () => {
      // Same chain as list: where non-terminal, limit non-terminal, offset terminal
      chain.where
        .mockReturnValueOnce(chain)
        .mockResolvedValueOnce([{ total: 1 }]);
      chain.limit
        .mockReturnValueOnce(chain);
      chain.offset
        .mockResolvedValueOnce([makeProduct()]);
      chain.groupBy
        .mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/products?category=unisex',
      });

      expect(res.statusCode).toBe(200);
      expect(db.select).toHaveBeenCalled();
    });
  });

  // ==================== TC-013: PRODUCT DETAIL ====================
  describe('TC-013: GET /api/products/:slug', () => {
    it('loads product detail with aggregated rating', async () => {
      // Q1: .select({...}).from().leftJoin().where().limit(1) → terminal .limit(1)
      // Promise.all([
      //   Q2: .select({...}).from().innerJoin().where().orderBy().limit().offset() → terminal .offset()
      //   Q3: .select({total}).from().where() → terminal .where()
      //   Q4: .select({avg}).from().where() → terminal .where()
      // ])
      // chain.where calls: Q1 non-terminal, Q2 non-terminal, Q3 terminal, Q4 terminal
      chain.where
        .mockReturnValueOnce(chain)                    // Q1 .where() non-terminal
        .mockReturnValueOnce(chain)                    // Q2 .where() non-terminal
        .mockResolvedValueOnce([{ total: 2 }])         // Q3 .where() terminal
        .mockResolvedValueOnce([{ avgRating: 4.5, totalReviews: 2 }]); // Q4 .where() terminal
      // chain.limit calls: Q1 terminal, Q2 non-terminal
      chain.limit
        .mockResolvedValueOnce([makeProduct()])        // Q1 .limit(1) terminal
        .mockReturnValueOnce(chain);                    // Q2 .limit() non-terminal
      chain.offset
        .mockResolvedValueOnce([]);                     // Q2 .offset() terminal

      const res = await app.inject({
        method: 'GET',
        url: '/api/products/amber-noir',
      });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.slug).toBe('amber-noir');
      expect(data.avgRating).toBe(4.5);
      expect(data.reviewPagination.total).toBe(2);
    });

    it('returns 0 rating when there are no reviews', async () => {
      // Q1: .from().leftJoin().where().limit(1) → where non-terminal, limit terminal
      // Q2 (Promise.all): .from().innerJoin().where().orderBy().limit().offset() → where non-terminal, limit non-terminal, offset terminal
      // Q3 (Promise.all): .from().where() → where terminal
      // Q4 (Promise.all): .from().where() → where terminal
      chain.where
        .mockReturnValueOnce(chain)                    // Q1 .where() non-terminal
        .mockReturnValueOnce(chain)                    // Q2 .where() non-terminal
        .mockResolvedValueOnce([{ total: 0 }])         // Q3 .where() terminal
        .mockResolvedValueOnce([{ avgRating: null, totalReviews: 0 }]); // Q4 .where() terminal
      chain.limit
        .mockResolvedValueOnce([makeProduct()])        // Q1 .limit(1) terminal
        .mockReturnValueOnce(chain);                    // Q2 .limit() non-terminal
      chain.offset
        .mockResolvedValueOnce([]);                     // Q2 .offset() terminal

      const res = await app.inject({
        method: 'GET',
        url: '/api/products/amber-noir',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.avgRating).toBe(0);
    });

    it('returns 404 for an unknown slug', async () => {
      // Q1: .from().leftJoin().where().limit(1) → where non-terminal, limit terminal
      chain.where
        .mockReturnValueOnce(chain);                // Q1 .where() non-terminal
      chain.limit
        .mockResolvedValueOnce([]);                  // Q1 .limit(1) terminal

      const res = await app.inject({
        method: 'GET',
        url: '/api/products/does-not-exist',
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('NOT_FOUND');
    });
  });

  // ==================== TC-014: RELATED PRODUCTS ====================
  describe('TC-014: GET /api/products/:slug/related', () => {
    it('returns related products in the same category', async () => {
      // Q1: .from().where().limit(1) → where non-terminal, limit terminal
      // Q2: .from().leftJoin().where().orderBy().limit(5) → where non-terminal, limit terminal
      // Q3 (conditional): .from().groupBy() → groupBy terminal (if relatedIds.length > 0)
      chain.where
        .mockReturnValueOnce(chain)                                              // Q1 .where() non-terminal
        .mockReturnValueOnce(chain);                                             // Q2 .where() non-terminal
      chain.limit
        .mockResolvedValueOnce([{ categoryId: 'cat-1', notes: null, occasions: [] }])  // Q1 .limit(1) terminal
        .mockResolvedValueOnce([makeProduct({ id: 'prod-2', slug: 'other' })]);         // Q2 .limit(5) terminal
      chain.groupBy
        .mockResolvedValueOnce([]);                                              // Q3 .groupBy() terminal

      const res = await app.inject({
        method: 'GET',
        url: '/api/products/amber-noir/related',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toHaveLength(1);
    });

    it('returns 404 when the base product is missing', async () => {
      // Q1: .from().where().limit(1) → where non-terminal, limit terminal
      chain.where
        .mockReturnValueOnce(chain);                // Q1 .where() non-terminal
      chain.limit
        .mockResolvedValueOnce([]);                  // Q1 .limit(1) terminal

      const res = await app.inject({
        method: 'GET',
        url: '/api/products/ghost/related',
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== ADMIN CRUD ====================
  describe('admin product management', () => {
    it('rejects admin list for non-admin users (403)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/products/admin/all',
        headers: { authorization: `Bearer ${app.jwt.sign({ id: 'user-1' })}` },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe('FORBIDDEN');
    });

    it('lists all products for an admin', async () => {
      // Q1: .from().leftJoin().where().orderBy().limit().offset() → where non-terminal, limit non-terminal, offset terminal
      // Q2: .from().leftJoin().where() → where terminal
      // Q3 (conditional): .from().groupBy() → groupBy terminal (reviewCounts)
      // Q4 (conditional): .from().groupBy() → groupBy terminal (orderItemCounts)
      chain.where
        .mockReturnValueOnce(chain)                // Q1 .where() non-terminal
        .mockResolvedValueOnce([{ total: 1 }]);     // Q2 .where() terminal
      chain.limit
        .mockReturnValueOnce(chain);                // Q1 .limit() non-terminal
      chain.offset
        .mockResolvedValueOnce([makeProduct()]);    // Q1 .offset() terminal
      chain.groupBy
        .mockResolvedValueOnce([])                  // Q3 .groupBy() terminal
        .mockResolvedValueOnce([]);                 // Q4 .groupBy() terminal

      const res = await app.inject({
        method: 'GET',
        url: '/api/products/admin/all?status=ACTIVE&search=amber',
        headers: { authorization: `Bearer ${ADMIN_TOKEN(app)}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.products).toHaveLength(1);
    });

    it('creates a product and generates a slug', async () => {
      // Q1: .from().where().limit(1) → where non-terminal, limit terminal
      // Q2 (insert): .returning() → returningResult terminal
      // Q3 (conditional): .from().where().limit(1) → where non-terminal, limit terminal
      chain.where
        .mockReturnValueOnce(chain)                // Q1 .where() non-terminal
        .mockReturnValueOnce(chain);               // Q3 .where() non-terminal
      chain.limit
        .mockResolvedValueOnce([])                 // Q1 .limit(1) terminal (no existing)
        .mockResolvedValueOnce([{ id: 'cat-1', name: 'Unisex', slug: 'unisex' }]); // Q3 .limit(1) terminal
      returningResult.mockResolvedValueOnce([makeProduct()]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/products/admin',
        headers: { authorization: `Bearer ${ADMIN_TOKEN(app)}` },
        payload: { name: 'Amber Noir', price: 250000 },
      });

      expect(res.statusCode).toBe(201);
      expect(db.insert).toHaveBeenCalled();
    });

    it('returns 400 VALIDATION_ERROR when required fields are missing (H3)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/products/admin',
        headers: { authorization: `Bearer ${ADMIN_TOKEN(app)}` },
        payload: { description: 'no name or price' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 409 CONFLICT when the generated slug already exists (H3)', async () => {
      // Q1: .select().from(products).where(eq(products.slug, slug)).limit(1) → terminal .limit(1)
      chain.limit.mockResolvedValueOnce([makeProduct()]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/products/admin',
        headers: { authorization: `Bearer ${ADMIN_TOKEN(app)}` },
        payload: { name: 'Amber Noir', price: 250000 },
      });

      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe('CONFLICT');
    });

    it('updates an existing product', async () => {
      // Q1: .from().where().limit(1) → where non-terminal, limit terminal
      // Q2 (update): .returning() → returningResult terminal
      // Q3 (conditional): .from().where().limit(1) → where non-terminal, limit terminal
      chain.where
        .mockReturnValueOnce(chain)                // Q1 .where() non-terminal
        .mockReturnValueOnce(chain);               // Q3 .where() non-terminal
      chain.limit
        .mockResolvedValueOnce([makeProduct()])    // Q1 .limit(1) terminal
        .mockResolvedValueOnce([{ id: 'cat-1', name: 'Unisex', slug: 'unisex' }]); // Q3 .limit(1) terminal
      returningResult.mockResolvedValueOnce([makeProduct({ price: 275000 })]);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/products/admin/prod-1',
        headers: { authorization: `Bearer ${ADMIN_TOKEN(app)}` },
        payload: { price: 275000 },
      });

      expect(res.statusCode).toBe(200);
      expect(db.update).toHaveBeenCalled();
    });

    it('updates every mutable field (M6 branch coverage)', async () => {
      // Same chain pattern as "updates an existing product"
      chain.where
        .mockReturnValueOnce(chain)                // Q1 .where() non-terminal
        .mockReturnValueOnce(chain);               // Q3 .where() non-terminal
      chain.limit
        .mockResolvedValueOnce([makeProduct()])    // Q1 .limit(1) terminal
        .mockResolvedValueOnce([{ id: 'cat-1', name: 'Unisex', slug: 'unisex' }]); // Q3 .limit(1) terminal
      returningResult.mockResolvedValueOnce([makeProduct()]);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/products/admin/prod-1',
        headers: { authorization: `Bearer ${ADMIN_TOKEN(app)}` },
        payload: {
          name: 'Amber Deluxe',
          description: 'Deskripsi baru',
          price: 300000,
          comparePrice: 350000,
          stock: 15,
          sku: 'SKU-123',
          weight: 120,
          categoryId: '22222222-2222-2222-2222-222222222222',
          notes: ['amber', 'musk'],
          occasions: ['formal'],
          status: 'ACTIVE',
          images: ['https://cdn/x.jpg'],
          metaTitle: 'Amber Deluxe',
          metaDesc: 'Parfum amber mewah',
        },
      });

      expect(res.statusCode).toBe(200);
    });

    it('returns 404 when updating a missing product', async () => {
      // Q1: .from().where().limit(1) → where non-terminal, limit terminal
      chain.where
        .mockReturnValueOnce(chain);
      chain.limit
        .mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/products/admin/ghost',
        headers: { authorization: `Bearer ${ADMIN_TOKEN(app)}` },
        payload: { price: 1 },
      });

      expect(res.statusCode).toBe(404);
    });

    it('soft-deletes a product (ARCHIVED)', async () => {
      // Q1: .from().where().limit(1) → where non-terminal, limit terminal
      chain.where
        .mockReturnValueOnce(chain);               // Q1 .where() non-terminal
      chain.limit
        .mockResolvedValueOnce([makeProduct()]);    // Q1 .limit(1) terminal
      db.update.mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/products/admin/prod-1',
        headers: { authorization: `Bearer ${ADMIN_TOKEN(app)}` },
      });

      expect(res.statusCode).toBe(200);
      expect(db.update).toHaveBeenCalled();
    });
  });
});
