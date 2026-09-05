import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db';
import { orders, orderItems, transactions, giftWrappings, products, users } from '../../db/schema';
import { eq, and, or, desc, ilike, count, sql, inArray } from 'drizzle-orm';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { handleRouteError } from '../../lib/errors';

const ORDER_STATUSES = [
  'PENDING',
  'WAITING_PAYMENT',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
] as const;

const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  trackingNumber: z.string().optional(),
  courier: z.string().optional(),
});

export async function orderRoutes(app: FastifyInstance) {
  app.get('/', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { page = '1', limit = '10', status } = request.query as {
      page?: string;
      limit?: string;
      status?: string;
    };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [eq(orders.userId, request.userId!)];
    if (status) conditions.push(eq(orders.status, status as any));

    const whereClause = and(...conditions);

    const [orderList, countResult] = await Promise.all([
      db.select().from(orders).where(whereClause).orderBy(desc(orders.createdAt)).limit(limitNum).offset(offset),
      db.select({ count: count() }).from(orders).where(whereClause),
    ]);

    const orderIds = orderList.map((o) => o.id);

    const [orderItemsList, giftWrappingList] = await Promise.all([
      orderIds.length > 0
        ? db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))
        : Promise.resolve([] as typeof orderItems.$inferSelect[]),
      orderIds.length > 0
        ? db.select().from(giftWrappings).where(inArray(giftWrappings.orderId, orderIds))
        : Promise.resolve([] as typeof giftWrappings.$inferSelect[]),
    ]);

    const itemProductIds = [...new Set(orderItemsList.map((i) => i.productId))];
    const itemProducts = itemProductIds.length > 0
      ? await db.select({
          id: products.id,
          name: products.name,
          images: products.images,
        }).from(products).where(inArray(products.id, itemProductIds))
      : [];

    const itemProductMap = new Map(itemProducts.map((p) => [p.id, p]));
    const giftWrapMap = new Map(giftWrappingList.map((gw) => [gw.orderId, gw]));

    const ordersWithIncludes = orderList.map((order) => ({
      ...order,
      items: orderItemsList
        .filter((item) => item.orderId === order.id)
        .map((item) => ({
          ...item,
          product: itemProductMap.get(item.productId) || null,
        })),
      giftWrapping: giftWrapMap.get(order.id) || null,
    }));

    return reply.status(200).send({
      success: true,
      data: {
        orders: ordersWithIncludes,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: countResult[0]?.count || 0,
          totalPages: Math.ceil((countResult[0]?.count || 0) / limitNum),
        },
      },
    });
  });

  app.get('/:id', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [order] = await db.select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.userId, request.userId!)))
      .limit(1);

    if (!order) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Pesanan tidak ditemukan' },
      });
    }

    const [items, giftWrapping, transaction] = await Promise.all([
      db.select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        productId: orderItems.productId,
        quantity: orderItems.quantity,
        price: orderItems.price,
        giftWrap: orderItems.giftWrap,
        giftWrapPrice: orderItems.giftWrapPrice,
        product: {
          id: products.id,
          name: products.name,
          images: products.images,
          slug: products.slug,
        },
      }).from(orderItems)
        .leftJoin(products, eq(orderItems.productId, products.id))
        .where(eq(orderItems.orderId, id)),
      db.select().from(giftWrappings).where(eq(giftWrappings.orderId, id)).limit(1),
      db.select().from(transactions).where(eq(transactions.orderId, id)).limit(1),
    ]);

    return reply.status(200).send({
      success: true,
      data: {
        ...order,
        items,
        giftWrapping: giftWrapping[0] || null,
        transaction: transaction[0] || null,
      },
    });
  });

  app.post('/:id/cancel', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [order] = await db.select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.userId, request.userId!)))
      .limit(1);

    if (!order) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Pesanan tidak ditemukan' },
      });
    }

    if (!['PENDING', 'WAITING_PAYMENT'].includes(order.status)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'CANNOT_CANCEL',
          message: 'Pesanan tidak bisa dibatalkan (sudah diproses/dikirim)',
        },
      });
    }

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));

    await db.transaction(async (tx) => {
      for (const item of items) {
        await tx.update(products)
          .set({ stock: sql`${products.stock} + ${item.quantity}` })
          .where(eq(products.id, item.productId));
      }

      await tx.update(orders)
        .set({ status: 'CANCELLED', cancelledAt: new Date() })
        .where(eq(orders.id, id));
    });

    return reply.status(200).send({
      success: true,
      data: { message: 'Pesanan berhasil dibatalkan' },
    });
  });

  app.get('/:id/tracking', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [order] = await db.select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      createdAt: orders.createdAt,
      paidAt: orders.paidAt,
      shippedAt: orders.shippedAt,
      deliveredAt: orders.deliveredAt,
      cancelledAt: orders.cancelledAt,
    })
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.userId, request.userId!)))
      .limit(1);

    if (!order) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Pesanan tidak ditemukan' },
      });
    }

    const timeline = [
      {
        status: 'ORDER_PLACED',
        label: 'Pesanan dibuat',
        date: order.createdAt,
        completed: true,
      },
      {
        status: 'PAID',
        label: 'Pembayaran diterima',
        date: order.paidAt,
        completed: !!order.paidAt,
      },
      {
        status: 'PROCESSING',
        label: 'Sedang diproses',
        date: null,
        completed: ['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status),
      },
      {
        status: 'SHIPPED',
        label: 'Dikirim',
        date: order.shippedAt,
        completed: !!order.shippedAt,
      },
      {
        status: 'DELIVERED',
        label: 'Diterima',
        date: order.deliveredAt,
        completed: !!order.deliveredAt,
      },
    ];

    if (order.status === 'CANCELLED') {
      timeline.push({
        status: 'CANCELLED',
        label: 'Dibatalkan',
        date: order.cancelledAt,
        completed: true,
      });
    }

    return reply.status(200).send({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        currentStatus: order.status,
        timeline,
      },
    });
  });

  app.get('/admin/all', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const {
      page = '1',
      limit = '20',
      status,
      search,
    } = request.query as {
      page?: string;
      limit?: string;
      status?: string;
      search?: string;
    };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    if (status) conditions.push(eq(orders.status, status as any));
    if (search) {
      conditions.push(or(
        ilike(orders.orderNumber, `%${search}%`),
      ));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [orderList, countResult] = await Promise.all([
      db.select().from(orders).where(whereClause).orderBy(desc(orders.createdAt)).limit(limitNum).offset(offset),
      db.select({ count: count() }).from(orders).where(whereClause),
    ]);

    const orderUserIds = [...new Set(orderList.map((o) => o.userId))];
    const orderUsers = orderUserIds.length > 0
      ? await db.select({
          id: users.id,
          name: users.name,
          email: users.email,
        }).from(users).where(inArray(users.id, orderUserIds))
      : [];

    const orderUserMap = new Map(orderUsers.map((u) => [u.id, u]));

    const orderIds = orderList.map((o) => o.id);
    const orderItemsList = orderIds.length > 0
      ? await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))
      : [];

    const itemProductIds = [...new Set(orderItemsList.map((i) => i.productId))];
    const itemProducts = itemProductIds.length > 0
      ? await db.select({ id: products.id, name: products.name }).from(products).where(inArray(products.id, itemProductIds))
      : [];
    const itemProductMap = new Map(itemProducts.map((p) => [p.id, p]));

    const ordersWithIncludes = orderList.map((order) => ({
      ...order,
      user: orderUserMap.get(order.userId) || null,
      items: orderItemsList
        .filter((item) => item.orderId === order.id)
        .map((item) => ({
          ...item,
          product: itemProductMap.get(item.productId) || null,
        })),
    }));

    return reply.status(200).send({
      success: true,
      data: {
        orders: ordersWithIncludes,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: countResult[0]?.count || 0,
          totalPages: Math.ceil((countResult[0]?.count || 0) / limitNum),
        },
      },
    });
  });

  app.put('/admin/:id/status', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    let status: string;
    let trackingNumber: string | undefined;
    let courier: string | undefined;
    try {
      ({ status, trackingNumber, courier } = updateOrderStatusSchema.parse(request.body));
    } catch (error) {
      return handleRouteError(error, reply);
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Pesanan tidak ditemukan' },
      });
    }

    const updateData: Record<string, any> = { status };

    if (status === 'PAID') updateData.paidAt = new Date();
    if (status === 'SHIPPED') {
      updateData.shippedAt = new Date();
      if (trackingNumber) updateData.trackingNumber = trackingNumber;
      if (courier) updateData.courier = courier;
    }
    if (status === 'DELIVERED') updateData.deliveredAt = new Date();
    if (status === 'CANCELLED') updateData.cancelledAt = new Date();

    const [updated] = await db.update(orders)
      .set(updateData)
      .where(eq(orders.id, id))
      .returning();

    return reply.status(200).send({ success: true, data: updated });
  });
}
