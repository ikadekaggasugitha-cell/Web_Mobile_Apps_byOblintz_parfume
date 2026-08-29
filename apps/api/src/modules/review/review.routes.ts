import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
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

    const where = { productId, status: 'APPROVED' as const };

    const [reviews, total, stats, distributionResult] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
      }),
      prisma.review.count({ where }),
      prisma.review.aggregate({
        where,
        _avg: { rating: true },
        _count: { rating: true },
      }),
      prisma.review.groupBy({
        by: ['rating'],
        where: { productId, status: 'APPROVED' },
        _count: { rating: true },
      }),
    ]);

    // Build distribution from groupBy result
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distributionResult.forEach((item) => {
      distribution[item.rating] = item._count.rating;
    });

    return reply.status(200).send({
      success: true,
      data: {
        reviews,
        stats: {
          average: stats._avg.rating ? Math.round(stats._avg.rating * 10) / 10 : 0,
          total: stats._count.rating,
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
      const hasPurchased = await prisma.orderItem.findFirst({
        where: {
          product: { id: input.productId },
          order: {
            userId: request.userId,
            status: 'DELIVERED',
          },
        },
      });

      if (!hasPurchased) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'NOT_PURCHASED',
            message: 'Hanya bisa review produk yang sudah dibeli dan diterima',
          },
        });
      }

      // Cek sudah review belum
      const existingReview = await prisma.review.findFirst({
        where: {
          userId: request.userId,
          productId: input.productId,
        },
      });

      if (existingReview) {
        return reply.status(409).send({
          success: false,
          error: {
            code: 'ALREADY_REVIEWED',
            message: 'Anda sudah memberikan review untuk produk ini',
          },
        });
      }

      const review = await prisma.review.create({
        data: {
          userId: request.userId!,
          productId: input.productId,
          rating: input.rating,
          comment: input.comment,
          images: input.images || [],
          status: 'PENDING',
        },
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
      });

      return reply.status(201).send({ success: true, data: review });
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

  // ==================== UPDATE REVIEW ====================
  app.put('/:id', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const review = await prisma.review.findFirst({
      where: { id, userId: request.userId },
    });

    if (!review) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Review tidak ditemukan' },
      });
    }

    try {
      const input = updateReviewSchema.parse(request.body);

      const updated = await prisma.review.update({
        where: { id },
        data: {
          ...(input.rating && { rating: input.rating }),
          ...(input.comment && { comment: input.comment }),
          ...(input.images && { images: input.images }),
          status: 'PENDING',
        },
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
      });

      return reply.status(200).send({ success: true, data: updated });
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

  // ==================== DELETE REVIEW ====================
  app.delete('/:id', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const review = await prisma.review.findFirst({
      where: { id, userId: request.userId },
    });

    if (!review) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Review tidak ditemukan' },
      });
    }

    await prisma.review.delete({ where: { id } });

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

    const where = { status: 'PENDING' as const };

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip,
        take: limitNum,
        include: {
          user: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.review.count({ where }),
    ]);

    return reply.status(200).send({
      success: true,
      data: {
        reviews,
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

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Review tidak ditemukan' },
      });
    }

    const updated = await prisma.review.update({
      where: { id },
      data: { status: 'APPROVED' },
    });

    return reply.status(200).send({ success: true, data: updated });
  });

  // ==================== ADMIN: REJECT REVIEW ====================
  app.put('/admin/:id/reject', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Review tidak ditemukan' },
      });
    }

    await prisma.review.delete({ where: { id } });

    return reply.status(200).send({
      success: true,
      data: { message: 'Review berhasil ditolak dan dihapus' },
    });
  });
}
