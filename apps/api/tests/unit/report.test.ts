import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';

const prisma = vi.hoisted(() => ({
  order: { count: vi.fn(), aggregate: vi.fn(), findMany: vi.fn() },
  product: { count: vi.fn(), findMany: vi.fn() },
  user: { count: vi.fn() },
  subscription: { count: vi.fn() },
  orderItem: { groupBy: vi.fn() },
}));

vi.mock('@/config/database', () => ({ default: prisma, prisma }));

import { reportRoutes } from '@/modules/report/report.routes';

function userHeader(app: FastifyInstance) {
  return { authorization: `Bearer ${app.jwt.sign({ id: 'user-1' })}` };
}
function adminHeader(app: FastifyInstance) {
  return { authorization: `Bearer ${app.jwt.sign({ id: 'admin-1', role: 'ADMIN' })}` };
}

describe('report module', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(jwt, { secret: 'test-jwt-secret-min-32-characters!!' });
    await app.register(reportRoutes, { prefix: '/api/reports' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== DASHBOARD ====================
  describe('GET /api/reports/dashboard', () => {
    it('rejects non-admin users (403)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/reports/dashboard',
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(403);
    });

    it('returns aggregated dashboard stats', async () => {
      prisma.order.count.mockResolvedValue(100);
      prisma.product.count.mockResolvedValue(50);
      prisma.user.count.mockResolvedValue(200);
      prisma.subscription.count.mockResolvedValue(10);
      prisma.order.aggregate.mockResolvedValue({ _sum: { totalAmount: 5000000 } });
      prisma.order.findMany.mockResolvedValue([{ id: 'o1', user: { name: 'Budi' }, items: [] }]);
      prisma.orderItem.groupBy.mockResolvedValue([
        { productId: 'p1', _count: { id: 5 }, _sum: { quantity: 12 } },
      ]);
      prisma.product.findMany.mockResolvedValue([{ id: 'p1', name: 'Amber', price: 250000 }]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/reports/dashboard',
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.stats.totalOrders).toBe(100);
      expect(data.stats.totalUsers).toBe(200);
      expect(data.stats.revenueThisMonth).toBe(5000000);
      expect(data.topProducts[0]).toMatchObject({ id: 'p1', name: 'Amber', orderCount: 5, totalSold: 12 });
    });

    it('defaults revenue to 0 when there are no paid orders', async () => {
      prisma.order.count.mockResolvedValue(0);
      prisma.product.count.mockResolvedValue(0);
      prisma.user.count.mockResolvedValue(0);
      prisma.subscription.count.mockResolvedValue(0);
      prisma.order.aggregate.mockResolvedValue({ _sum: { totalAmount: null } });
      prisma.order.findMany.mockResolvedValue([]);
      prisma.orderItem.groupBy.mockResolvedValue([]);
      prisma.product.findMany.mockResolvedValue([]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/reports/dashboard',
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.stats.revenueThisMonth).toBe(0);
    });
  });

  // ==================== SALES ====================
  describe('GET /api/reports/sales', () => {
    it('groups sales by day', async () => {
      prisma.order.findMany.mockResolvedValue([
        { createdAt: '2026-08-10T10:00:00.000Z', totalAmount: 100000, status: 'PAID' },
        { createdAt: '2026-08-10T12:00:00.000Z', totalAmount: 200000, status: 'DELIVERED' },
        { createdAt: '2026-08-11T09:00:00.000Z', totalAmount: 150000, status: 'PAID' },
      ]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/reports/sales?period=daily',
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.summary.totalOrders).toBe(3);
      expect(data.summary.totalRevenue).toBe(450000);
      expect(data.summary.avgOrderValue).toBe(150000);
      expect(data.chart).toHaveLength(2); // two distinct days
    });

    it('supports weekly grouping', async () => {
      prisma.order.findMany.mockResolvedValue([
        { createdAt: '2026-08-10T10:00:00.000Z', totalAmount: 100000, status: 'PAID' },
      ]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/reports/sales?period=weekly',
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.period).toBe('weekly');
    });

    it('supports monthly grouping and handles an empty range', async () => {
      prisma.order.findMany.mockResolvedValue([]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/reports/sales?period=monthly&startDate=2026-01-01&endDate=2026-02-01',
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.summary.totalOrders).toBe(0);
      expect(data.summary.avgOrderValue).toBe(0);
      expect(data.chart).toHaveLength(0);
    });
  });

  // ==================== PRODUCTS ====================
  describe('GET /api/reports/products', () => {
    it('returns product stats and top sellers', async () => {
      prisma.product.count.mockResolvedValue(50);
      prisma.orderItem.groupBy.mockResolvedValue([
        { productId: 'p1', _sum: { quantity: 30 }, _count: { id: 10 } },
      ]);
      prisma.product.findMany.mockResolvedValue([{ id: 'p1', name: 'Amber', price: 250000, stock: 8 }]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/reports/products',
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.stats.totalProducts).toBe(50);
      expect(data.topSelling[0]).toMatchObject({ id: 'p1', totalSold: 30, orderCount: 10 });
    });
  });

  // ==================== USERS ====================
  describe('GET /api/reports/users', () => {
    it('returns user stats with a conversion rate', async () => {
      prisma.user.count.mockResolvedValue(100);

      const res = await app.inject({
        method: 'GET',
        url: '/api/reports/users',
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.totalUsers).toBe(100);
      // all four counts mocked to 100 → usersWithOrders/totalUsers = 100%
      expect(data.conversionRate).toBe(100);
    });

    it('reports a 0% conversion rate when there are no users', async () => {
      prisma.user.count.mockResolvedValue(0);

      const res = await app.inject({
        method: 'GET',
        url: '/api/reports/users',
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.conversionRate).toBe(0);
    });
  });
});
