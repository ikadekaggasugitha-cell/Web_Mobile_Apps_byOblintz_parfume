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
    transaction: vi.fn(),
  };

  return { chain, returningResult, db };
});

vi.mock('@/db', () => ({ db }));

import { orderRoutes } from '@/modules/order/order.routes';

const USER_ID = 'user-1';

function userHeader(app: FastifyInstance) {
  return { authorization: `Bearer ${app.jwt.sign({ id: USER_ID })}` };
}
function adminHeader(app: FastifyInstance) {
  return { authorization: `Bearer ${app.jwt.sign({ id: 'admin-1', role: 'ADMIN' })}` };
}

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    orderNumber: 'ORD-001',
    userId: USER_ID,
    status: 'PENDING',
    totalAmount: 250000,
    items: [{ id: 'item-1', productId: 'prod-1', quantity: 2 }],
    createdAt: new Date('2026-08-01').toISOString(),
    paidAt: null,
    shippedAt: null,
    deliveredAt: null,
    cancelledAt: null,
    ...overrides,
  };
}

function setupChainDefaults() {
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
    values: vi.fn().mockReturnValue({ returning: returningResult }),
  });
  db.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ returning: returningResult }),
    }),
  });
  db.delete.mockReturnValue({ where: vi.fn() });
}

