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

import { categoryRoutes } from '@/modules/category/category.routes';

const CAT_ID = 'cat-1';

function userHeader(app: FastifyInstance) {
  return { authorization: `Bearer ${app.jwt.sign({ id: 'user-1' })}` };
}
function adminHeader(app: FastifyInstance) {
  return { authorization: `Bearer ${app.jwt.sign({ id: 'admin-1', role: 'ADMIN' })}` };
}

function makeCategory(overrides: Record<string, unknown> = {}) {
  return {
    id: CAT_ID,
    name: 'Pria',
    slug: 'pria',
    parentId: null,
    sortOrder: 0,
    ...overrides,
  };
}

describe('category module', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(jwt, { secret: 'test-jwt-secret-min-32-characters!!' });
    await app.register(categoryRoutes, { prefix: '/api/categories' });
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

  // ==================== LIST (TREE) ====================
  describe('GET /api/categories', () => {
    it('returns only root categories', async () => {
      // Q1: .select({...}).from(categories).orderBy(asc(categories.sortOrder)) → terminal .orderBy()
      // Q2: .select({...}).from(products).groupBy(products.categoryId) → terminal .groupBy()
      chain.orderBy.mockResolvedValueOnce([
        makeCategory({ id: 'root-1', parentId: null }),
        makeCategory({ id: 'child-1', parentId: 'root-1' }),
      ]);
      chain.groupBy.mockResolvedValueOnce([
        { categoryId: 'root-1', count: 2 },
        { categoryId: 'child-1', count: 1 },
      ]);

      const res = await app.inject({ method: 'GET', url: '/api/categories' });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe('root-1');
    });
  });

  // ==================== DETAIL BY SLUG ====================
  describe('GET /api/categories/:slug', () => {
    it('returns the category with paginated products', async () => {
      // Q1: .from().where().limit(1) → where non-terminal, limit terminal
      // Q2: .from().where().orderBy().limit().offset(skip) → where non-term, limit non-term, offset terminal
      // Q3: SKIPPED (productIds.length === 0 since Q2 returns [])
      // Q4: .from().where() → where terminal
      // Q5: .from().where().groupBy() → where non-terminal, groupBy terminal
      // Q6: .from().where() → where terminal
      // chain.where: Q1 non-term, Q2 non-term, Q4 terminal, Q5 non-term, Q6 terminal
      chain.where
        .mockReturnValueOnce(chain)                       // Q1 .where() non-terminal
        .mockReturnValueOnce(chain)                       // Q2 .where() non-terminal
        .mockResolvedValueOnce([])                        // Q4 .where() terminal
        .mockReturnValueOnce(chain)                       // Q5 .where() non-terminal
        .mockResolvedValueOnce([{ total: 5 }]);           // Q6 .where() terminal
      // chain.limit: Q1 terminal, Q2 non-terminal
      chain.limit
        .mockResolvedValueOnce([{ id: CAT_ID, name: 'Pria', slug: 'pria', parentId: null, sortOrder: 0 }])  // Q1 terminal
        .mockReturnValueOnce(chain);                       // Q2 .limit() non-terminal
      chain.orderBy
        .mockReturnValueOnce(chain);                       // Q2 .orderBy() non-terminal
      chain.offset
        .mockResolvedValueOnce([]);                        // Q2 .offset() terminal
      // chain.groupBy: Q5 terminal (Q3 skipped)
      chain.groupBy
        .mockResolvedValueOnce([]);                        // Q5 .groupBy() terminal

      const res = await app.inject({ method: 'GET', url: '/api/categories/pria?page=1&limit=12' });

      if (res.statusCode !== 200) console.log('CATEGORY DETAIL FAIL:', JSON.stringify(res.json()));
      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.slug).toBe('pria');
      expect(data.pagination).toEqual({ page: 1, limit: 12, total: 5, totalPages: 1 });
    });

    it('returns 404 for an unknown slug', async () => {
      // Q1: .from().where().limit(1) → where non-terminal, limit terminal
      chain.where
        .mockReturnValueOnce(chain);                       // Q1 .where() non-terminal
      chain.limit
        .mockResolvedValueOnce([]);                        // Q1 .limit(1) terminal

      const res = await app.inject({ method: 'GET', url: '/api/categories/ghost' });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('NOT_FOUND');
    });
  });

  // ==================== ADMIN LIST ====================
  describe('GET /api/categories/admin/all', () => {
    it('rejects non-admin users (403)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/categories/admin/all',
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(403);
    });

    it('lists all categories for an admin', async () => {
      // Q1: .select().from(categories).orderBy(asc(categories.sortOrder)) → terminal .orderBy()
      // Q2: .select({...}).from(products).groupBy(products.categoryId) → terminal .groupBy()
      chain.orderBy.mockResolvedValueOnce([makeCategory()]);
      chain.groupBy.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/categories/admin/all',
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toHaveLength(1);
    });
  });

  // ==================== ADMIN CREATE ====================
  describe('POST /api/categories/admin', () => {
    it('creates a category and generates a slug', async () => {
      // Q1: .from().where().limit(1) → where non-terminal, limit terminal
      // Q2: .insert().values().returning() → returningResult terminal
      chain.where
        .mockReturnValueOnce(chain);                       // Q1 .where() non-terminal
      chain.limit
        .mockResolvedValueOnce([]);                        // Q1 .limit(1) terminal
      returningResult.mockResolvedValueOnce([makeCategory({ name: 'Unisex Segar', slug: 'unisex-segar' })]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/categories/admin',
        headers: adminHeader(app),
        payload: { name: 'Unisex Segar' },
      });

      expect(res.statusCode).toBe(201);
      expect(db.insert).toHaveBeenCalled();
    });

    it('returns 400 when the name is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/categories/admin',
        headers: adminHeader(app),
        payload: {},
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 409 when the slug already exists', async () => {
      // Q1: .from().where().limit(1) → where non-terminal, limit terminal
      chain.where
        .mockReturnValueOnce(chain);                       // Q1 .where() non-terminal
      chain.limit
        .mockResolvedValueOnce([makeCategory()]);          // Q1 .limit(1) terminal

      const res = await app.inject({
        method: 'POST',
        url: '/api/categories/admin',
        headers: adminHeader(app),
        payload: { name: 'Pria' },
      });

      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe('CONFLICT');
    });
  });

  // ==================== ADMIN UPDATE ====================
  describe('PUT /api/categories/admin/:id', () => {
    it('updates an existing category', async () => {
      // Q1: .from().where().limit(1) → where non-terminal, limit terminal
      // Q2: .update().set().where().returning() → returningResult terminal
      chain.where
        .mockReturnValueOnce(chain);                       // Q1 .where() non-terminal
      chain.limit
        .mockResolvedValueOnce([makeCategory()]);          // Q1 .limit(1) terminal
      returningResult.mockResolvedValueOnce([makeCategory({ name: 'Pria Elegan' })]);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/categories/admin/${CAT_ID}`,
        headers: adminHeader(app),
        payload: { name: 'Pria Elegan', sortOrder: 2 },
      });

      expect(res.statusCode).toBe(200);
      expect(db.update).toHaveBeenCalled();
    });

    it('returns 404 when the category is missing', async () => {
      // Q1: .from().where().limit(1) → where non-terminal, limit terminal
      chain.where
        .mockReturnValueOnce(chain);                       // Q1 .where() non-terminal
      chain.limit
        .mockResolvedValueOnce([]);                        // Q1 .limit(1) terminal

      const res = await app.inject({
        method: 'PUT',
        url: `/api/categories/admin/${CAT_ID}`,
        headers: adminHeader(app),
        payload: { name: 'X' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 400 when setting itself as its own parent', async () => {
      // Q1: .from().where().limit(1) → where non-terminal, limit terminal
      chain.where
        .mockReturnValueOnce(chain);                       // Q1 .where() non-terminal
      chain.limit
        .mockResolvedValueOnce([makeCategory()]);          // Q1 .limit(1) terminal

      const res = await app.inject({
        method: 'PUT',
        url: `/api/categories/admin/${CAT_ID}`,
        headers: adminHeader(app),
        payload: { parentId: CAT_ID },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ==================== ADMIN DELETE ====================
  describe('DELETE /api/categories/admin/:id', () => {
    it('deletes an empty category', async () => {
      // Q1: .from().where().limit(1) → where non-terminal, limit terminal
      // Q2: .from().where() → where terminal
      // Q3: db.delete().where() → db.delete terminal
      chain.where
        .mockReturnValueOnce(chain)                        // Q1 .where() non-terminal
        .mockResolvedValueOnce([{ productCount: 0 }]);     // Q2 .where() terminal
      chain.limit
        .mockResolvedValueOnce([makeCategory()]);          // Q1 .limit(1) terminal
      db.delete.mockReturnValueOnce({ where: vi.fn() });

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/categories/admin/${CAT_ID}`,
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(db.delete).toHaveBeenCalled();
    });

    it('returns 404 when the category is missing', async () => {
      // Q1: .from().where().limit(1) → where non-terminal, limit terminal
      chain.where
        .mockReturnValueOnce(chain);                       // Q1 .where() non-terminal
      chain.limit
        .mockResolvedValueOnce([]);                        // Q1 .limit(1) terminal

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/categories/admin/${CAT_ID}`,
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 400 HAS_PRODUCTS when the category still has products', async () => {
      // Q1: .from().where().limit(1) → where non-terminal, limit terminal
      // Q2: .from().where() → where terminal
      chain.where
        .mockReturnValueOnce(chain)                        // Q1 .where() non-terminal
        .mockResolvedValueOnce([{ productCount: 3 }]);     // Q2 .where() terminal
      chain.limit
        .mockResolvedValueOnce([makeCategory()]);          // Q1 .limit(1) terminal

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/categories/admin/${CAT_ID}`,
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('HAS_PRODUCTS');
      expect(db.delete).not.toHaveBeenCalled();
    });
  });
});
