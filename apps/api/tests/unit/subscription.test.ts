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
    query: {
      subscriptions: { findMany: vi.fn() },
    },
  };

  return { chain, returningResult, db };
});

vi.mock('@/db', () => ({ db }));

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
    vi.resetAllMocks();
    chain.from.mockReturnValue(chain);
    chain.where.mockReturnValue(chain);
    chain.orderBy.mockReturnValue(chain);
    chain.limit.mockReturnValue(chain);
    chain.offset.mockReturnValue(chain);
    chain.innerJoin.mockReturnValue(chain);
    chain.leftJoin.mockReturnValue(chain);
    chain.groupBy.mockReturnValue(chain);
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
  });

  // ==================== LIST / DETAIL ====================
  describe('GET /api/subscriptions', () => {
    it('lists the current user subscriptions', async () => {
      // Route: db.query.subscriptions.findMany({where, orderBy, with})
      db.query.subscriptions.findMany.mockResolvedValueOnce([makeSub()]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/subscriptions',
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toHaveLength(1);
      expect(db.query.subscriptions.findMany).toHaveBeenCalled();
    });

    it('returns 401 without a token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/subscriptions' });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/subscriptions/:id', () => {
    it('returns the subscription detail', async () => {
      // Route: db.query.subscriptions.findMany({where, with, limit: 1})
      db.query.subscriptions.findMany.mockResolvedValueOnce([makeSub()]);

      const res = await app.inject({
        method: 'GET',
        url: `/api/subscriptions/${SUB_ID}`,
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.id).toBe(SUB_ID);
    });

    it('returns 404 when not found', async () => {
      db.query.subscriptions.findMany.mockResolvedValueOnce([]);

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
      // Q1: db.select().from(products).where(and(...)).limit(1) → product check
      chain.limit.mockResolvedValueOnce([{ id: PID, status: 'ACTIVE' }]);
      chain.where.mockReturnValueOnce(chain);
      // Q2: db.query.subscriptions.findMany({where, limit: 1}) → duplicate check → []
      db.query.subscriptions.findMany.mockResolvedValueOnce([]);
      // Q3: db.insert(subscriptions).values({...}).returning()
      returningResult.mockResolvedValueOnce([makeSub()]);
      // Q4: db.query.subscriptions.findMany({where, with, limit: 1}) → full subscription
      db.query.subscriptions.findMany.mockResolvedValueOnce([{ ...makeSub(), product: { id: PID } }]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/subscriptions',
        headers: userHeader(app),
        payload: { productId: PID, frequency: 'MONTHLY' },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().data.status).toBe('ACTIVE');
      expect(db.insert).toHaveBeenCalled();
    });

    it('creates a quarterly subscription', async () => {
      chain.limit.mockResolvedValueOnce([{ id: PID, status: 'ACTIVE' }]);
      chain.where.mockReturnValueOnce(chain);
      db.query.subscriptions.findMany.mockResolvedValueOnce([]);
      returningResult.mockResolvedValueOnce([makeSub({ frequency: 'QUARTERLY' })]);
      db.query.subscriptions.findMany.mockResolvedValueOnce([
        { ...makeSub({ frequency: 'QUARTERLY' }), product: { id: PID } },
      ]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/subscriptions',
        headers: userHeader(app),
        payload: { productId: PID, frequency: 'QUARTERLY' },
      });

      expect(res.statusCode).toBe(201);
    });

    it('returns 404 when the product does not exist', async () => {
      // Q1: db.select().from(products).where(and(...)).limit(1) → []
      chain.limit.mockResolvedValueOnce([]);
      chain.where.mockReturnValueOnce(chain);

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
      // Q1: db.select().from(products).where(and(...)).limit(1) → [product]
      chain.limit.mockResolvedValueOnce([{ id: PID, status: 'ACTIVE' }]);
      chain.where.mockReturnValueOnce(chain);
      // Q2: db.query.subscriptions.findMany({where, limit: 1}) → [existing sub]
      db.query.subscriptions.findMany.mockResolvedValueOnce([makeSub()]);

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
      // Route: db.query.subscriptions.findMany({where, limit: 1}) → active sub
      db.query.subscriptions.findMany.mockResolvedValueOnce([makeSub({ status: 'ACTIVE' })]);
      // Route: db.update(subscriptions).set({status: 'PAUSED'}).where(eq(...)).returning()
      returningResult.mockResolvedValueOnce([makeSub({ status: 'PAUSED' })]);

      const res = await app.inject({
        method: 'POST',
        url: `/api/subscriptions/${SUB_ID}/pause`,
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.status).toBe('PAUSED');
      expect(db.update).toHaveBeenCalled();
    });

    it('returns 404 when no active subscription exists', async () => {
      db.query.subscriptions.findMany.mockResolvedValueOnce([]);

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
      // Route: db.query.subscriptions.findMany({where, limit: 1}) → paused sub
      db.query.subscriptions.findMany.mockResolvedValueOnce([
        makeSub({ status: 'PAUSED', frequency: 'MONTHLY' }),
      ]);
      // Route: db.update(subscriptions).set({...}).where(eq(...)).returning()
      returningResult.mockResolvedValueOnce([makeSub({ status: 'ACTIVE' })]);

      const res = await app.inject({
        method: 'POST',
        url: `/api/subscriptions/${SUB_ID}/resume`,
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.status).toBe('ACTIVE');
      expect(db.update).toHaveBeenCalled();
    });

    it('resumes a paused quarterly subscription', async () => {
      db.query.subscriptions.findMany.mockResolvedValueOnce([
        makeSub({ status: 'PAUSED', frequency: 'QUARTERLY' }),
      ]);
      returningResult.mockResolvedValueOnce([makeSub({ status: 'ACTIVE' })]);

      const res = await app.inject({
        method: 'POST',
        url: `/api/subscriptions/${SUB_ID}/resume`,
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(200);
    });

    it('returns 404 when no paused subscription exists', async () => {
      db.query.subscriptions.findMany.mockResolvedValueOnce([]);

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
      // Route: db.query.subscriptions.findMany({where, limit: 1}) → active sub
      db.query.subscriptions.findMany.mockResolvedValueOnce([makeSub({ status: 'ACTIVE' })]);
      // Route: db.update(subscriptions).set({status: 'CANCELLED'}).where(eq(...)).returning()
      returningResult.mockResolvedValueOnce([makeSub({ status: 'CANCELLED' })]);

      const res = await app.inject({
        method: 'POST',
        url: `/api/subscriptions/${SUB_ID}/cancel`,
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.status).toBe('CANCELLED');
    });

    it('returns 404 when the subscription is missing', async () => {
      db.query.subscriptions.findMany.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'POST',
        url: `/api/subscriptions/${SUB_ID}/cancel`,
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 400 INVALID_STATUS when already cancelled', async () => {
      // Route: db.query.subscriptions.findMany({where, limit: 1}) → cancelled sub
      db.query.subscriptions.findMany.mockResolvedValueOnce([makeSub({ status: 'CANCELLED' })]);

      const res = await app.inject({
        method: 'POST',
        url: `/api/subscriptions/${SUB_ID}/cancel`,
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('INVALID_STATUS');
      expect(db.update).not.toHaveBeenCalled();
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
      // Route: Promise.all([
      //   db.query.subscriptions.findMany({...}),  → relational
      //   db.select({count: count()}).from(subscriptions).where(whereClause),  → chain
      // ])
      // Chain: select → from → where (terminal!)
      db.query.subscriptions.findMany.mockResolvedValueOnce([makeSub()]);
      chain.where.mockResolvedValueOnce([{ count: 1 }]);

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
