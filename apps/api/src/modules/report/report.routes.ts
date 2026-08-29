import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { requireAdmin } from '../../middleware/auth';

export async function reportRoutes(app: FastifyInstance) {
  // ==================== DASHBOARD STATS ====================
  app.get('/dashboard', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalOrders,
      ordersThisMonth,
      totalProducts,
      totalUsers,
      totalSubscriptions,
      revenueThisMonth,
      recentOrders,
      topProducts,
    ] = await Promise.all([
      // Total orders
      prisma.order.count(),
      // Orders this month
      prisma.order.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      // Total products
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      // Total users
      prisma.user.count(),
      // Active subscriptions
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      // Revenue this month
      prisma.order.aggregate({
        where: {
          status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
          createdAt: { gte: startOfMonth },
        },
        _sum: { totalAmount: true },
      }),
      // Recent orders
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: { select: { name: true, email: true } },
          items: { select: { quantity: true } },
        },
      }),
      // Top products by order count
      prisma.orderItem.groupBy({
        by: ['productId'],
        _count: { id: true },
        _sum: { quantity: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
    ]);

    // Resolve product names for top products
    const topProductIds = topProducts.map((tp) => tp.productId);
    const topProductDetails = await prisma.product.findMany({
      where: { id: { in: topProductIds } },
      select: { id: true, name: true, price: true },
    });
    const topProductMap = new Map(topProductDetails.map((p) => [p.id, p]));

    return reply.status(200).send({
      success: true,
      data: {
        stats: {
          totalOrders,
          ordersThisMonth,
          totalProducts,
          totalUsers,
          totalSubscriptions,
          revenueThisMonth: Number(revenueThisMonth._sum.totalAmount || 0),
        },
        recentOrders,
        topProducts: topProducts.map((tp) => ({
          ...topProductMap.get(tp.productId),
          orderCount: tp._count.id,
          totalSold: tp._sum.quantity,
        })),
      },
    });
  });

  // ==================== SALES REPORT (BY PERIOD) ====================
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

    const orders = await prisma.order.findMany({
      where: {
        status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        createdAt: { gte: start, lte: end },
      },
      select: {
        createdAt: true,
        totalAmount: true,
        status: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by period
    const grouped: Record<string, { count: number; revenue: number }> = {};

    orders.forEach((order) => {
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

    // Convert to array
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

  // ==================== PRODUCT REPORT ====================
  app.get('/products', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const [
      totalProducts,
      activeProducts,
      lowStock,
      outOfStock,
      topSelling,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.product.count({ where: { status: 'ACTIVE', stock: { lte: 5, gt: 0 } } }),
      prisma.product.count({ where: { stock: 0 } }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        _count: { id: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10,
      }),
    ]);

    const topProductIds = topSelling.map((tp) => tp.productId);
    const topProductDetails = await prisma.product.findMany({
      where: { id: { in: topProductIds } },
      select: { id: true, name: true, price: true, stock: true },
    });
    const topProductMap = new Map(topProductDetails.map((p) => [p.id, p]));

    return reply.status(200).send({
      success: true,
      data: {
        stats: { totalProducts, activeProducts, lowStock, outOfStock },
        topSelling: topSelling.map((tp) => ({
          ...topProductMap.get(tp.productId),
          totalSold: tp._sum.quantity,
          orderCount: tp._count.id,
        })),
      },
    });
  });

  // ==================== USER REPORT ====================
  app.get('/users', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      newUsersThisMonth,
      usersWithOrders,
      usersWithSubscriptions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.user.count({
        where: { orders: { some: {} } },
      }),
      prisma.user.count({
        where: { subscriptions: { some: { status: 'ACTIVE' } } },
      }),
    ]);

    return reply.status(200).send({
      success: true,
      data: {
        totalUsers,
        newUsersThisMonth,
        usersWithOrders,
        usersWithSubscriptions,
        conversionRate: totalUsers > 0 ? (usersWithOrders / totalUsers) * 100 : 0,
      },
    });
  });
}
