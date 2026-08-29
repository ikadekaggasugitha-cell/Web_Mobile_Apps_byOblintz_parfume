import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';

const prisma = vi.hoisted(() => ({
  subscription: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  product: { findUnique: vi.fn() },
}));

vi.mock('@/config/database', () => ({ default: prisma, prisma }));

import { subscriptionRoutes } from '@/modules/subscription/subscription.routes';
import {
  createSubscriptionSchema,
  updateSubscriptionSchema,
} from '@/modules/subscription/subscription.schema';

const USER_ID = 'user-1';
const PID = '11111111-1111-1111-1111-111111111111';
const SUB_ID = 'sub-1';

function userHeader(app: FastifyInstance) {
  return { authorization: `Bearer ${app.jwt.sign({ id: USER_ID })}` };
}
function adminHeader(app: FastifyInstance) {
  return { authorization: `Bearer ${app.jwt.sign({ id: 'admin-1', role: 'ADMIN' })}` };
}

function makeSub(overrides: Record<string, unknown> = {}) {
  return {
    id: SUB_ID,
    userId: USER_ID,
    productId: PID,
    frequency: 'MONTHLY',
    status: 'ACTIVE',
    nextDelivery: new Date('2026-09-30').toISOString(),
    ...overrides,
  };
}

describe('subscription module (TC-050 – TC-053)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(jwt, { secret: 'test-jwt-secret-min-32-characters!!' });
    await app.register(subscriptionRoutes, { prefix: '/api/subscriptions' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.subscription.update.mockImplementation(async ({ data }: any) =>
      makeSub(data)
    );
  });

  // ==================== LIST / DETAIL ====================
  describe('GET /api/subscriptions', () => {
    it('lists the current user subscriptions', async () => {
      prisma.subscription.findMany.mockResolvedValue([makeSub()]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/subscriptions',
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toHaveLength(1);
      expect(prisma.subscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: USER_ID } })
      );
    });

    it('returns 401 without a token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/subscriptions' });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/subscriptions/:id', () => {
    it('returns the subscription detail', async () => {
      prisma.subscription.findFirst.mockResolvedValue(makeSub());

      const res = await app.inject({
        method: 'GET',
        url: `/api/subscriptions/${SUB_ID}`,
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.id).toBe(SUB_ID);
    });

    it('returns 404 when not found', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/api/subscriptions/ghost',
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('NOT_FOUND');
    });
  });

  // ==================== TC-050: CREATE ====================
  describe('TC-050: POST /api/subscriptions', () => {
    it('creates an active monthly subscription', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: PID, status: 'ACTIVE' });
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.subscription.create.mockResolvedValue(makeSub());

      const res = await app.inject({
        method: 'POST',
        url: '/api/subscriptions',
        headers: userHeader(app),
        payload: { productId: PID, frequency: 'MONTHLY' },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().data.status).toBe('ACTIVE');
      expect(prisma.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: USER_ID,
            productId: PID,
            frequency: 'MONTHLY',
            status: 'ACTIVE',
            nextDelivery: expect.any(Date),
          }),
        })
      );
    });

    it('creates a quarterly subscription', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: PID, status: 'ACTIVE' });
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.subscription.create.mockResolvedValue(makeSub({ frequency: 'QUARTERLY' }));

      const res = await app.inject({
        method: 'POST',
        url: '/api/subscriptions',
        headers: userHeader(app),
        payload: { productId: PID, frequency: 'QUARTERLY' },
      });

      expect(res.statusCode).toBe(201);
    });

    it('returns 404 when the product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'POST',
        url: '/api/subscriptions',
        headers: userHeader(app),
        payload: { productId: PID, frequency: 'MONTHLY' },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('NOT_FOUND');
    });

    it('returns 409 when already subscribed to the product', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: PID, status: 'ACTIVE' });
      prisma.subscription.findFirst.mockResolvedValue(makeSub());

      const res = await app.inject({
        method: 'POST',
        url: '/api/subscriptions',
        headers: userHeader(app),
        payload: { productId: PID, frequency: 'MONTHLY' },
      });

      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe('ALREADY_SUBSCRIBED');
    });

    it('returns 400 VALIDATION_ERROR for an invalid payload', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/subscriptions',
        headers: userHeader(app),
        payload: { productId: 'not-a-uuid', frequency: 'WEEKLY' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ==================== TC-051: PAUSE ====================
  describe('TC-051: POST /api/subscriptions/:id/pause', () => {
    it('pauses an active subscription', async () => {
      prisma.subscription.findFirst.mockResolvedValue(makeSub({ status: 'ACTIVE' }));

      const res = await app.inject({
        method: 'POST',
        url: `/api/subscriptions/${SUB_ID}/pause`,
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.status).toBe('PAUSED');
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: SUB_ID },
        data: { status: 'PAUSED' },
      });
    });

    it('returns 404 when no active subscription exists', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);

      const res = await app.inject({
        method: 'POST',
        url: `/api/subscriptions/${SUB_ID}/pause`,
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== TC-052: RESUME ====================
  describe('TC-052: POST /api/subscriptions/:id/resume', () => {
    it('resumes a paused monthly subscription and recomputes delivery', async () => {
      prisma.subscription.findFirst.mockResolvedValue(
        makeSub({ status: 'PAUSED', frequency: 'MONTHLY' })
      );

      const res = await app.inject({
        method: 'POST',
        url: `/api/subscriptions/${SUB_ID}/resume`,
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.status).toBe('ACTIVE');
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: SUB_ID },
        data: expect.objectContaining({ status: 'ACTIVE', nextDelivery: expect.any(Date) }),
      });
    });

    it('resumes a paused quarterly subscription', async () => {
      prisma.subscription.findFirst.mockResolvedValue(
        makeSub({ status: 'PAUSED', frequency: 'QUARTERLY' })
      );

      const res = await app.inject({
        method: 'POST',
        url: `/api/subscriptions/${SUB_ID}/resume`,
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(200);
    });

    it('returns 404 when no paused subscription exists', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);

      const res = await app.inject({
        method: 'POST',
        url: `/api/subscriptions/${SUB_ID}/resume`,
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== TC-053: CANCEL ====================
  describe('TC-053: POST /api/subscriptions/:id/cancel', () => {
    it('cancels an active subscription', async () => {
      prisma.subscription.findFirst.mockResolvedValue(makeSub({ status: 'ACTIVE' }));

      const res = await app.inject({
        method: 'POST',
        url: `/api/subscriptions/${SUB_ID}/cancel`,
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.status).toBe('CANCELLED');
    });

    it('returns 404 when the subscription is missing', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);

      const res = await app.inject({
        method: 'POST',
        url: `/api/subscriptions/${SUB_ID}/cancel`,
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 400 INVALID_STATUS when already cancelled', async () => {
      prisma.subscription.findFirst.mockResolvedValue(makeSub({ status: 'CANCELLED' }));

      const res = await app.inject({
        method: 'POST',
        url: `/api/subscriptions/${SUB_ID}/cancel`,
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('INVALID_STATUS');
      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });
  });

  // ==================== ADMIN ====================
  describe('GET /api/subscriptions/admin/all', () => {
    it('rejects non-admin users (403)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/subscriptions/admin/all',
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe('FORBIDDEN');
    });

    it('lists all subscriptions for an admin with pagination', async () => {
      prisma.subscription.findMany.mockResolvedValue([makeSub()]);
      prisma.subscription.count.mockResolvedValue(1);

      const res = await app.inject({
        method: 'GET',
        url: '/api/subscriptions/admin/all?status=ACTIVE&page=1&limit=20',
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.subscriptions).toHaveLength(1);
      expect(data.pagination).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    });
  });

  // ==================== SCHEMA (exported validators, unified — M3) ====================
  describe('subscription.schema validators', () => {
    it('accepts a valid create payload (productId + MONTHLY/QUARTERLY)', () => {
      const parsed = createSubscriptionSchema.parse({ productId: PID, frequency: 'MONTHLY' });
      expect(parsed.frequency).toBe('MONTHLY');
    });

    it('rejects an invalid create payload', () => {
      expect(() =>
        createSubscriptionSchema.parse({ productId: 'nope', frequency: 'weekly' })
      ).toThrow();
    });

    it('accepts a partial update payload', () => {
      const parsed = updateSubscriptionSchema.parse({ frequency: 'QUARTERLY' });
      expect(parsed.frequency).toBe('QUARTERLY');
    });
  });
});
