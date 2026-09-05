import { FastifyInstance } from 'fastify';
import { db } from '../../db';
import { reviews } from '../../db/schema/reviews';
import { users } from '../../db/schema/users';
import { products } from '../../db/schema/products';
import { orderItems } from '../../db/schema/orders';
import { orders } from '../../db/schema/orders';
import { eq, and, desc, asc, count, sql } from 'drizzle-orm';
import { handleRouteError } from '../../lib/errors';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { createReviewSchema, updateReviewSchema } from './review.schema';

export async function reviewRoutes(app: FastifyInstance) {
  // ==================== LIST REVIEWS BY PRODUCT ====================
  app.get('/product/:productId', async (request, reply) => {
    const { productId } = request.params as { productId: string };
    const { page = '1', limit = '10' } = request.query as {
      page?: string;
      limit?: string;
    };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where = and(eq(reviews.productId, productId), eq(reviews.status, 'APPROVED'));

    const [reviewsResult, totalResult, statsResult, distributionResult] = await Promise.all([
      db
        .select({
          id: reviews.id,
          userId: reviews.userId,
          productId: reviews.productId,
          rating: reviews.rating,
          comment: reviews.comment,
          images: reviews.images,
          status: reviews.status,
          createdAt: reviews.createdAt,
          user: {
            id: users.id,
            name: users.name,
            avatar: users.avatar,
          },
        })
        .from(reviews)
        .innerJoin(users, eq(reviews.userId, users.id))
        .where(where)
        .orderBy(desc(reviews.createdAt))
        .limit(limitNum)
        .offset(skip),
      db
        .select({ count: count() })
        .from(reviews)
        .where(where),
      db
        .select({
          avgRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
          total: count(),
        })
        .from(reviews)
        .where(where),
      db
        .select({
          rating: reviews.rating,
          count: count(),
        })
        .from(reviews)
        .where(and(eq(reviews.productId, productId), eq(reviews.status, 'APPROVED')))
        .groupBy(reviews.rating),
    ]);

    const total = totalResult[0].count;
    const avgRating = statsResult[0].avgRating;

    // Build distribution from groupBy result
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distributionResult.forEach((item) => {
      distribution[item.rating] = item.count;
    });

    return reply.status(200).send({
      success: true,
      data: {
        reviews: reviewsResult,
        stats: {
          average: Math.round(Number(avgRating) * 10) / 10,
          total: total,
          distribution,
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  });

  // ==================== CREATE REVIEW ====================
  app.post('/', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const input = createReviewSchema.parse(request.body);

      // Cek user punya order DELIVERED dengan produk ini
      const hasPurchased = await db
        .select()
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(
          and(
            eq(products.id, input.productId),
            eq(orders.userId, request.userId!),
            eq(orders.status, 'DELIVERED')
          )
        )
        .limit(1);

      if (!hasPurchased[0]) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'NOT_PURCHASED',
            message: 'Hanya bisa review produk yang sudah dibeli dan diterima',
          },
        });
      }

      // Cek sudah review belum
      const existingReview = await db
        .select()
        .from(reviews)
        .where(and(eq(reviews.userId, request.userId!), eq(reviews.productId, input.productId)))
        .limit(1);

      if (existingReview[0]) {
        return reply.status(409).send({
          success: false,
          error: {
            code: 'ALREADY_REVIEWED',
            message: 'Anda sudah memberikan review untuk produk ini',
          },
        });
      }

      const result = await db
        .insert(reviews)
        .values({
          userId: request.userId!,
          productId: input.productId,
          rating: input.rating,
          comment: input.comment,
          images: input.images || [],
          status: 'PENDING',
        })
        .returning();

      const newReview = result[0];

      // Fetch user data separately
      const reviewWithUser = await db
        .select({
          id: reviews.id,
          userId: reviews.userId,
          productId: reviews.productId,
          rating: reviews.rating,
          comment: reviews.comment,
          images: reviews.images,
          status: reviews.status,
          createdAt: reviews.createdAt,
          user: {
            id: users.id,
            name: users.name,
            avatar: users.avatar,
          },
        })
        .from(reviews)
        .innerJoin(users, eq(reviews.userId, users.id))
        .where(eq(reviews.id, newReview.id))
        .limit(1);

      return reply.status(201).send({ success: true, data: reviewWithUser[0] });
    } catch (error) {
      return handleRouteError(error, reply);
    }
  });

  // ==================== UPDATE REVIEW ====================
  app.put('/:id', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.id, id), eq(reviews.userId, request.userId!)))
      .limit(1);

    if (!existing[0]) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Review tidak ditemukan' },
      });
    }

    try {
      const input = updateReviewSchema.parse(request.body);

      const updateData: Record<string, any> = { status: 'PENDING' };
      if (input.rating) updateData.rating = input.rating;
      if (input.comment) updateData.comment = input.comment;
      if (input.images) updateData.images = input.images;

      const result = await db
        .update(reviews)
        .set(updateData)
        .where(eq(reviews.id, id))
        .returning();

      // Fetch with user data
      const updatedWithUser = await db
        .select({
          id: reviews.id,
          userId: reviews.userId,
          productId: reviews.productId,
          rating: reviews.rating,
          comment: reviews.comment,
          images: reviews.images,
          status: reviews.status,
          createdAt: reviews.createdAt,
          user: {
            id: users.id,
            name: users.name,
            avatar: users.avatar,
          },
        })
        .from(reviews)
        .innerJoin(users, eq(reviews.userId, users.id))
        .where(eq(reviews.id, id))
        .limit(1);

      return reply.status(200).send({ success: true, data: updatedWithUser[0] });
    } catch (error) {
      return handleRouteError(error, reply);
    }
  });

  // ==================== DELETE REVIEW ====================
  app.delete('/:id', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.id, id), eq(reviews.userId, request.userId!)))
      .limit(1);

    if (!existing[0]) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Review tidak ditemukan' },
      });
    }

    await db.delete(reviews).where(eq(reviews.id, id));

    return reply.status(200).send({
      success: true,
      data: { message: 'Review berhasil dihapus' },
    });
  });

  // ==================== ADMIN: LIST PENDING REVIEWS ====================
  app.get('/admin/pending', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { page = '1', limit = '20' } = request.query as {
      page?: string;
      limit?: string;
    };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where = eq(reviews.status, 'PENDING');

    const [reviewsResult, totalResult] = await Promise.all([
      db
        .select({
          id: reviews.id,
          userId: reviews.userId,
          productId: reviews.productId,
          rating: reviews.rating,
          comment: reviews.comment,
          images: reviews.images,
          status: reviews.status,
          createdAt: reviews.createdAt,
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
          product: {
            id: products.id,
            name: products.name,
            slug: products.slug,
          },
        })
        .from(reviews)
        .innerJoin(users, eq(reviews.userId, users.id))
        .innerJoin(products, eq(reviews.productId, products.id))
        .where(where)
        .orderBy(asc(reviews.createdAt))
        .limit(limitNum)
        .offset(skip),
      db
        .select({ count: count() })
        .from(reviews)
        .where(where),
    ]);

    const total = totalResult[0].count;

    return reply.status(200).send({
      success: true,
      data: {
        reviews: reviewsResult,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  });

  // ==================== ADMIN: APPROVE REVIEW ====================
  app.put('/admin/:id/approve', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, id))
      .limit(1);

    if (!existing[0]) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Review tidak ditemukan' },
      });
    }

    const result = await db
      .update(reviews)
      .set({ status: 'APPROVED' })
      .where(eq(reviews.id, id))
      .returning();

    return reply.status(200).send({ success: true, data: result[0] });
  });

  // ==================== ADMIN: REJECT REVIEW ====================
  app.put('/admin/:id/reject', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, id))
      .limit(1);

    if (!existing[0]) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Review tidak ditemukan' },
      });
    }

    await db.delete(reviews).where(eq(reviews.id, id));

    return reply.status(200).send({
      success: true,
      data: { message: 'Review berhasil ditolak dan dihapus' },
    });
  });
}
