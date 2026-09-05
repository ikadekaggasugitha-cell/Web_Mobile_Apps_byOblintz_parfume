import { FastifyInstance } from 'fastify';
import { db } from '../../db';
import { articles } from '../../db/schema/cms';
import { sql, eq, and, or, desc, count, ilike, isNull, isNotNull } from 'drizzle-orm';
import { handleRouteError } from '../../lib/errors';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { z } from 'zod';

const articleSchema = z.object({
  title: z.string().min(3).max(200),
  content: z.string().min(10),
  excerpt: z.string().max(500).optional(),
  imageUrl: z.string().url().optional(),
  author: z.string().min(1).optional(),
  slug: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
});

export async function articleRoutes(app: FastifyInstance) {
  // ==================== LIST PUBLISHED ARTICLES (PUBLIC) ====================
  app.get('/', async (request, reply) => {
    const { page = '1', limit = '10' } = request.query as {
      page?: string;
      limit?: string;
    };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where = and(eq(articles.status, 'PUBLISHED'), isNull(articles.deletedAt));

    const [articlesResult, totalResult] = await Promise.all([
      db
        .select({
          id: articles.id,
          title: articles.title,
          slug: articles.slug,
          excerpt: articles.excerpt,
          imageUrl: articles.imageUrl,
          createdAt: articles.createdAt,
        })
        .from(articles)
        .where(where)
        .orderBy(desc(articles.createdAt))
        .limit(limitNum)
        .offset(skip),
      db
        .select({ count: count() })
        .from(articles)
        .where(where),
    ]);

    const total = totalResult[0].count;

    return reply.status(200).send({
      success: true,
      data: {
        articles: articlesResult,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      },
    });
  });

  // ==================== GET ARTICLE BY SLUG ====================
  app.get('/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const result = await db
      .select()
      .from(articles)
      .where(eq(articles.slug, slug))
      .limit(1);

    const article = result[0];

    if (!article || article.status !== 'PUBLISHED' || article.deletedAt) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Artikel tidak ditemukan' },
      });
    }

    return reply.status(200).send({ success: true, data: article });
  });

  // ==================== ADMIN: LIST ALL ARTICLES ====================
  app.get('/admin/all', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { page = '1', limit = '20', status, search, deleted } = request.query as {
      page?: string;
      limit?: string;
      status?: string;
      search?: string;
      deleted?: string;
    };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // `?deleted=true` returns only trashed rows; otherwise only active rows.
    const conditions: any[] = [
      deleted === 'true' ? isNotNull(articles.deletedAt) : isNull(articles.deletedAt),
    ];
    if (status) conditions.push(eq(articles.status, status));
    if (search) conditions.push(ilike(articles.title, `%${search}%`));

    const where = and(...conditions);

    const [articlesResult, totalResult] = await Promise.all([
      db
        .select()
        .from(articles)
        .where(where)
        .orderBy(desc(articles.createdAt))
        .limit(limitNum)
        .offset(skip),
      db
        .select({ count: count() })
        .from(articles)
        .where(where),
    ]);

    const total = totalResult[0].count;

    return reply.status(200).send({
      success: true,
      data: {
        articles: articlesResult,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      },
    });
  });

  // ==================== ADMIN: CREATE ARTICLE ====================
  app.post('/admin', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    try {
      const input = articleSchema.parse(request.body);

      const slug = input.slug || input.title
        .toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-');

      const existing = await db
        .select()
        .from(articles)
        .where(eq(articles.slug, slug))
        .limit(1);

      if (existing[0]) {
        return reply.status(409).send({
          success: false,
          error: { code: 'CONFLICT', message: 'Slug artikel sudah ada' },
        });
      }

      const result = await db
        .insert(articles)
        .values({
          title: input.title,
          slug,
          content: input.content,
          excerpt: input.excerpt,
          imageUrl: input.imageUrl,
          author: input.author || 'Admin',
          status: input.status,
        })
        .returning();

      return reply.status(201).send({ success: true, data: result[0] });
    } catch (error) {
      return handleRouteError(error, reply);
    }
  });

  // ==================== ADMIN: UPDATE ARTICLE ====================
  app.put('/admin/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await db
      .select()
      .from(articles)
      .where(eq(articles.id, id))
      .limit(1);

    if (!existing[0]) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Artikel tidak ditemukan' },
      });
    }

    try {
      const input = articleSchema.partial().parse(request.body);

      const updateData: Record<string, any> = {};
      if (input.title) updateData.title = input.title;
      if (input.content) updateData.content = input.content;
      if (input.excerpt !== undefined) updateData.excerpt = input.excerpt;
      if (input.imageUrl !== undefined) updateData.imageUrl = input.imageUrl;
      if (input.status) updateData.status = input.status;

      const result = await db
        .update(articles)
        .set(updateData)
        .where(eq(articles.id, id))
        .returning();

      return reply.status(200).send({ success: true, data: result[0] });
    } catch (error) {
      return handleRouteError(error, reply);
    }
  });

  // ==================== ADMIN: SOFT DELETE ARTICLE (MOVE TO TRASH) ====================
  app.delete('/admin/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await db
      .select()
      .from(articles)
      .where(eq(articles.id, id))
      .limit(1);

    if (!existing[0]) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Artikel tidak ditemukan' },
      });
    }

    await db
      .update(articles)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(articles.id, id));

    return reply.status(200).send({
      success: true,
      data: { message: 'Artikel dipindahkan ke sampah' },
    });
  });

  // ==================== ADMIN: RESTORE ARTICLE FROM TRASH ====================
  app.post('/admin/:id/restore', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await db
      .select()
      .from(articles)
      .where(eq(articles.id, id))
      .limit(1);

    if (!existing[0]) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Artikel tidak ditemukan' },
      });
    }

    await db
      .update(articles)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(eq(articles.id, id));

    return reply.status(200).send({
      success: true,
      data: { message: 'Artikel berhasil dipulihkan' },
    });
  });

  // ==================== ADMIN: PERMANENT DELETE ARTICLE ====================
  app.delete('/admin/:id/permanent', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await db
      .select()
      .from(articles)
      .where(eq(articles.id, id))
      .limit(1);

    if (!existing[0]) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Artikel tidak ditemukan' },
      });
    }

    await db.delete(articles).where(eq(articles.id, id));

    return reply.status(200).send({
      success: true,
      data: { message: 'Artikel dihapus permanen' },
    });
  });
}
