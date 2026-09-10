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
        .mockResolvedValueOnce([{ count: 50 }])    // Q2 ordersThisMonth
        .mockResolvedValueOnce([{ count: 200 }])   // Q3 totalProducts
        .mockResolvedValueOnce([{ count: 10 }])    // Q5 totalSubscriptions
        .mockResolvedValueOnce([{ total: 5000000 }]) // Q6 revenueThisMonth
        .mockResolvedValueOnce([{ gross: 5000000, discount: 0, shipping: 0, total: 5000000, orderCount: 100 }]); // Q7 revenueTotals
      chain.limit
        .mockResolvedValueOnce([{ id: 'o1', orderNumber: 'ORD-001', status: 'PAID', totalAmount: 250000, createdAt: '2026-08-10', user: { name: 'Budi', email: 'budi@example.com' } }]) // Q8 recentOrders
        .mockResolvedValueOnce([{ productId: 'p1', count: 5, totalQty: 12 }]); // Q9 topProducts
      // Q10 (sequential): .select({...}).from(products).where(inArray(...)) -> terminal .where()
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
      // Grouping is done in SQL; the query returns pre-aggregated bucket rows
      // ({date, orders, revenue, gross, discount}). Terminal at .orderBy().
      chain.orderBy.mockResolvedValueOnce([
        { date: '2026-08-10', orders: 2, revenue: 300000, gross: 300000, discount: 0 },
        { date: '2026-08-11', orders: 1, revenue: 150000, gross: 150000, discount: 0 },
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
      //   Q1 statsRows: .select({total,active,lowStock,outOfStock}).from(products) -> terminal .from()
      //   Q2 topByRevenue: .from(orderItems).innerJoin().leftJoin().where().groupBy().orderBy().limit(10) -> terminal .limit()
      //   Q3 byCategory: .from(orderItems).innerJoin().leftJoin().leftJoin().where().groupBy().orderBy() -> terminal .orderBy()
      // ])
      chain.from.mockResolvedValueOnce([{ total: 50, active: 45, lowStock: 3, outOfStock: 2 }]); // Q1
      chain.orderBy
        .mockReturnValueOnce(chain) // Q2 .orderBy() (non-terminal, before .limit)
        .mockResolvedValueOnce([{ categoryId: 'c1', name: 'Parfum', revenue: 500000, qty: 30 }]); // Q3 terminal
      chain.limit.mockResolvedValueOnce([
        { productId: 'p1', name: 'Amber', revenue: 500000, qty: 30, orderCount: 10 },
      ]); // Q2 terminal

      const res = await app.inject({
        method: 'GET',
        url: '/api/reports/products',
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.stats.totalProducts).toBe(50);
      expect(data.topProducts[0]).toMatchObject({ productId: 'p1', qty: 30, orderCount: 10 });
    });
  });

  describe('GET /api/reports/customers', () => {
    // getCustomerReport Promise.all order:
    //   Q1 totalUsers      .from(users)                         -> terminal .from()
    //   Q2 newUsersInRange .from(users).where(and(...))         -> terminal .where()
    //   Q3 usersWithOrders .from(orders).where(paid)            -> terminal .where()
    //   Q4 subsByStatus    .from(subscriptions).groupBy(...)    -> terminal .groupBy()
    //   Q5 new-vs-returning db.execute(sql`...`)                -> terminal db.execute
    //   Q6 topCustomers    .from(orders).innerJoin().where().groupBy().orderBy().limit(10) -> terminal .limit()
    it('returns customer stats with a conversion rate', async () => {
      chain.from.mockResolvedValueOnce([{ count: 100 }]);        // Q1 totalUsers
      chain.where
        .mockResolvedValueOnce([{ count: 20 }])                  // Q2 newUsersInRange
        .mockResolvedValueOnce([{ count: 100 }]);                // Q3 usersWithOrders
      chain.groupBy.mockResolvedValueOnce([]);                   // Q4 subsByStatus
      db.execute.mockResolvedValueOnce([{ new_customers: 40, returning_customers: 60 }]); // Q5
      chain.limit.mockResolvedValueOnce([]);                     // Q6 topCustomers

      const res = await app.inject({
        method: 'GET',
        url: '/api/reports/customers',
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.stats.totalUsers).toBe(100);
      expect(data.stats.conversionRate).toBe(100);
    });

    it('reports a 0% conversion rate when there are no customers', async () => {
      chain.from.mockResolvedValueOnce([{ count: 0 }]);          // Q1
      chain.where
        .mockResolvedValueOnce([{ count: 0 }])                   // Q2
        .mockResolvedValueOnce([{ count: 0 }]);                  // Q3
      chain.groupBy.mockResolvedValueOnce([]);                   // Q4
      db.execute.mockResolvedValueOnce([{ new_customers: 0, returning_customers: 0 }]); // Q5
      chain.limit.mockResolvedValueOnce([]);                     // Q6

      const res = await app.inject({
        method: 'GET',
        url: '/api/reports/customers',
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.stats.conversionRate).toBe(0);
    });
  });
});
