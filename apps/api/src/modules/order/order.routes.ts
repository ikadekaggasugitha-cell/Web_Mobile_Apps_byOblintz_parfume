import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { requireAuth, requireAdmin } from '../../middleware/auth';

export async function orderRoutes(app: FastifyInstance) {
  // ==================== LIST USER ORDERS ====================
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
    const skip = (pageNum - 1) * limitNum;

    const where: any = { userId: request.userId };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          items: {
            include: {
              product: { select: { name: true, images: true } },
            },
          },
          giftWrapping: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    return reply.status(200).send({
      success: true,
      data: {
        orders,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  });

  // ==================== GET ORDER DETAIL ====================
  app.get('/:id', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const order = await prisma.order.findFirst({
      where: { id, userId: request.userId },
        include: {
          items: {
            include: {
              product: { select: { name: true, images: true, slug: true } },
            },
          },
          giftWrapping: true,
          transaction: true,
        },
    });

    if (!order) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Pesanan tidak ditemukan' },
      });
    }

    return reply.status(200).send({ success: true, data: order });
  });

  // ==================== CANCEL ORDER ====================
  app.post('/:id/cancel', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const order = await prisma.order.findFirst({
      where: { id, userId: request.userId },
      include: { items: true },
    });

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

    // Kembalikan stok + batalkan order
    await prisma.$transaction(async (tx: any) => {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      await tx.order.update({
        where: { id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
    });

    return reply.status(200).send({
      success: true,
      data: { message: 'Pesanan berhasil dibatalkan' },
    });
  });

  // ==================== TRACKING (status history) ====================
  app.get('/:id/tracking', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const order = await prisma.order.findFirst({
      where: { id, userId: request.userId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        createdAt: true,
        paidAt: true,
        shippedAt: true,
        deliveredAt: true,
        cancelledAt: true,
      },
    });

    if (!order) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Pesanan tidak ditemukan' },
      });
    }

    // Build timeline
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

  // ==================== ADMIN: LIST ALL ORDERS ====================
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
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: {
            include: { product: { select: { name: true } } },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return reply.status(200).send({
      success: true,
      data: {
        orders,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  });

  // ==================== ADMIN: UPDATE STATUS ====================
  app.put('/admin/:id/status', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status, trackingNumber, courier } = request.body as {
      status: string;
      trackingNumber?: string;
      courier?: string;
    };

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Pesanan tidak ditemukan' },
      });
    }

    const updateData: any = { status };

    if (status === 'PAID') updateData.paidAt = new Date();
    if (status === 'SHIPPED') {
      updateData.shippedAt = new Date();
      if (trackingNumber) updateData.trackingNumber = trackingNumber;
      if (courier) updateData.courier = courier;
    }
    if (status === 'DELIVERED') updateData.deliveredAt = new Date();
    if (status === 'CANCELLED') updateData.cancelledAt = new Date();

    const updated = await prisma.order.update({
      where: { id },
      data: updateData,
    });

    return reply.status(200).send({ success: true, data: updated });
  });
}
