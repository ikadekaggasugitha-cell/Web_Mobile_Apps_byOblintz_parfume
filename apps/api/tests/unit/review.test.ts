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

import { reviewRoutes } from '@/modules/review/review.routes';

const USER_ID = 'user-1';
const PID = '11111111-1111-1111-1111-111111111111';
const REVIEW_ID = 'review-1';

function userHeader(app: FastifyInstance) {
  return { authorization: `Bearer ${app.jwt.sign({ id: USER_ID })}` };
}
function adminHeader(app: FastifyInstance) {
  return { authorization: `Bearer ${app.jwt.sign({ id: 'admin-1', role: 'ADMIN' })}` };
}

function makeReview(overrides: Record<string, unknown> = {}) {
  return {
    id: REVIEW_ID,
    userId: USER_ID,
    productId: PID,
    rating: 5,
    comment: 'Aromanya tahan lama dan mewah',
    images: [],
    status: 'PENDING',
    ...overrides,
  };
}

describe('review module', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(jwt, { secret: 'test-jwt-secret-min-32-characters!!' });
    await app.register(reviewRoutes, { prefix: '/api/reviews' });
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

  describe('GET /api/reviews/product/:productId', () => {
    it('returns approved reviews with stats and rating distribution', async () => {
      // Route: Promise.all([
      //   db.select({...}).from().innerJoin().where().orderBy().limit().offset(),  // .where() non-terminal, .offset() terminal
      //   db.select({count}).from().where(),                                       // .where() terminal
      //   db.select({avgRating,total}).from().where(),                             // .where() terminal
      //   db.select({rating,count}).from().where().groupBy(),                      // .where() non-terminal, .groupBy() terminal
      // ])
      // Execution order: query1.where, query2.where, query3.where, query4.where
      chain.where.mockReturnValueOnce(chain);            // query1 .where → chain
      chain.where.mockResolvedValueOnce([{ count: 1 }]); // query2 .where → data (terminal)
      chain.where.mockResolvedValueOnce([{ avgRating: 5, total: 1 }]); // query3 .where → data (terminal)
      chain.where.mockReturnValueOnce(chain);            // query4 .where → chain
      chain.offset.mockResolvedValueOnce([{ id: REVIEW_ID, userId: USER_ID, productId: PID, rating: 5, comment: 'Great', images: [], status: 'APPROVED', createdAt: new Date() }]);
      chain.groupBy.mockResolvedValueOnce([{ rating: 5, count: 1 }]);

      const res = await app.inject({
        method: 'GET',
        url: `/api/reviews/product/${PID}`,
      });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.reviews).toHaveLength(1);
      expect(data.stats.total).toBe(1);
    });

    it('reports a zero average when there are no reviews', async () => {
      chain.where.mockReturnValueOnce(chain);
      chain.where.mockResolvedValueOnce([{ count: 0 }]);
      chain.where.mockResolvedValueOnce([{ avgRating: 0, total: 0 }]);
      chain.where.mockReturnValueOnce(chain);
      chain.offset.mockResolvedValueOnce([]);
      chain.groupBy.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'GET',
        url: `/api/reviews/product/${PID}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.stats.average).toBe(0);
    });
  });

  describe('POST /api/reviews', () => {
    const validBody = { productId: PID, rating: 5, comment: 'Aromanya tahan lama dan mewah' };

    it('creates a pending review for a purchased product', async () => {
      chain.limit.mockResolvedValueOnce([{ id: 'item-1' }]);
      chain.limit.mockResolvedValueOnce([]);
      returningResult.mockResolvedValueOnce([makeReview()]);
      chain.limit.mockResolvedValueOnce([{ ...makeReview(), id: REVIEW_ID }]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/reviews',
        headers: userHeader(app),
        payload: validBody,
      });

      expect(res.statusCode).toBe(201);
      expect(db.insert).toHaveBeenCalled();
    });

    it('rejects a review for a product the user has not received (400)', async () => {
      chain.limit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/reviews',
        headers: userHeader(app),
        payload: validBody,
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('NOT_PURCHASED');
    });

    it('returns 409 when the user already reviewed the product', async () => {
      chain.limit.mockResolvedValueOnce([{ id: 'item-1' }]);
      chain.limit.mockResolvedValueOnce([makeReview()]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/reviews',
        headers: userHeader(app),
        payload: validBody,
      });

      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe('ALREADY_REVIEWED');
    });

    it('returns 400 VALIDATION_ERROR for an invalid payload', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/reviews',
        headers: userHeader(app),
        payload: { productId: PID, rating: 9, comment: 'short' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 401 without a token', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/reviews', payload: validBody });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('PUT /api/reviews/:id', () => {
    it('updates the review and resets it to PENDING', async () => {
      chain.limit.mockResolvedValueOnce([makeReview()]);
      returningResult.mockResolvedValueOnce([makeReview({ rating: 4, status: 'PENDING' })]);
      chain.limit.mockResolvedValueOnce([{ ...makeReview(), rating: 4 }]);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/reviews/${REVIEW_ID}`,
        headers: userHeader(app),
        payload: { rating: 4, comment: 'Masih bagus tapi kurang tahan lama' },
      });

      expect(res.statusCode).toBe(200);
      expect(db.update).toHaveBeenCalled();
    });

    it('returns 404 when the review is not owned by the user', async () => {
      chain.limit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/reviews/${REVIEW_ID}`,
        headers: userHeader(app),
        payload: { rating: 4 },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('NOT_FOUND');
    });

    it('returns 400 VALIDATION_ERROR for an invalid update', async () => {
      chain.limit.mockResolvedValueOnce([makeReview()]);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/reviews/${REVIEW_ID}`,
        headers: userHeader(app),
        payload: { rating: 0 },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/reviews/:id', () => {
    it('deletes an owned review', async () => {
      chain.limit.mockResolvedValueOnce([makeReview()]);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/reviews/${REVIEW_ID}`,
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(db.delete).toHaveBeenCalled();
    });

    it('returns 404 when the review does not exist', async () => {
      chain.limit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/reviews/${REVIEW_ID}`,
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('admin review moderation', () => {
    it('rejects pending list for non-admin users (403)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/reviews/admin/pending',
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe('FORBIDDEN');
    });

    it('lists pending reviews for an admin', async () => {
      // Route: Promise.all([
      //   db.select({...}).from().innerJoin().innerJoin().where().orderBy().limit().offset(),
      //   db.select({count}).from().where(),
      // ])
      chain.where.mockReturnValueOnce(chain);
      chain.offset.mockResolvedValueOnce([makeReview()]);
      chain.where.mockResolvedValueOnce([{ count: 1 }]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/reviews/admin/pending?page=1&limit=20',
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.reviews).toHaveLength(1);
      expect(res.json().data.pagination).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    });

    it('approves a review', async () => {
      chain.limit.mockResolvedValueOnce([makeReview()]);
      returningResult.mockResolvedValueOnce([makeReview({ status: 'APPROVED' })]);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/reviews/admin/${REVIEW_ID}/approve`,
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(db.update).toHaveBeenCalled();
    });

    it('returns 404 when approving a missing review', async () => {
      chain.limit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/reviews/admin/${REVIEW_ID}/approve`,
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });

    it('rejects (deletes) a review', async () => {
      chain.limit.mockResolvedValueOnce([makeReview()]);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/reviews/admin/${REVIEW_ID}/reject`,
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(db.delete).toHaveBeenCalled();
    });

    it('returns 404 when rejecting a missing review', async () => {
      chain.limit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/reviews/admin/${REVIEW_ID}/reject`,
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
