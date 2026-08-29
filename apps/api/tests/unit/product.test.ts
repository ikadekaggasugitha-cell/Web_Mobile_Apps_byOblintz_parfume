import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';

const prisma = vi.hoisted(() => ({
  product: {
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  review: {
    findMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  },
}));

vi.mock('@/config/database', () => ({ default: prisma, prisma }));

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
    vi.clearAllMocks();
  });

  // ==================== TC-010: PRODUCT LIST ====================
  describe('TC-010: GET /api/products', () => {
    it('returns a paginated product list', async () => {
      prisma.product.findMany.mockResolvedValue([makeProduct()]);
      prisma.product.count.mockResolvedValue(1);

      const res = await app.inject({ method: 'GET', url: '/api/products' });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.products).toHaveLength(1);
      expect(data.pagination).toEqual({ page: 1, limit: 12, total: 1, totalPages: 1 });
    });

    it('honours price, occasion and sort query params', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      const res = await app.inject({
        method: 'GET',
        url: '/api/products?minPrice=100000&maxPrice=500000&occasion=daily&sort=price_asc&page=2&limit=6',
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
            price: { gte: 100000, lte: 500000 },
            occasions: { has: 'daily' },
          }),
          orderBy: { price: 'asc' },
          skip: 6,
          take: 6,
        })
      );
    });
  });

  // ==================== TC-011: SEARCH ====================
  describe('TC-011: GET /api/products/search', () => {
    it('returns search results for a query', async () => {
      prisma.product.findMany.mockResolvedValue([makeProduct()]);
      prisma.product.count.mockResolvedValue(1);

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
      prisma.product.findMany.mockResolvedValue([makeProduct()]);
      prisma.product.count.mockResolvedValue(1);

      const res = await app.inject({
        method: 'GET',
        url: '/api/products?category=unisex',
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: { slug: 'unisex' } }),
        })
      );
    });
  });

  // ==================== TC-013: PRODUCT DETAIL ====================
  describe('TC-013: GET /api/products/:slug', () => {
    it('loads product detail with aggregated rating', async () => {
      prisma.product.findUnique.mockResolvedValue(makeProduct());
      prisma.review.findMany.mockResolvedValue([]);
      prisma.review.count.mockResolvedValue(2);
      prisma.review.aggregate.mockResolvedValue({
        _avg: { rating: 4.5 },
        _count: { rating: 2 },
      });

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
      prisma.product.findUnique.mockResolvedValue(makeProduct());
      prisma.review.findMany.mockResolvedValue([]);
      prisma.review.count.mockResolvedValue(0);
      prisma.review.aggregate.mockResolvedValue({
        _avg: { rating: null },
        _count: { rating: 0 },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/products/amber-noir',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.avgRating).toBe(0);
    });

    it('returns 404 for an unknown slug', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

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
      prisma.product.findUnique.mockResolvedValue({
        categoryId: 'cat-1',
        notes: null,
        occasions: [],
      });
      prisma.product.findMany.mockResolvedValue([makeProduct({ id: 'prod-2', slug: 'other' })]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/products/amber-noir/related',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toHaveLength(1);
    });

    it('returns 404 when the base product is missing', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

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
      prisma.product.findMany.mockResolvedValue([makeProduct()]);
      prisma.product.count.mockResolvedValue(1);

      const res = await app.inject({
        method: 'GET',
        url: '/api/products/admin/all?status=ACTIVE&search=amber',
        headers: { authorization: `Bearer ${ADMIN_TOKEN(app)}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.products).toHaveLength(1);
    });

    it('creates a product and generates a slug', async () => {
      prisma.product.create.mockResolvedValue(makeProduct());

      const res = await app.inject({
        method: 'POST',
        url: '/api/products/admin',
        headers: { authorization: `Bearer ${ADMIN_TOKEN(app)}` },
        payload: { name: 'Amber Noir', price: 250000 },
      });

      expect(res.statusCode).toBe(201);
      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Amber Noir', slug: 'amber-noir' }),
        })
      );
    });

    it('updates an existing product', async () => {
      prisma.product.findUnique.mockResolvedValue(makeProduct());
      prisma.product.update.mockResolvedValue(makeProduct({ price: 275000 }));

      const res = await app.inject({
        method: 'PUT',
        url: '/api/products/admin/prod-1',
        headers: { authorization: `Bearer ${ADMIN_TOKEN(app)}` },
        payload: { price: 275000 },
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.product.update).toHaveBeenCalled();
    });

    it('returns 404 when updating a missing product', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/products/admin/ghost',
        headers: { authorization: `Bearer ${ADMIN_TOKEN(app)}` },
        payload: { price: 1 },
      });

      expect(res.statusCode).toBe(404);
    });

    it('soft-deletes a product (ARCHIVED)', async () => {
      prisma.product.findUnique.mockResolvedValue(makeProduct());
      prisma.product.update.mockResolvedValue(makeProduct({ status: 'ARCHIVED' }));

      const res = await app.inject({
        method: 'DELETE',
        url: '/api/products/admin/prod-1',
        headers: { authorization: `Bearer ${ADMIN_TOKEN(app)}` },
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { status: 'ARCHIVED' },
      });
    });
  });
});
