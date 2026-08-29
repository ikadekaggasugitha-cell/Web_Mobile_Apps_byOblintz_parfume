import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';

const prisma = vi.hoisted(() => ({
  category: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  product: { count: vi.fn() },
}));

vi.mock('@/config/database', () => ({ default: prisma, prisma }));

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
    _count: { products: 0 },
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
    vi.clearAllMocks();
  });

  // ==================== LIST (TREE) ====================
  describe('GET /api/categories', () => {
    it('returns only root categories', async () => {
      prisma.category.findMany.mockResolvedValue([
        makeCategory({ id: 'root-1', parentId: null }),
        makeCategory({ id: 'child-1', parentId: 'root-1' }),
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
      prisma.category.findUnique.mockResolvedValue(makeCategory({ products: [] }));
      prisma.product.count.mockResolvedValue(5);

      const res = await app.inject({ method: 'GET', url: '/api/categories/pria?page=1&limit=12' });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.slug).toBe('pria');
      expect(data.pagination).toEqual({ page: 1, limit: 12, total: 5, totalPages: 1 });
    });

    it('returns 404 for an unknown slug', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

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
      prisma.category.findMany.mockResolvedValue([makeCategory()]);

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
      prisma.category.findUnique.mockResolvedValue(null);
      prisma.category.create.mockResolvedValue(makeCategory({ name: 'Unisex Segar', slug: 'unisex-segar' }));

      const res = await app.inject({
        method: 'POST',
        url: '/api/categories/admin',
        headers: adminHeader(app),
        payload: { name: 'Unisex Segar' },
      });

      expect(res.statusCode).toBe(201);
      expect(prisma.category.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ slug: 'unisex-segar' }) })
      );
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
      prisma.category.findUnique.mockResolvedValue(makeCategory());

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
      prisma.category.findUnique.mockResolvedValue(makeCategory());
      prisma.category.update.mockResolvedValue(makeCategory({ name: 'Pria Elegan' }));

      const res = await app.inject({
        method: 'PUT',
        url: `/api/categories/admin/${CAT_ID}`,
        headers: adminHeader(app),
        payload: { name: 'Pria Elegan', sortOrder: 2 },
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.category.update).toHaveBeenCalled();
    });

    it('returns 404 when the category is missing', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/categories/admin/${CAT_ID}`,
        headers: adminHeader(app),
        payload: { name: 'X' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 400 when setting itself as its own parent', async () => {
      prisma.category.findUnique.mockResolvedValue(makeCategory());

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
      prisma.category.findUnique.mockResolvedValue(makeCategory({ _count: { products: 0 } }));
      prisma.category.delete.mockResolvedValue(makeCategory());

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/categories/admin/${CAT_ID}`,
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: CAT_ID } });
    });

    it('returns 404 when the category is missing', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/categories/admin/${CAT_ID}`,
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 400 HAS_PRODUCTS when the category still has products', async () => {
      prisma.category.findUnique.mockResolvedValue(makeCategory({ _count: { products: 3 } }));

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/categories/admin/${CAT_ID}`,
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('HAS_PRODUCTS');
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });
  });
});
