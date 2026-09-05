import { FastifyInstance } from 'fastify';
import { db } from '../../db';
import { faqs } from '../../db/schema/cms';
import { eq, and, asc, desc, count } from 'drizzle-orm';
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

    const where = category ? eq(faqs.category, category) : undefined;

    const [faqsResult, totalResult] = await Promise.all([
      db
        .select()
        .from(faqs)
        .where(where)
        .orderBy(asc(faqs.sortOrder), desc(faqs.createdAt))
        .limit(limitNum)
        .offset(skip),
      db
        .select({ count: count() })
        .from(faqs)
        .where(where),
    ]);

    const total = totalResult[0].count;

    return reply.status(200).send({
      success: true,
      data: {
        faqs: faqsResult,
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

      const result = await db
        .insert(faqs)
        .values({
          question: input.question,
          answer: input.answer,
          category: input.category,
          sortOrder: input.sortOrder ?? 0,
          isActive: input.isActive,
        })
        .returning();

      return reply.status(201).send({ success: true, data: result[0] });
    } catch (error) {
      return handleRouteError(error, reply);
    }
  });

  // ==================== ADMIN: UPDATE FAQ ====================
  app.put('/admin/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await db
      .select()
      .from(faqs)
      .where(eq(faqs.id, id))
      .limit(1);

    if (!existing[0]) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'FAQ tidak ditemukan' },
      });
    }

    try {
      const input = updateFaqSchema.parse(request.body);

      const updateData: Record<string, any> = {};
      if (input.question !== undefined) updateData.question = input.question;
      if (input.answer !== undefined) updateData.answer = input.answer;
      if (input.category !== undefined) updateData.category = input.category;
      if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;

      const result = await db
        .update(faqs)
        .set(updateData)
        .where(eq(faqs.id, id))
        .returning();

      return reply.status(200).send({ success: true, data: result[0] });
    } catch (error) {
      return handleRouteError(error, reply);
    }
  });

  // ==================== ADMIN: DELETE FAQ ====================
  app.delete('/admin/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await db
      .select()
      .from(faqs)
      .where(eq(faqs.id, id))
      .limit(1);

    if (!existing[0]) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'FAQ tidak ditemukan' },
      });
    }

    await db.delete(faqs).where(eq(faqs.id, id));

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

    await db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        await tx
          .update(faqs)
          .set({ sortOrder: i + 1 })
          .where(eq(faqs.id, ids[i]));
      }
    });

    return reply.status(200).send({
      success: true,
      data: { message: 'Urutan FAQ diperbarui' },
    });
  });
}
