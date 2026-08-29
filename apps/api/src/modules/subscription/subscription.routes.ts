import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { z } from 'zod';

const createSubscriptionSchema = z.object({
  productId: z.string().uuid(),
  frequency: z.enum(['MONTHLY', 'QUARTERLY']),
});

export async function subscriptionRoutes(app: FastifyInstance) {
  // ==================== GET USER SUBSCRIPTIONS ====================
  app.get('/', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: request.userId },
      include: {
        product: {
          include: {
            category: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.status(200).send({ success: true, data: subscriptions });
  });

  // ==================== GET SUBSCRIPTION DETAIL ====================
  app.get('/:id', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const subscription = await prisma.subscription.findFirst({
      where: { id, userId: request.userId },
      include: {
        product: {
          include: {
            category: { select: { name: true } },
          },
        },
      },
    });

    if (!subscription) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Subscription tidak ditemukan' },
      });
    }

    return reply.status(200).send({ success: true, data: subscription });
  });

  // ==================== CREATE SUBSCRIPTION ====================
  app.post('/', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const input = createSubscriptionSchema.parse(request.body);

      // Validasi produk exists
      const product = await prisma.product.findUnique({
        where: { id: input.productId, status: 'ACTIVE' },
      });

      if (!product) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Produk tidak ditemukan' },
        });
      }

      // Cek user sudah punya subscription aktif untuk produk ini
      const existing = await prisma.subscription.findFirst({
        where: {
          userId: request.userId,
          productId: input.productId,
          status: 'ACTIVE',
        },
      });

      if (existing) {
        return reply.status(409).send({
          success: false,
          error: {
            code: 'ALREADY_SUBSCRIBED',
            message: 'Anda sudah berlangganan produk ini',
          },
        });
      }

      // Hitung next delivery
      const nextDelivery = new Date();
      if (input.frequency === 'MONTHLY') {
        nextDelivery.setMonth(nextDelivery.getMonth() + 1);
      } else if (input.frequency === 'QUARTERLY') {
        nextDelivery.setMonth(nextDelivery.getMonth() + 3);
      }

      const subscription = await prisma.subscription.create({
        data: {
          userId: request.userId!,
          productId: input.productId,
          frequency: input.frequency,
          status: 'ACTIVE',
          nextDelivery,
        },
        include: {
          product: { select: { name: true, price: true, images: true } },
        },
      });

      return reply.status(201).send({ success: true, data: subscription });
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: error.message },
        });
      }
      throw error;
    }
  });

  // ==================== PAUSE SUBSCRIPTION ====================
  app.post('/:id/pause', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const subscription = await prisma.subscription.findFirst({
      where: { id, userId: request.userId, status: 'ACTIVE' },
    });

    if (!subscription) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Subscription aktif tidak ditemukan' },
      });
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: { status: 'PAUSED' },
    });

    return reply.status(200).send({
      success: true,
      data: { message: 'Subscription dijeda', status: updated.status },
    });
  });

  // ==================== RESUME SUBSCRIPTION ====================
  app.post('/:id/resume', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const subscription = await prisma.subscription.findFirst({
      where: { id, userId: request.userId, status: 'PAUSED' },
    });

    if (!subscription) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Subscription yang dijeda tidak ditemukan' },
      });
    }

    // Hitung next delivery
    const nextDelivery = new Date();
    if (subscription.frequency === 'MONTHLY') {
      nextDelivery.setMonth(nextDelivery.getMonth() + 1);
    } else if (subscription.frequency === 'QUARTERLY') {
      nextDelivery.setMonth(nextDelivery.getMonth() + 3);
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: { status: 'ACTIVE', nextDelivery },
    });

    return reply.status(200).send({
      success: true,
      data: { message: 'Subscription dilanjutkan', status: updated.status },
    });
  });

  // ==================== CANCEL SUBSCRIPTION ====================
  app.post('/:id/cancel', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const subscription = await prisma.subscription.findFirst({
      where: { id, userId: request.userId },
    });

    if (!subscription) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Subscription tidak ditemukan' },
      });
    }

    if (!['ACTIVE', 'PAUSED'].includes(subscription.status)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Subscription sudah dibatalkan' },
      });
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return reply.status(200).send({
      success: true,
      data: { message: 'Subscription dibatalkan', status: updated.status },
    });
  });

  // ==================== ADMIN: LIST ALL SUBSCRIPTIONS ====================
  app.get('/admin/all', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { page = '1', limit = '20', status } = request.query as {
      page?: string;
      limit?: string;
      status?: string;
    };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status;

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          user: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, name: true, price: true } },
        },
      }),
      prisma.subscription.count({ where }),
    ]);

    return reply.status(200).send({
      success: true,
      data: {
        subscriptions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  });
}
