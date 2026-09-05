import { FastifyInstance } from 'fastify';
import { db } from '../../db';
import { orders, orderItems, products, users, subscriptions } from '../../db/schema';
import { eq, and, inArray, gte, lte, gt, sql, count } from 'drizzle-orm';
import { requireAdmin } from '../../middleware/auth';

export async function reportRoutes(app: FastifyInstance) {
  app.get('/dashboard', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const paidStatuses = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

    const [
      totalOrdersResult,
      ordersThisMonthResult,
      totalProductsResult,
      totalUsersResult,
      totalSubscriptionsResult,
      revenueThisMonthResult,
      recentOrdersList,
      topProductsResult,
    ] = await Promise.all([
      db.select({ count: count() }).from(orders),
      db.select({ count: count() }).from(orders).where(gte(orders.createdAt, startOfMonth)),
      db.select({ count: count() }).from(products).where(eq(products.status, 'ACTIVE')),
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.status, 'ACTIVE')),
      db.select({ total: sql`sum(${orders.totalAmount})::numeric` })
        .from(orders)
        .where(and(inArray(orders.status, paidStatuses as any), gte(orders.createdAt, startOfMonth))),
      db.select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        totalAmount: orders.totalAmount,
        createdAt: orders.createdAt,
        user: {
          name: users.name,
          email: users.email,
        },
      })
        .from(orders)
        .innerJoin(users, eq(orders.userId, users.id))
        .orderBy(sql`${orders.createdAt} DESC`)
        .limit(10),
      db.select({
        productId: orderItems.productId,
        count: count(),
        totalQty: sql`sum(${orderItems.quantity})`,
      })
        .from(orderItems)
        .groupBy(orderItems.productId)
        .orderBy(sql`count(*) DESC`)
        .limit(5),
    ]);

    const topProductIds = topProductsResult.map((tp) => tp.productId);
    const topProductDetails = topProductIds.length > 0
      ? await db.select({
          id: products.id,
          name: products.name,
          price: products.price,
        }).from(products).where(inArray(products.id, topProductIds))
      : [];
    const topProductMap = new Map(topProductDetails.map((p) => [p.id, p]));

    return reply.status(200).send({
      success: true,
      data: {
        stats: {
          totalOrders: totalOrdersResult[0]?.count || 0,
          ordersThisMonth: ordersThisMonthResult[0]?.count || 0,
          totalProducts: totalProductsResult[0]?.count || 0,
          totalUsers: totalUsersResult[0]?.count || 0,
          totalSubscriptions: totalSubscriptionsResult[0]?.count || 0,
          revenueThisMonth: Number(revenueThisMonthResult[0]?.total || 0),
        },
        recentOrders: recentOrdersList,
        topProducts: topProductsResult.map((tp) => ({
          ...topProductMap.get(tp.productId),
          orderCount: tp.count,
          totalSold: tp.totalQty,
        })),
      },
    });
  });

  app.get('/sales', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { period = 'daily', startDate, endDate } = request.query as {
      period?: string;
      startDate?: string;
      endDate?: string;
    };

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const paidStatuses = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

    const orderList = await db.select({
      createdAt: orders.createdAt,
      totalAmount: orders.totalAmount,
      status: orders.status,
    })
      .from(orders)
      .where(and(inArray(orders.status, paidStatuses as any), gte(orders.createdAt, start), lte(orders.createdAt, end)))
      .orderBy(sql`${orders.createdAt} ASC`);

    const grouped: Record<string, { count: number; revenue: number }> = {};

    orderList.forEach((order) => {
      let key: string;
      const date = new Date(order.createdAt);

      if (period === 'daily') {
        key = date.toISOString().split('T')[0];
      } else if (period === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!grouped[key]) {
        grouped[key] = { count: 0, revenue: 0 };
      }
      grouped[key].count += 1;
      grouped[key].revenue += Number(order.totalAmount);
    });

    const data = Object.entries(grouped).map(([date, values]) => ({
      date,
      ...values,
    }));

    const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
    const totalOrders = data.reduce((sum, d) => sum + d.count, 0);

    return reply.status(200).send({
      success: true,
      data: {
        period,
        summary: { totalRevenue, totalOrders, avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0 },
        chart: data,
      },
    });
  });

  app.get('/products', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const [
      totalProductsResult,
      activeProductsResult,
      lowStockResult,
      outOfStockResult,
      topSellingResult,
    ] = await Promise.all([
      db.select({ count: count() }).from(products),
      db.select({ count: count() }).from(products).where(eq(products.status, 'ACTIVE')),
      db.select({ count: count() }).from(products).where(and(eq(products.status, 'ACTIVE'), lte(products.stock, 5), gt(products.stock, 0))),
      db.select({ count: count() }).from(products).where(eq(products.stock, 0)),
      db.select({
        productId: orderItems.productId,
        totalQty: sql`sum(${orderItems.quantity})`,
        count: count(),
      })
        .from(orderItems)
        .groupBy(orderItems.productId)
        .orderBy(sql`sum(${orderItems.quantity}) DESC`)
        .limit(10),
    ]);

    const topProductIds = topSellingResult.map((tp) => tp.productId);
    const topProductDetails = topProductIds.length > 0
      ? await db.select({
          id: products.id,
          name: products.name,
          price: products.price,
          stock: products.stock,
        }).from(products).where(inArray(products.id, topProductIds))
      : [];
    const topProductMap = new Map(topProductDetails.map((p) => [p.id, p]));

    return reply.status(200).send({
      success: true,
      data: {
        stats: {
          totalProducts: totalProductsResult[0]?.count || 0,
          activeProducts: activeProductsResult[0]?.count || 0,
          lowStock: lowStockResult[0]?.count || 0,
          outOfStock: outOfStockResult[0]?.count || 0,
        },
        topSelling: topSellingResult.map((tp) => ({
          ...topProductMap.get(tp.productId),
          totalSold: tp.totalQty,
          orderCount: tp.count,
        })),
      },
    });
  });

  app.get('/users', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsersResult,
      newUsersThisMonthResult,
    ] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(users).where(gte(users.createdAt, startOfMonth)),
    ]);

    // Users with orders (count distinct user_ids in orders)
    const usersWithOrdersResult = await db.select({ count: sql`count(distinct ${orders.userId})` }).from(orders);

    // Users with active subscriptions
    const usersWithSubscriptionsResult = await db.select({ count: sql`count(distinct ${subscriptions.userId})` })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'ACTIVE'));

    const totalUsers = Number(totalUsersResult[0]?.count || 0);
    const usersWithOrders = Number(usersWithOrdersResult[0]?.count || 0);

    return reply.status(200).send({
      success: true,
      data: {
        totalUsers,
        newUsersThisMonth: Number(newUsersThisMonthResult[0]?.count || 0),
        usersWithOrders,
        usersWithSubscriptions: Number(usersWithSubscriptionsResult[0]?.count || 0),
        conversionRate: totalUsers > 0 ? (usersWithOrders / totalUsers) * 100 : 0,
      },
    });
  });
}
