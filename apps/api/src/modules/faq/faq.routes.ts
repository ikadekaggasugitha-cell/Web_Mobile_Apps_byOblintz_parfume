import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { handleRouteError } from '../../lib/errors';
import { requireAdmin } from '../../middleware/auth';
import { createFaqSchema, updateFaqSchema } from './faq.schema';

export async function faqRoutes(app: FastifyInstance) {
  // ==================== ADMIN: LIST ALL FAQ ====================
  app.get('/admin/all', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { page = '1', limit = '50', category } = request.query as {
      page?: string;
      limit?: string;
      category?: string;
    };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (category) where.category = category;

    const [faqs, total] = await Promise.all([
      prisma.faq.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limitNum,
      }),
      prisma.faq.count({ where }),
    ]);

    return reply.status(200).send({
      success: true,
      data: {
        faqs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  });

  // ==================== ADMIN: CREATE FAQ ====================
  app.post('/admin', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    try {
      const input = createFaqSchema.parse(request.body);

      const faq = await prisma.faq.create({
        data: {
          question: input.question,
          answer: input.answer,
          category: input.category,
          sortOrder: input.sortOrder ?? 0,
          isActive: input.isActive,
        },
      });

      return reply.status(201).send({ success: true, data: faq });
    } catch (error) {
      return handleRouteError(error, reply);
    }
  });

  // ==================== ADMIN: UPDATE FAQ ====================
  app.put('/admin/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const faq = await prisma.faq.findUnique({ where: { id } });
    if (!faq) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'FAQ tidak ditemukan' },
      });
    }

    try {
      const input = updateFaqSchema.parse(request.body);

      const updated = await prisma.faq.update({
        where: { id },
        data: {
          ...(input.question !== undefined && { question: input.question }),
          ...(input.answer !== undefined && { answer: input.answer }),
          ...(input.category !== undefined && { category: input.category }),
          ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
        },
      });

      return reply.status(200).send({ success: true, data: updated });
    } catch (error) {
      return handleRouteError(error, reply);
    }
  });

  // ==================== ADMIN: DELETE FAQ ====================
  app.delete('/admin/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const faq = await prisma.faq.findUnique({ where: { id } });
    if (!faq) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'FAQ tidak ditemukan' },
      });
    }

    await prisma.faq.delete({ where: { id } });

    return reply.status(200).send({
      success: true,
      data: { message: 'FAQ berhasil dihapus' },
    });
  });

  // ==================== ADMIN: REORDER FAQ ====================
  app.put('/admin/reorder', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { ids } = request.body as { ids: string[] };

    if (!Array.isArray(ids)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'IDs harus berupa array' },
      });
    }

    await prisma.$transaction(
      ids.map((id, index) =>
        prisma.faq.update({
          where: { id },
          data: { sortOrder: index + 1 },
        })
      )
    );

    return reply.status(200).send({
      success: true,
      data: { message: 'Urutan FAQ diperbarui' },
    });
  });
}
