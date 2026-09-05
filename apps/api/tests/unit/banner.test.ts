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
    chain.from.mockReturnValue(chain);
    chain.where.mockReturnValue(chain);
    chain.orderBy.mockReturnValue(chain);
    chain.limit.mockReturnValue(chain);
    chain.offset.mockReturnValue(chain);
    chain.innerJoin.mockReturnValue(chain);
    chain.leftJoin.mockReturnValue(chain);
    chain.groupBy.mockReturnValue(chain);
  });

  // ==================== PUBLIC LIST ====================
  describe('GET /api/banners', () => {
    it('lists active banners', async () => {
      // Route: .select({...}).from(banners).where(...).orderBy(asc(banners.sortOrder)) → terminal .orderBy()
      chain.orderBy.mockResolvedValueOnce([makeBanner()]);

      const res = await app.inject({ method: 'GET', url: '/api/banners' });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toHaveLength(1);
      expect(db.select).toHaveBeenCalled();
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
      // Route: .select().from(banners).orderBy(asc(banners.sortOrder)) → terminal .orderBy()
      chain.orderBy.mockResolvedValueOnce([makeBanner({ isActive: false })]);

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
      // Q1: .select({maxSort: sql`...`}).from(banners) → terminal .from()
      chain.from.mockResolvedValueOnce([{ maxSort: 4 }]);
      returningResult.mockResolvedValueOnce([makeBanner({ sortOrder: 5 })]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/banners/admin',
        headers: adminHeader(app),
        payload: validBody,
      });

      expect(res.statusCode).toBe(201);
      expect(db.insert).toHaveBeenCalled();
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
      // Q1: .select().from(banners).where(...).limit(1) → terminal .limit()
      chain.limit.mockResolvedValueOnce([makeBanner()]);
      returningResult.mockResolvedValueOnce([makeBanner({ title: 'Promo Baru' })]);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/banners/admin/${BANNER_ID}`,
        headers: adminHeader(app),
        payload: { title: 'Promo Baru', isActive: false },
      });

      expect(res.statusCode).toBe(200);
      expect(db.update).toHaveBeenCalled();
    });

    it('returns 404 when the banner is missing', async () => {
      // Q1: .select().from(banners).where(...).limit(1) → terminal .limit()
      chain.limit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/banners/admin/${BANNER_ID}`,
        headers: adminHeader(app),
        payload: { title: 'X' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 400 VALIDATION_ERROR for an invalid update', async () => {
      // Q1: .select().from(banners).where(...).limit(1) → terminal .limit()
      chain.limit.mockResolvedValueOnce([makeBanner()]);

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
      // Q1: .select().from(banners).where(...).limit(1) → terminal .limit()
      chain.limit.mockResolvedValueOnce([makeBanner()]);
      db.delete.mockReturnValueOnce({ where: vi.fn() });

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/banners/admin/${BANNER_ID}`,
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(db.delete).toHaveBeenCalled();
    });

    it('returns 404 when the banner is missing', async () => {
      // Q1: .select().from(banners).where(...).limit(1) → terminal .limit()
      chain.limit.mockResolvedValueOnce([]);

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
      const mockTx = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      };
      db.transaction = vi.fn().mockImplementation(async (fn) => fn(mockTx));

      const res = await app.inject({
        method: 'PUT',
        url: '/api/banners/admin/reorder',
        headers: adminHeader(app),
        payload: { ids: ['b1', 'b2', 'b3'] },
      });

      expect(res.statusCode).toBe(200);
      expect(db.transaction).toHaveBeenCalled();
      expect(mockTx.update).toHaveBeenCalledTimes(3);
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
