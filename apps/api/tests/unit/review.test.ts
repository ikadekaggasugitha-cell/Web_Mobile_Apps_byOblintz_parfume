import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';

const prisma = vi.hoisted(() => ({
  review: {
    findMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  orderItem: { findFirst: vi.fn() },
}));

vi.mock('@/config/database', () => ({ default: prisma, prisma }));

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
  });

  // ==================== LIST BY PRODUCT ====================
  describe('GET /api/reviews/product/:productId', () => {
    it('returns approved reviews with stats and rating distribution', async () => {
      prisma.review.findMany.mockResolvedValue([makeReview({ status: 'APPROVED' })]);
      prisma.review.count.mockResolvedValue(3);
      prisma.review.aggregate.mockResolvedValue({
        _avg: { rating: 4.5 },
        _count: { rating: 3 },
      });
      prisma.review.groupBy.mockResolvedValue([
        { rating: 5, _count: { rating: 2 } },
        { rating: 4, _count: { rating: 1 } },
      ]);

      const res = await app.inject({
        method: 'GET',
        url: `/api/reviews/product/${PID}`,
      });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.reviews).toHaveLength(1);
      expect(data.stats.average).toBe(4.5);
      expect(data.stats.total).toBe(3);
      expect(data.stats.distribution).toEqual({ 1: 0, 2: 0, 3: 0, 4: 1, 5: 2 });
      expect(data.pagination.total).toBe(3);
    });

    it('reports a zero average when there are no reviews', async () => {
      prisma.review.findMany.mockResolvedValue([]);
      prisma.review.count.mockResolvedValue(0);
      prisma.review.aggregate.mockResolvedValue({ _avg: { rating: null }, _count: { rating: 0 } });
      prisma.review.groupBy.mockResolvedValue([]);

      const res = await app.inject({
        method: 'GET',
        url: `/api/reviews/product/${PID}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.stats.average).toBe(0);
    });
  });

  // ==================== CREATE REVIEW ====================
  describe('POST /api/reviews', () => {
    const validBody = { productId: PID, rating: 5, comment: 'Aromanya tahan lama dan mewah' };

    it('creates a pending review for a purchased product', async () => {
      prisma.orderItem.findFirst.mockResolvedValue({ id: 'item-1' });
      prisma.review.findFirst.mockResolvedValue(null);
      prisma.review.create.mockResolvedValue(makeReview());

      const res = await app.inject({
        method: 'POST',
        url: '/api/reviews',
        headers: userHeader(app),
        payload: validBody,
      });

      expect(res.statusCode).toBe(201);
      expect(prisma.review.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PENDING', rating: 5, productId: PID }),
        })
      );
    });

    it('rejects a review for a product the user has not received (400)', async () => {
      prisma.orderItem.findFirst.mockResolvedValue(null);

      const res = await app.inject({
        method: 'POST',
        url: '/api/reviews',
        headers: userHeader(app),
        payload: validBody,
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('NOT_PURCHASED');
      expect(prisma.review.create).not.toHaveBeenCalled();
    });

    it('returns 409 when the user already reviewed the product', async () => {
      prisma.orderItem.findFirst.mockResolvedValue({ id: 'item-1' });
      prisma.review.findFirst.mockResolvedValue(makeReview());

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

  // ==================== UPDATE REVIEW ====================
  describe('PUT /api/reviews/:id', () => {
    it('updates the review and resets it to PENDING', async () => {
      prisma.review.findFirst.mockResolvedValue(makeReview());
      prisma.review.update.mockResolvedValue(makeReview({ rating: 4, status: 'PENDING' }));

      const res = await app.inject({
        method: 'PUT',
        url: `/api/reviews/${REVIEW_ID}`,
        headers: userHeader(app),
        payload: { rating: 4, comment: 'Masih bagus tapi kurang tahan lama' },
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.review.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PENDING' }),
        })
      );
    });

    it('returns 404 when the review is not owned by the user', async () => {
      prisma.review.findFirst.mockResolvedValue(null);

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
      prisma.review.findFirst.mockResolvedValue(makeReview());

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

  // ==================== DELETE REVIEW ====================
  describe('DELETE /api/reviews/:id', () => {
    it('deletes an owned review', async () => {
      prisma.review.findFirst.mockResolvedValue(makeReview());
      prisma.review.delete.mockResolvedValue(makeReview());

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/reviews/${REVIEW_ID}`,
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.review.delete).toHaveBeenCalledWith({ where: { id: REVIEW_ID } });
    });

    it('returns 404 when the review does not exist', async () => {
      prisma.review.findFirst.mockResolvedValue(null);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/reviews/${REVIEW_ID}`,
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== ADMIN ====================
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
      prisma.review.findMany.mockResolvedValue([makeReview()]);
      prisma.review.count.mockResolvedValue(1);

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
      prisma.review.findUnique.mockResolvedValue(makeReview());
      prisma.review.update.mockResolvedValue(makeReview({ status: 'APPROVED' }));

      const res = await app.inject({
        method: 'PUT',
        url: `/api/reviews/admin/${REVIEW_ID}/approve`,
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.review.update).toHaveBeenCalledWith({
        where: { id: REVIEW_ID },
        data: { status: 'APPROVED' },
      });
    });

    it('returns 404 when approving a missing review', async () => {
      prisma.review.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/reviews/admin/${REVIEW_ID}/approve`,
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });

    it('rejects (deletes) a review', async () => {
      prisma.review.findUnique.mockResolvedValue(makeReview());
      prisma.review.delete.mockResolvedValue(makeReview());

      const res = await app.inject({
        method: 'PUT',
        url: `/api/reviews/admin/${REVIEW_ID}/reject`,
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.review.delete).toHaveBeenCalledWith({ where: { id: REVIEW_ID } });
    });

    it('returns 404 when rejecting a missing review', async () => {
      prisma.review.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/reviews/admin/${REVIEW_ID}/reject`,
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
