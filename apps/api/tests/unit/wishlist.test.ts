import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';

const prisma = vi.hoisted(() => ({
  wishlist: {
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  product: { findUnique: vi.fn() },
}));

vi.mock('@/config/database', () => ({ default: prisma, prisma }));

import { wishlistRoutes } from '@/modules/wishlist/wishlist.routes';

const USER_ID = 'user-1';
const PID = '11111111-1111-1111-1111-111111111111';

function authHeader(app: FastifyInstance) {
  return { authorization: `Bearer ${app.jwt.sign({ id: USER_ID })}` };
}

const wishlistKey = { userId_productId: { userId: USER_ID, productId: PID } };

function makeEntry() {
  return { id: 'wl-1', userId: USER_ID, productId: PID };
}

describe('wishlist module', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(jwt, { secret: 'test-jwt-secret-min-32-characters!!' });
    await app.register(wishlistRoutes, { prefix: '/api/wishlist' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== GET WISHLIST ====================
  describe('GET /api/wishlist', () => {
    it('lists the user wishlist with pagination', async () => {
      prisma.wishlist.findMany.mockResolvedValue([makeEntry()]);
      prisma.wishlist.count.mockResolvedValue(1);

      const res = await app.inject({ method: 'GET', url: '/api/wishlist', headers: authHeader(app) });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.items).toHaveLength(1);
      expect(data.pagination).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    });

    it('returns 401 without a token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/wishlist' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== ADD ====================
  describe('POST /api/wishlist/:productId', () => {
    it('adds a product to the wishlist', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: PID, status: 'ACTIVE' });
      prisma.wishlist.findUnique.mockResolvedValue(null);
      prisma.wishlist.create.mockResolvedValue(makeEntry());

      const res = await app.inject({
        method: 'POST',
        url: `/api/wishlist/${PID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(201);
      expect(prisma.wishlist.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: USER_ID, productId: PID }) })
      );
    });

    it('returns 404 when the product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'POST',
        url: `/api/wishlist/${PID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('NOT_FOUND');
    });

    it('returns 409 when the product is already wishlisted', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: PID, status: 'ACTIVE' });
      prisma.wishlist.findUnique.mockResolvedValue(makeEntry());

      const res = await app.inject({
        method: 'POST',
        url: `/api/wishlist/${PID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe('ALREADY_WISHLISTED');
    });
  });

  // ==================== REMOVE ====================
  describe('DELETE /api/wishlist/:productId', () => {
    it('removes an existing wishlist entry', async () => {
      prisma.wishlist.findUnique.mockResolvedValue(makeEntry());
      prisma.wishlist.delete.mockResolvedValue(makeEntry());

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/wishlist/${PID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.wishlist.delete).toHaveBeenCalledWith({ where: wishlistKey });
    });

    it('returns 404 when the entry is not present', async () => {
      prisma.wishlist.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/wishlist/${PID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== CHECK ====================
  describe('GET /api/wishlist/check/:productId', () => {
    it('reports true when the product is wishlisted', async () => {
      prisma.wishlist.findUnique.mockResolvedValue(makeEntry());

      const res = await app.inject({
        method: 'GET',
        url: `/api/wishlist/check/${PID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.isWishlisted).toBe(true);
    });

    it('reports false when the product is not wishlisted', async () => {
      prisma.wishlist.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: `/api/wishlist/check/${PID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.isWishlisted).toBe(false);
    });
  });

  // ==================== TOGGLE ====================
  describe('POST /api/wishlist/toggle/:productId', () => {
    it('adds the product when it is not yet wishlisted (201)', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: PID, status: 'ACTIVE' });
      prisma.wishlist.findUnique.mockResolvedValue(null);
      prisma.wishlist.create.mockResolvedValue(makeEntry());

      const res = await app.inject({
        method: 'POST',
        url: `/api/wishlist/toggle/${PID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().data.isWishlisted).toBe(true);
      expect(prisma.wishlist.create).toHaveBeenCalled();
    });

    it('removes the product when it is already wishlisted (200)', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: PID, status: 'ACTIVE' });
      prisma.wishlist.findUnique.mockResolvedValue(makeEntry());
      prisma.wishlist.delete.mockResolvedValue(makeEntry());

      const res = await app.inject({
        method: 'POST',
        url: `/api/wishlist/toggle/${PID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.isWishlisted).toBe(false);
      expect(prisma.wishlist.delete).toHaveBeenCalled();
    });

    it('returns 404 when toggling a non-existent product', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'POST',
        url: `/api/wishlist/toggle/${PID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
