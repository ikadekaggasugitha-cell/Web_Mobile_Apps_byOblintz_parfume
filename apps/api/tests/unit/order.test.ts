import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';

const prisma = vi.hoisted(() => ({
  order: {
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  product: { update: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock('@/config/database', () => ({ default: prisma, prisma }));

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
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma));
    prisma.order.update.mockResolvedValue({});
    prisma.product.update.mockResolvedValue({});
  });

  // ==================== TC-030: LIST ORDERS ====================
  describe('TC-030: GET /api/orders', () => {
    it('lists the current user orders with pagination', async () => {
      prisma.order.findMany.mockResolvedValue([makeOrder()]);
      prisma.order.count.mockResolvedValue(1);

      const res = await app.inject({ method: 'GET', url: '/api/orders', headers: userHeader(app) });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.orders).toHaveLength(1);
      expect(data.pagination).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 });
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: USER_ID } })
      );
    });

    it('filters by status query param', async () => {
      prisma.order.findMany.mockResolvedValue([]);
      prisma.order.count.mockResolvedValue(0);

      await app.inject({ method: 'GET', url: '/api/orders?status=PAID', headers: userHeader(app) });

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: USER_ID, status: 'PAID' } })
      );
    });

    it('returns 401 without a token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/orders' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== TC-031: ORDER DETAIL ====================
  describe('TC-031: GET /api/orders/:id', () => {
    it('returns the order when owned by the user', async () => {
      prisma.order.findFirst.mockResolvedValue(makeOrder());

      const res = await app.inject({ method: 'GET', url: '/api/orders/order-1', headers: userHeader(app) });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.orderNumber).toBe('ORD-001');
    });

    it('returns 404 when the order is missing or not owned', async () => {
      prisma.order.findFirst.mockResolvedValue(null);

      const res = await app.inject({ method: 'GET', url: '/api/orders/order-999', headers: userHeader(app) });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('NOT_FOUND');
    });
  });

  // ==================== TC-032: CANCEL ORDER ====================
  describe('TC-032: POST /api/orders/:id/cancel', () => {
    it('cancels a pending order and restocks items', async () => {
      prisma.order.findFirst.mockResolvedValue(makeOrder({ status: 'PENDING' }));

      const res = await app.inject({
        method: 'POST',
        url: '/api/orders/order-1/cancel',
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stock: { increment: 2 } },
      });
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'CANCELLED' }) })
      );
    });

    it('rejects cancellation of an already shipped order', async () => {
      prisma.order.findFirst.mockResolvedValue(makeOrder({ status: 'SHIPPED' }));

      const res = await app.inject({
        method: 'POST',
        url: '/api/orders/order-1/cancel',
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('CANNOT_CANCEL');
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('returns 404 when the order does not exist', async () => {
      prisma.order.findFirst.mockResolvedValue(null);

      const res = await app.inject({
        method: 'POST',
        url: '/api/orders/ghost/cancel',
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== TC-033: TRACKING ====================
  describe('TC-033: GET /api/orders/:id/tracking', () => {
    it('returns a status timeline', async () => {
      prisma.order.findFirst.mockResolvedValue(
        makeOrder({ status: 'PAID', paidAt: new Date('2026-08-02').toISOString() })
      );

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
      prisma.order.findFirst.mockResolvedValue(
        makeOrder({ status: 'CANCELLED', cancelledAt: new Date('2026-08-03').toISOString() })
      );

      const res = await app.inject({
        method: 'GET',
        url: '/api/orders/order-1/tracking',
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.timeline.some((t: any) => t.status === 'CANCELLED')).toBe(true);
    });

    it('returns 404 when the order is missing', async () => {
      prisma.order.findFirst.mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/api/orders/ghost/tracking',
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== ADMIN ====================
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
      prisma.order.findMany.mockResolvedValue([makeOrder()]);
      prisma.order.count.mockResolvedValue(1);

      const res = await app.inject({
        method: 'GET',
        url: '/api/orders/admin/all?status=PAID&search=ORD',
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.orders).toHaveLength(1);
    });

    it('updates order status to SHIPPED and stamps tracking info', async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrder());
      prisma.order.update.mockResolvedValue(makeOrder({ status: 'SHIPPED' }));

      const res = await app.inject({
        method: 'PUT',
        url: '/api/orders/admin/order-1/status',
        headers: adminHeader(app),
        payload: { status: 'SHIPPED', trackingNumber: 'JNE123', courier: 'JNE' },
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'SHIPPED',
            trackingNumber: 'JNE123',
            courier: 'JNE',
            shippedAt: expect.any(Date),
          }),
        })
      );
    });

    it('returns 404 when updating a missing order', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

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
      expect(prisma.order.update).not.toHaveBeenCalled();
    });
  });
});
