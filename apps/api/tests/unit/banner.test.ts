import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';

const prisma = vi.hoisted(() => ({
  banner: {
    findMany: vi.fn(),
    aggregate: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock('@/config/database', () => ({ default: prisma, prisma }));

import { bannerRoutes } from '@/modules/banner/banner.routes';

const BANNER_ID = 'banner-1';

function userHeader(app: FastifyInstance) {
  return { authorization: `Bearer ${app.jwt.sign({ id: 'user-1' })}` };
}
function adminHeader(app: FastifyInstance) {
  return { authorization: `Bearer ${app.jwt.sign({ id: 'admin-1', role: 'ADMIN' })}` };
}

function makeBanner(overrides: Record<string, unknown> = {}) {
  return {
    id: BANNER_ID,
    title: 'Promo Lebaran',
    subtitle: 'Diskon spesial',
    imageUrl: 'https://cdn.example.com/banner.jpg',
    link: 'https://example.com/promo',
    position: 'home',
    sortOrder: 1,
    isActive: true,
    ...overrides,
  };
}

const validBody = {
  title: 'Promo Lebaran',
  imageUrl: 'https://cdn.example.com/banner.jpg',
};

describe('banner module', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(jwt, { secret: 'test-jwt-secret-min-32-characters!!' });
    await app.register(bannerRoutes, { prefix: '/api/banners' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockResolvedValue([]);
  });

  // ==================== PUBLIC LIST ====================
  describe('GET /api/banners', () => {
    it('lists active banners', async () => {
      prisma.banner.findMany.mockResolvedValue([makeBanner()]);

      const res = await app.inject({ method: 'GET', url: '/api/banners' });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toHaveLength(1);
      expect(prisma.banner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } })
      );
    });
  });

  // ==================== ADMIN LIST ====================
  describe('GET /api/banners/admin/all', () => {
    it('rejects non-admin users (403)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/banners/admin/all',
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(403);
    });

    it('lists all banners for an admin', async () => {
      prisma.banner.findMany.mockResolvedValue([makeBanner({ isActive: false })]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/banners/admin/all',
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toHaveLength(1);
    });
  });

  // ==================== ADMIN CREATE ====================
  describe('POST /api/banners/admin', () => {
    it('creates a banner with auto sort order', async () => {
      prisma.banner.aggregate.mockResolvedValue({ _max: { sortOrder: 4 } });
      prisma.banner.create.mockResolvedValue(makeBanner({ sortOrder: 5 }));

      const res = await app.inject({
        method: 'POST',
        url: '/api/banners/admin',
        headers: adminHeader(app),
        payload: validBody,
      });

      expect(res.statusCode).toBe(201);
      expect(prisma.banner.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ sortOrder: 5 }) })
      );
    });

    it('returns 400 VALIDATION_ERROR for an invalid image URL', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/banners/admin',
        headers: adminHeader(app),
        payload: { title: 'X', imageUrl: 'not-a-url' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ==================== ADMIN UPDATE ====================
  describe('PUT /api/banners/admin/:id', () => {
    it('updates an existing banner', async () => {
      prisma.banner.findUnique.mockResolvedValue(makeBanner());
      prisma.banner.update.mockResolvedValue(makeBanner({ title: 'Promo Baru' }));

      const res = await app.inject({
        method: 'PUT',
        url: `/api/banners/admin/${BANNER_ID}`,
        headers: adminHeader(app),
        payload: { title: 'Promo Baru', isActive: false },
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.banner.update).toHaveBeenCalled();
    });

    it('returns 404 when the banner is missing', async () => {
      prisma.banner.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/banners/admin/${BANNER_ID}`,
        headers: adminHeader(app),
        payload: { title: 'X' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 400 VALIDATION_ERROR for an invalid update', async () => {
      prisma.banner.findUnique.mockResolvedValue(makeBanner());

      const res = await app.inject({
        method: 'PUT',
        url: `/api/banners/admin/${BANNER_ID}`,
        headers: adminHeader(app),
        payload: { imageUrl: 'not-a-url' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ==================== ADMIN DELETE ====================
  describe('DELETE /api/banners/admin/:id', () => {
    it('deletes a banner', async () => {
      prisma.banner.findUnique.mockResolvedValue(makeBanner());
      prisma.banner.delete.mockResolvedValue(makeBanner());

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/banners/admin/${BANNER_ID}`,
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.banner.delete).toHaveBeenCalledWith({ where: { id: BANNER_ID } });
    });

    it('returns 404 when the banner is missing', async () => {
      prisma.banner.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/banners/admin/${BANNER_ID}`,
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== ADMIN REORDER ====================
  describe('PUT /api/banners/admin/reorder', () => {
    it('reorders banners by id list', async () => {
      prisma.banner.update.mockResolvedValue(makeBanner());

      const res = await app.inject({
        method: 'PUT',
        url: '/api/banners/admin/reorder',
        headers: adminHeader(app),
        payload: { ids: ['b1', 'b2', 'b3'] },
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.banner.update).toHaveBeenCalledTimes(3);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('returns 400 when ids is not an array', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/banners/admin/reorder',
        headers: adminHeader(app),
        payload: { ids: 'nope' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });
  });
});
