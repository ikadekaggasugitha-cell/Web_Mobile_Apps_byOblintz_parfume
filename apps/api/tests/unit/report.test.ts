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
      // Promise.all([
      //   Q1: .select({count:count()}).from(orders) -> terminal .from()
      //   Q2: .select({count:count()}).from(orders).where(gte(...)) -> terminal .where()
      //   Q3: .select({count:count()}).from(products).where(eq(...)) -> terminal .where()
      //   Q4: .select({count:count()}).from(users) -> terminal .from()
      //   Q5: .select({count:count()}).from(subscriptions).where(eq(...)) -> terminal .where()
      //   Q6: .select({total:...}).from(orders).where(and(...)) -> terminal .where()
      //   Q7: .select({...}).from(orders).innerJoin(...).orderBy(...).limit(10) -> terminal .limit()
      //   Q8: .select({...}).from(orderItems).groupBy(...).orderBy(...).limit(5) -> terminal .limit()
      // ])
      // chain.from call order: Q1(terminal), Q2(non-term), Q3(non-term), Q4(terminal), Q5-Q8(non-term)
      chain.from
        .mockResolvedValueOnce([{ count: 100 }])  // call 1: Q1 terminal
        .mockReturnValueOnce(chain)                // call 2: Q2 non-terminal
        .mockReturnValueOnce(chain)                // call 3: Q3 non-terminal
        .mockResolvedValueOnce([{ count: 200 }]);  // call 4: Q4 terminal
      chain.where
        .mockResolvedValueOnce([{ count: 50 }])    // Q2
        .mockResolvedValueOnce([{ count: 200 }])   // Q3
        .mockResolvedValueOnce([{ count: 10 }])    // Q5
        .mockResolvedValueOnce([{ total: 5000000 }]); // Q6
      chain.limit
        .mockResolvedValueOnce([{ id: 'o1', orderNumber: 'ORD-001', status: 'PAID', totalAmount: 250000, createdAt: '2026-08-10', user: { name: 'Budi', email: 'budi@example.com' } }]) // Q7
        .mockResolvedValueOnce([{ productId: 'p1', count: 5, totalQty: 12 }]); // Q8
      // Q9 (sequential): .select({...}).from(products).where(inArray(...)) -> terminal .where()
      chain.where.mockResolvedValueOnce([{ id: 'p1', name: 'Amber', price: 250000 }]);

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
      // chain.from call order: Q1(terminal), Q2(non-term), Q3(non-term), Q4(terminal), Q5-Q8(non-term)
      chain.from
        .mockResolvedValueOnce([{ count: 0 }])   // call 1: Q1 terminal
        .mockReturnValueOnce(chain)               // call 2: Q2 non-terminal
        .mockReturnValueOnce(chain)               // call 3: Q3 non-terminal
        .mockResolvedValueOnce([{ count: 0 }]);   // call 4: Q4 terminal
      chain.where
        .mockResolvedValueOnce([{ count: 0 }])    // Q2
        .mockResolvedValueOnce([{ count: 0 }])    // Q3
        .mockResolvedValueOnce([{ count: 0 }])    // Q5
        .mockResolvedValueOnce([{ total: null }]); // Q6
      chain.limit
        .mockResolvedValueOnce([]) // Q7
        .mockResolvedValueOnce([]); // Q8
      // Q9 (sequential): terminal .where()
      chain.where.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/reports/dashboard',
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.stats.revenueThisMonth).toBe(0);
    });
  });

  describe('GET /api/reports/sales', () => {
    it('groups sales by day', async () => {
      // Route: .select({...}).from(orders).where(and(...)).orderBy(sql`...`) -> terminal .orderBy()
      chain.orderBy.mockResolvedValueOnce([
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
      expect(data.chart).toHaveLength(2);
    });

    it('supports weekly grouping', async () => {
      // Route: terminal .orderBy()
      chain.orderBy.mockResolvedValueOnce([
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
      // Route: terminal .orderBy()
      chain.orderBy.mockResolvedValueOnce([]);

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

  describe('GET /api/reports/products', () => {
    it('returns product stats and top sellers', async () => {
      // Promise.all([
      //   Q1: .select({count:count()}).from(products) -> terminal .from()
      //   Q2: .select({count:count()}).from(products).where(eq(products.status, 'ACTIVE')) -> terminal .where()
      //   Q3: .select({count:count()}).from(products).where(and(...lte...gt...)) -> terminal .where()
      //   Q4: .select({count:count()}).from(products).where(eq(products.stock, 0)) -> terminal .where()
      //   Q5: .select({...}).from(orderItems).groupBy(...).orderBy(...).limit(10) -> terminal .limit()
      // ])
      // Order of terminal calls: from, where, where, where, limit
      chain.from
        .mockResolvedValueOnce([{ count: 50 }]); // Q1
      chain.where
        .mockResolvedValueOnce([{ count: 50 }])  // Q2
        .mockResolvedValueOnce([{ count: 0 }])    // Q3
        .mockResolvedValueOnce([{ count: 0 }]);   // Q4
      chain.limit.mockResolvedValueOnce([{ productId: 'p1', totalQty: 30, count: 10 }]); // Q5
      // Q6 (sequential): .select({...}).from(products).where(inArray(...)) -> terminal .where()
      chain.where.mockResolvedValueOnce([{ id: 'p1', name: 'Amber', price: 250000, stock: 8 }]);

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

  describe('GET /api/reports/users', () => {
    it('returns user stats with a conversion rate', async () => {
      // Promise.all([
      //   Q1: .select({count:count()}).from(users) -> terminal .from()
      //   Q2: .select({count:count()}).from(users).where(gte(...)) -> terminal .where()
      // ])
      // chain.from: call 1 (Q1 terminal), call 2 (Q2 non-terminal), call 3 (Q3 terminal), call 4 (Q4 non-terminal)
      chain.from
        .mockResolvedValueOnce([{ count: 100 }])  // call 1: Q1 terminal
        .mockReturnValueOnce(chain);               // call 2: Q2 non-terminal
      chain.where
        .mockResolvedValueOnce([{ count: 100 }]); // Q2
      // Q3 (sequential): .select({count: sql`count(distinct ...)`}).from(orders) -> terminal .from()
      chain.from.mockResolvedValueOnce([{ count: 100 }]); // call 3: Q3 terminal
      // Q4 (sequential): .select({count: sql`count(distinct ...)`}).from(subscriptions).where(eq(...)) -> terminal .where()
      chain.where.mockResolvedValueOnce([{ count: 100 }]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/reports/users',
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.totalUsers).toBe(100);
      expect(data.conversionRate).toBe(100);
    });

    it('reports a 0% conversion rate when there are no users', async () => {
      chain.from
        .mockResolvedValueOnce([{ count: 0 }])  // call 1: Q1 terminal
        .mockReturnValueOnce(chain);             // call 2: Q2 non-terminal
      chain.where
        .mockResolvedValueOnce([{ count: 0 }]); // Q2
      // Q3: terminal .from()
      chain.from.mockResolvedValueOnce([{ count: 0 }]); // call 3: Q3 terminal
      // Q4: terminal .where()
      chain.where.mockResolvedValueOnce([{ count: 0 }]);

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
