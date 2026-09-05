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

import { promoRoutes } from '@/modules/promo/promo.routes';

const PROMO_ID = 'promo-1';

function userHeader(app: FastifyInstance) {
  return { authorization: `Bearer ${app.jwt.sign({ id: 'user-1' })}` };
}
function adminHeader(app: FastifyInstance) {
  return { authorization: `Bearer ${app.jwt.sign({ id: 'admin-1', role: 'ADMIN' })}` };
}

function makePromo(overrides: Record<string, unknown> = {}) {
  return {
    id: PROMO_ID,
    code: 'HEMAT10',
    name: 'Diskon 10%',
    status: 'ACTIVE',
    startDate: null,
    endDate: null,
    usageLimit: null,
    usedCount: 0,
    minOrder: null,
    type: 'PERCENTAGE',
    value: 10,
    maxDiscount: null,
    ...overrides,
  };
}

describe('promo module', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(jwt, { secret: 'test-jwt-secret-min-32-characters!!' });
    await app.register(promoRoutes, { prefix: '/api/promos' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.resetAllMocks();
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
    chain.from.mockReturnValue(chain);
    chain.where.mockReturnValue(chain);
    chain.orderBy.mockReturnValue(chain);
    chain.limit.mockReturnValue(chain);
    chain.offset.mockReturnValue(chain);
    chain.innerJoin.mockReturnValue(chain);
    chain.leftJoin.mockReturnValue(chain);
    chain.groupBy.mockReturnValue(chain);
  });

  // ==================== VALIDATE (PUBLIC) ====================
  describe('POST /api/promos/validate', () => {
    it('computes a capped percentage discount', async () => {
      // Route: .from().where().limit(1) → where non-terminal, limit terminal
      chain.where.mockReturnValueOnce(chain);
      chain.limit.mockResolvedValueOnce([makePromo({ value: 50, maxDiscount: 100000 })]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/promos/validate',
        payload: { code: 'hemat10', subtotal: 500000 },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.discount).toBe(100000); // capped
      expect(data.total).toBe(400000);
    });

    it('computes a fixed discount capped at the subtotal', async () => {
      chain.where.mockReturnValueOnce(chain);
      chain.limit.mockResolvedValueOnce([makePromo({ type: 'FIXED', value: 999999 })]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/promos/validate',
        payload: { code: 'HEMAT10', subtotal: 200000 },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.discount).toBe(200000);
    });

    it('computes a free-shipping discount', async () => {
      chain.where.mockReturnValueOnce(chain);
      chain.limit.mockResolvedValueOnce([makePromo({ type: 'FREE_SHIPPING' })]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/promos/validate',
        payload: { code: 'HEMAT10', subtotal: 200000 },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.discount).toBe(15000);
    });

    it('returns 404 for an unknown code', async () => {
      chain.where.mockReturnValueOnce(chain);
      chain.limit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/promos/validate',
        payload: { code: 'NOPE', subtotal: 100000 },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('NOT_FOUND');
    });

    it('returns 400 INACTIVE for a disabled promo', async () => {
      chain.where.mockReturnValueOnce(chain);
      chain.limit.mockResolvedValueOnce([makePromo({ status: 'INACTIVE' })]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/promos/validate',
        payload: { code: 'HEMAT10', subtotal: 100000 },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('INACTIVE');
    });

    it('returns 400 NOT_STARTED before the start date', async () => {
      chain.where.mockReturnValueOnce(chain);
      chain.limit.mockResolvedValueOnce([makePromo({ startDate: new Date('2999-01-01') })]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/promos/validate',
        payload: { code: 'HEMAT10', subtotal: 100000 },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('NOT_STARTED');
    });

    it('returns 400 EXPIRED after the end date', async () => {
      chain.where.mockReturnValueOnce(chain);
      chain.limit.mockResolvedValueOnce([makePromo({ endDate: new Date('2000-01-01') })]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/promos/validate',
        payload: { code: 'HEMAT10', subtotal: 100000 },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('EXPIRED');
    });

    it('returns 400 LIMIT_REACHED when usage limit is hit', async () => {
      chain.where.mockReturnValueOnce(chain);
      chain.limit.mockResolvedValueOnce([makePromo({ usageLimit: 5, usedCount: 5 })]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/promos/validate',
        payload: { code: 'HEMAT10', subtotal: 100000 },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('LIMIT_REACHED');
    });

    it('returns 400 MIN_ORDER when the subtotal is too low', async () => {
      chain.where.mockReturnValueOnce(chain);
      chain.limit.mockResolvedValueOnce([makePromo({ minOrder: 1000000 })]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/promos/validate',
        payload: { code: 'HEMAT10', subtotal: 100000 },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('MIN_ORDER');
    });

    it('returns 400 VALIDATION_ERROR for an invalid body', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/promos/validate',
        payload: { code: '' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ==================== ADMIN LIST ====================
  describe('GET /api/promos/admin/all', () => {
    it('rejects non-admin users (403)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/promos/admin/all',
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(403);
    });

    it('lists promos for an admin', async () => {
      // Q1: .from().where().orderBy().limit().offset(skip) → where non-term, limit non-term, offset terminal
      // Q2: .from().where() → where terminal
      chain.where
        .mockReturnValueOnce(chain)               // Q1 .where() non-terminal
        .mockResolvedValueOnce([{ total: 1 }]);    // Q2 .where() terminal
      chain.limit
        .mockReturnValueOnce(chain);               // Q1 .limit() non-terminal
      chain.offset
        .mockResolvedValueOnce([makePromo()]);      // Q1 .offset() terminal

      const res = await app.inject({
        method: 'GET',
        url: '/api/promos/admin/all?status=ACTIVE',
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.promos).toHaveLength(1);
    });
  });

  // ==================== ADMIN CREATE ====================
  describe('POST /api/promos/admin', () => {
    const body = { code: 'hemat10', name: 'Diskon 10%', type: 'PERCENTAGE', value: 10 };

    it('creates a promo (uppercasing the code)', async () => {
      chain.where.mockReturnValueOnce(chain);
      chain.limit.mockResolvedValueOnce([]);
      returningResult.mockResolvedValueOnce([makePromo()]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/promos/admin',
        headers: adminHeader(app),
        payload: body,
      });

      expect(res.statusCode).toBe(201);
      expect(db.insert).toHaveBeenCalled();
    });

    it('returns 409 when the code already exists', async () => {
      chain.where.mockReturnValueOnce(chain);
      chain.limit.mockResolvedValueOnce([makePromo()]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/promos/admin',
        headers: adminHeader(app),
        payload: body,
      });

      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe('CONFLICT');
    });

    it('returns 400 VALIDATION_ERROR for an invalid payload', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/promos/admin',
        headers: adminHeader(app),
        payload: { code: 'ab', name: 'x', type: 'WRONG', value: -1 },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ==================== ADMIN UPDATE ====================
  describe('PUT /api/promos/admin/:id', () => {
    it('updates an existing promo', async () => {
      chain.where.mockReturnValueOnce(chain);
      chain.limit.mockResolvedValueOnce([makePromo()]);
      returningResult.mockResolvedValueOnce([makePromo({ value: 20 })]);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/promos/admin/${PROMO_ID}`,
        headers: adminHeader(app),
        payload: { value: 20, isActive: false },
      });

      expect(res.statusCode).toBe(200);
      expect(db.update).toHaveBeenCalled();
    });

    it('returns 404 when the promo is missing', async () => {
      chain.where.mockReturnValueOnce(chain);
      chain.limit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/promos/admin/${PROMO_ID}`,
        headers: adminHeader(app),
        payload: { value: 20 },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== ADMIN DELETE ====================
  describe('DELETE /api/promos/admin/:id', () => {
    it('deletes a promo', async () => {
      chain.where.mockReturnValueOnce(chain);
      chain.limit.mockResolvedValueOnce([makePromo()]);
      db.delete.mockReturnValueOnce({ where: vi.fn() });

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/promos/admin/${PROMO_ID}`,
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(db.delete).toHaveBeenCalled();
    });

    it('returns 404 when the promo is missing', async () => {
      chain.where.mockReturnValueOnce(chain);
      chain.limit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/promos/admin/${PROMO_ID}`,
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== ADMIN TOGGLE ====================
  describe('PUT /api/promos/admin/:id/toggle', () => {
    it('toggles an active promo to inactive', async () => {
      chain.where.mockReturnValueOnce(chain);
      chain.limit.mockResolvedValueOnce([makePromo({ status: 'ACTIVE' })]);
      returningResult.mockResolvedValueOnce([makePromo({ status: 'INACTIVE' })]);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/promos/admin/${PROMO_ID}/toggle`,
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.status).toBe('INACTIVE');
    });

    it('toggles an inactive promo to active', async () => {
      chain.where.mockReturnValueOnce(chain);
      chain.limit.mockResolvedValueOnce([makePromo({ status: 'INACTIVE' })]);
      returningResult.mockResolvedValueOnce([makePromo({ status: 'ACTIVE' })]);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/promos/admin/${PROMO_ID}/toggle`,
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.status).toBe('ACTIVE');
    });

    it('returns 404 when the promo is missing', async () => {
      chain.where.mockReturnValueOnce(chain);
      chain.limit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/promos/admin/${PROMO_ID}/toggle`,
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
