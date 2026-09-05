import { FastifyInstance } from 'fastify';
import { eq, and, count } from 'drizzle-orm';
import { db } from '../../db';
import { subscriptions } from '../../db/schema/subscriptions';
import { products } from '../../db/schema/products';
import { handleRouteError } from '../../lib/errors';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { createSubscriptionSchema } from './subscription.schema';

export async function subscriptionRoutes(app: FastifyInstance) {
  // ==================== GET USER SUBSCRIPTIONS ====================
  app.get('/', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const userSubscriptions = await db.query.subscriptions.findMany({
      where: eq(subscriptions.userId, request.userId!),
      orderBy: (subscriptions, { desc }) => [desc(subscriptions.createdAt)],
      with: {
        product: {
          with: {
            category: true,
          },
        },
      },
    });

    return reply.status(200).send({ success: true, data: userSubscriptions });
  });

  // ==================== GET SUBSCRIPTION DETAIL ====================
  app.get('/:id', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [subscription] = await db.query.subscriptions.findMany({
      where: and(eq(subscriptions.id, id), eq(subscriptions.userId, request.userId!)),
      with: {
        product: {
          with: {
            category: true,
          },
        },
      },
      limit: 1,
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
      const [product] = await db.select().from(products).where(
        and(eq(products.id, input.productId), eq(products.status, 'ACTIVE'))
      ).limit(1);

      if (!product) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Produk tidak ditemukan' },
        });
      }

      // Cek user sudah punya subscription aktif untuk produk ini
      const [existing] = await db.query.subscriptions.findMany({
        where: and(
          eq(subscriptions.userId, request.userId!),
          eq(subscriptions.productId, input.productId),
          eq(subscriptions.status, 'ACTIVE'),
        ),
        limit: 1,
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

      const [subscription] = await db.insert(subscriptions).values({
        userId: request.userId!,
        productId: input.productId,
        frequency: input.frequency,
        status: 'ACTIVE',
        nextDelivery,
      }).returning();

      // Fetch with product info
      const [fullSubscription] = await db.query.subscriptions.findMany({
        where: eq(subscriptions.id, subscription.id),
        with: {
          product: true,
        },
        limit: 1,
      });

      return reply.status(201).send({ success: true, data: fullSubscription });
    } catch (error) {
      return handleRouteError(error, reply);
    }
  });

  // ==================== PAUSE SUBSCRIPTION ====================
  app.post('/:id/pause', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [subscription] = await db.query.subscriptions.findMany({
      where: and(
        eq(subscriptions.id, id),
        eq(subscriptions.userId, request.userId!),
        eq(subscriptions.status, 'ACTIVE'),
      ),
      limit: 1,
    });

    if (!subscription) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Subscription aktif tidak ditemukan' },
      });
    }

    const [updated] = await db.update(subscriptions).set({
      status: 'PAUSED',
    }).where(eq(subscriptions.id, id)).returning();

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

    const [subscription] = await db.query.subscriptions.findMany({
      where: and(
        eq(subscriptions.id, id),
        eq(subscriptions.userId, request.userId!),
        eq(subscriptions.status, 'PAUSED'),
      ),
      limit: 1,
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

    const [updated] = await db.update(subscriptions).set({
      status: 'ACTIVE',
      nextDelivery,
    }).where(eq(subscriptions.id, id)).returning();

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

    const [subscription] = await db.query.subscriptions.findMany({
      where: and(eq(subscriptions.id, id), eq(subscriptions.userId, request.userId!)),
      limit: 1,
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

    const [updated] = await db.update(subscriptions).set({
      status: 'CANCELLED',
    }).where(eq(subscriptions.id, id)).returning();

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
    const offset = (pageNum - 1) * limitNum;

    const whereClause = status ? eq(subscriptions.status, status as any) : undefined;

    const [allSubscriptions, totalResult] = await Promise.all([
      db.query.subscriptions.findMany({
        where: whereClause,
        orderBy: (subscriptions, { desc }) => [desc(subscriptions.createdAt)],
        limit: limitNum,
        offset,
        with: {
          user: {
            columns: { id: true, name: true, email: true },
          },
          product: {
            columns: { id: true, name: true, price: true },
          },
        },
      }),
      db.select({ count: count() }).from(subscriptions).where(whereClause),
    ]);

    const total = totalResult[0]?.count ?? 0;

    return reply.status(200).send({
      success: true,
      data: {
        subscriptions: allSubscriptions,
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