describe('order module (TC-030 – TC-033)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(jwt, { secret: 'test-jwt-secret-min-32-characters!!' });
    await app.register(orderRoutes, { prefix: '/api/orders' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.resetAllMocks();
    setupChainDefaults();

    db.transaction = vi.fn().mockImplementation(async (fn: Function) => {
      const tx = {
        select: vi.fn().mockReturnValue(chain),
        insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ returning: returningResult }) }),
        update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: returningResult }) }) }),
        delete: vi.fn().mockReturnValue({ where: vi.fn() }),
      };
      return fn(tx);
    });
  });

  describe('TC-030: GET /api/orders', () => {
    it('lists the current user orders with pagination', async () => {
      // Q1: select().from(orders).where(...).orderBy(...).limit(...).offset(...)  → terminal .offset()
      // Q2: select({count}).from(orders).where(...)  → terminal .where()
      // Q3: select().from(orderItems).where(inArray(...))  → terminal .where()
      // Q4: select().from(giftWrappings).where(inArray(...))  → terminal .where()
      // Q5: select({...}).from(products).where(inArray(...))  → terminal .where() (only if itemProductIds.length > 0)
      chain.offset.mockResolvedValueOnce([makeOrder()]);
      chain.where.mockReturnValueOnce(chain);    // Q1 .where() non-terminal
      chain.where.mockResolvedValueOnce([{ count: 1 }]);  // Q2 .where() terminal
      chain.where.mockResolvedValueOnce([]);      // Q3 .where() terminal (orderItems → empty → skips Q5)
      chain.where.mockResolvedValueOnce([]);      // Q4 .where() terminal (giftWrappings)

      const res = await app.inject({ method: 'GET', url: '/api/orders', headers: userHeader(app) });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.orders).toHaveLength(1);
      expect(data.pagination).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 });
    });

    it('filters by status query param', async () => {
      chain.offset.mockResolvedValueOnce([]);
      chain.where.mockReturnValueOnce(chain);
      chain.where.mockResolvedValueOnce([{ count: 0 }]);
      chain.where.mockResolvedValueOnce([]);
      chain.where.mockResolvedValueOnce([]);

      await app.inject({ method: 'GET', url: '/api/orders?status=PAID', headers: userHeader(app) });
    });

    it('returns 401 without a token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/orders' });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('TC-031: GET /api/orders/:id', () => {
    it('returns the order when owned by the user', async () => {
      // Q1: select().from(orders).where(...).limit(1)  → terminal .limit(1)
      // Q2: select({...}).from(orderItems).leftJoin(products,...).where(...)  → terminal .where()
      // Q3: select().from(giftWrappings).where(...).limit(1)  → terminal .limit(1)
      // Q4: select().from(transactions).where(...).limit(1)  → terminal .limit(1)
      chain.limit.mockResolvedValueOnce([makeOrder()]);
      chain.where.mockReturnValueOnce(chain);    // Q1 .where() non-terminal
      chain.where.mockResolvedValueOnce([{ id: 'item-1', orderId: 'order-1', productId: 'prod-1', quantity: 2 }]);  // Q2 .where() terminal
      chain.limit.mockResolvedValueOnce([]);      // Q3 .limit(1) terminal
      chain.limit.mockResolvedValueOnce([]);      // Q4 .limit(1) terminal

      const res = await app.inject({ method: 'GET', url: '/api/orders/order-1', headers: userHeader(app) });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.orderNumber).toBe('ORD-001');
    });

    it('returns 404 when the order is missing or not owned', async () => {
      chain.limit.mockResolvedValueOnce([]);

      const res = await app.inject({ method: 'GET', url: '/api/orders/order-999', headers: userHeader(app) });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('NOT_FOUND');
    });
  });

  describe('TC-032: POST /api/orders/:id/cancel', () => {
    it('cancels a pending order and restocks items', async () => {
      // Q1: select().from(orders).where(...).limit(1)  → terminal .limit(1)
      // Q2: select().from(orderItems).where(...)  → terminal .where()
      chain.limit.mockResolvedValueOnce([makeOrder({ status: 'PENDING' })]);
      chain.where.mockReturnValueOnce(chain);    // Q1 .where() non-terminal
      chain.where.mockResolvedValueOnce([{ id: 'item-1', productId: 'prod-1', quantity: 2 }]);  // Q2 .where() terminal

      const res = await app.inject({
        method: 'POST',
        url: '/api/orders/order-1/cancel',
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(db.transaction).toHaveBeenCalled();
    });

    it('rejects cancellation of an already shipped order', async () => {
      chain.limit.mockResolvedValueOnce([makeOrder({ status: 'SHIPPED' })]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/orders/order-1/cancel',
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('CANNOT_CANCEL');
      expect(db.transaction).not.toHaveBeenCalled();
    });

    it('returns 404 when the order does not exist', async () => {
      chain.limit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/orders/ghost/cancel',
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('TC-033: GET /api/orders/:id/tracking', () => {
    it('returns a status timeline', async () => {
      chain.limit.mockResolvedValueOnce([
        makeOrder({ status: 'PAID', paidAt: new Date('2026-08-02').toISOString() }),
      ]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/orders/order-1/tracking',
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.currentStatus).toBe('PAID');
      expect(data.timeline.find((t: any) => t.status === 'PAID').completed).toBe(true);
    });

    it('appends a CANCELLED step for cancelled orders', async () => {
      chain.limit.mockResolvedValueOnce([
        makeOrder({ status: 'CANCELLED', cancelledAt: new Date('2026-08-03').toISOString() }),
      ]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/orders/order-1/tracking',
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.timeline.some((t: any) => t.status === 'CANCELLED')).toBe(true);
    });

    it('returns 404 when the order is missing', async () => {
      chain.limit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/orders/ghost/tracking',
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('admin order management', () => {
    it('rejects admin listing for non-admin users (403)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/orders/admin/all',
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe('FORBIDDEN');
    });

    it('lists all orders for an admin with search', async () => {
      // Q1: select().from(orders).where(...).orderBy(...).limit(...).offset(...)  → terminal .offset()
      // Q2: select({count}).from(orders).where(...)  → terminal .where()
      // Q3: select({...}).from(users).where(inArray(...))  → terminal .where()
      // Q4: select().from(orderItems).where(inArray(...))  → terminal .where()
      // Q5: select({...}).from(products).where(inArray(...))  → terminal .where()
      chain.offset.mockResolvedValueOnce([makeOrder()]);
      chain.where.mockReturnValueOnce(chain);    // Q1 .where() non-terminal
      chain.where.mockResolvedValueOnce([{ count: 1 }]);  // Q2 .where() terminal
      chain.where.mockResolvedValueOnce([]);      // Q3 .where() terminal (users)
      chain.where.mockResolvedValueOnce([]);      // Q4 .where() terminal (orderItems)
      chain.where.mockResolvedValueOnce([]);      // Q5 .where() terminal (products)

      const res = await app.inject({
        method: 'GET',
        url: '/api/orders/admin/all?status=PAID&search=ORD',
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.orders).toHaveLength(1);
    });

    it('updates order status to SHIPPED and stamps tracking info', async () => {
      // Q1: select().from(orders).where(...).limit(1)  → terminal .limit(1)
      chain.limit.mockResolvedValueOnce([makeOrder()]);
      returningResult.mockResolvedValueOnce([makeOrder({ status: 'SHIPPED' })]);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/orders/admin/order-1/status',
        headers: adminHeader(app),
        payload: { status: 'SHIPPED', trackingNumber: 'JNE123', courier: 'JNE' },
      });

      expect(res.statusCode).toBe(200);
      expect(db.update).toHaveBeenCalled();
      expect(res.json().data.status).toBe('SHIPPED');
    });

    it('returns 404 when updating a missing order', async () => {
      chain.limit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'PUT',
        url: '/api/orders/admin/ghost/status',
        headers: adminHeader(app),
        payload: { status: 'PAID' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 400 VALIDATION_ERROR for an invalid status value (M2)', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/api/orders/admin/order-1/status',
        headers: adminHeader(app),
        payload: { status: 'NOT_A_STATUS' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
      expect(db.update).not.toHaveBeenCalled();
    });
  });
});
