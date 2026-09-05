import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';

const { chain, returningResult, db } = vi.hoisted(() => {
  const chain: any = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.offset = vi.fn().mockReturnValue(chain);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  chain.leftJoin = vi.fn().mockReturnValue(chain);
  chain.groupBy = vi.fn().mockReturnValue(chain);

  const returningResult = vi.fn();

  const db = {
    select: vi.fn().mockReturnValue(chain),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({ returning: returningResult }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ returning: returningResult }),
      }),
    }),
    delete: vi.fn().mockReturnValue({ where: vi.fn() }),
  };

  return { chain, returningResult, db };
});

vi.mock('@/db', () => ({ db }));

import { wishlistRoutes } from '@/modules/wishlist/wishlist.routes';

const USER_ID = 'user-1';
const PID = '11111111-1111-1111-1111-111111111111';

function authHeader(app: FastifyInstance) {
  return { authorization: `Bearer ${app.jwt.sign({ id: USER_ID })}` };
}

function makeEntry() {
  return { id: 'wl-1', userId: USER_ID, productId: PID, createdAt: new Date() };
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
    chain.from.mockReturnValue(chain);
    chain.where.mockReturnValue(chain);
    chain.orderBy.mockReturnValue(chain);
    chain.limit.mockReturnValue(chain);
    chain.offset.mockReturnValue(chain);
    chain.innerJoin.mockReturnValue(chain);
    chain.leftJoin.mockReturnValue(chain);
    chain.groupBy.mockReturnValue(chain);
  });

  describe('GET /api/wishlist', () => {
    it('lists the user wishlist with pagination', async () => {
      // Route does: Promise.all([
      //   db.select({...}).from(wishlists).innerJoin(products).leftJoin(categories).where().orderBy().limit().offset(),
      //   db.select({count}).from(wishlists).where(),
      // ])
      // Then a separate count query for reviews: db.select({productId, count}).from(reviews).where().groupBy()
      chain.where.mockReturnValueOnce(chain);            // query1 .where → chain
      chain.offset.mockResolvedValueOnce([{ ...makeEntry(), productName: 'Test', productSlug: 'test', productPrice: 100000, productComparePrice: null, productImages: [], productStatus: 'ACTIVE', categoryName: 'Floral' }]);
      chain.where.mockResolvedValueOnce([{ count: 1 }]); // query2 .where → data (terminal)
      chain.groupBy.mockResolvedValueOnce([]);             // review count .groupBy → data (terminal)

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

  describe('POST /api/wishlist/:productId', () => {
    it('adds a product to the wishlist', async () => {
      // 1st query: check product exists
      chain.limit.mockResolvedValueOnce([{ id: PID, status: 'ACTIVE' }]);
      // 2nd query: check already wishlisted
      chain.limit.mockResolvedValueOnce([]);
      // insert returning
      returningResult.mockResolvedValueOnce([makeEntry()]);
      // fetch with product data
      chain.limit.mockResolvedValueOnce([{ ...makeEntry(), productName: 'Test', productSlug: 'test', productPrice: 100000, productImages: [] }]);

      const res = await app.inject({
        method: 'POST',
        url: `/api/wishlist/${PID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(201);
      expect(db.insert).toHaveBeenCalled();
    });

    it('returns 404 when the product does not exist', async () => {
      chain.limit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'POST',
        url: `/api/wishlist/${PID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('NOT_FOUND');
    });

    it('returns 409 when the product is already wishlisted', async () => {
      // product exists
      chain.limit.mockResolvedValueOnce([{ id: PID, status: 'ACTIVE' }]);
      // already wishlisted
      chain.limit.mockResolvedValueOnce([makeEntry()]);

      const res = await app.inject({
        method: 'POST',
        url: `/api/wishlist/${PID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe('ALREADY_WISHLISTED');
    });
  });

  describe('DELETE /api/wishlist/:productId', () => {
    it('removes an existing wishlist entry', async () => {
      chain.limit.mockResolvedValueOnce([makeEntry()]);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/wishlist/${PID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(db.delete).toHaveBeenCalled();
    });

    it('returns 404 when the entry is not present', async () => {
      chain.limit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/wishlist/${PID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/wishlist/check/:productId', () => {
    it('reports true when the product is wishlisted', async () => {
      chain.limit.mockResolvedValueOnce([makeEntry()]);

      const res = await app.inject({
        method: 'GET',
        url: `/api/wishlist/check/${PID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.isWishlisted).toBe(true);
    });

    it('reports false when the product is not wishlisted', async () => {
      chain.limit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'GET',
        url: `/api/wishlist/check/${PID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.isWishlisted).toBe(false);
    });
  });

  describe('POST /api/wishlist/toggle/:productId', () => {
    it('adds the product when it is not yet wishlisted (201)', async () => {
      // product exists
      chain.limit.mockResolvedValueOnce([{ id: PID, status: 'ACTIVE' }]);
      // not wishlisted
      chain.limit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'POST',
        url: `/api/wishlist/toggle/${PID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().data.isWishlisted).toBe(true);
      expect(db.insert).toHaveBeenCalled();
    });

    it('removes the product when it is already wishlisted (200)', async () => {
      // product exists
      chain.limit.mockResolvedValueOnce([{ id: PID, status: 'ACTIVE' }]);
      // already wishlisted
      chain.limit.mockResolvedValueOnce([makeEntry()]);

      const res = await app.inject({
        method: 'POST',
        url: `/api/wishlist/toggle/${PID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.isWishlisted).toBe(false);
      expect(db.delete).toHaveBeenCalled();
    });

    it('returns 404 when toggling a non-existent product', async () => {
      chain.limit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'POST',
        url: `/api/wishlist/toggle/${PID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
