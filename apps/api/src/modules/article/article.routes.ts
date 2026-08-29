import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
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

    const where = { status: 'PUBLISHED' as const };

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          imageUrl: true,
          createdAt: true,
        },
      }),
      prisma.article.count({ where }),
    ]);

    return reply.status(200).send({
      success: true,
      data: {
        articles,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      },
    });
  });

  // ==================== GET ARTICLE BY SLUG ====================
  app.get('/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const article = await prisma.article.findUnique({
      where: { slug },
    });

    if (!article || article.status !== 'PUBLISHED') {
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
    const { page = '1', limit = '20', status, search } = request.query as {
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
        { title: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.article.count({ where }),
    ]);

    return reply.status(200).send({
      success: true,
      data: {
        articles,
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

      const existing = await prisma.article.findUnique({ where: { slug } });
      if (existing) {
        return reply.status(409).send({
          success: false,
          error: { code: 'CONFLICT', message: 'Slug artikel sudah ada' },
        });
      }

      const article = await prisma.article.create({
        data: {
          title: input.title,
          slug,
          content: input.content,
          excerpt: input.excerpt,
          imageUrl: input.imageUrl,
          author: input.author || 'Admin',
          status: input.status,
        },
      });

      return reply.status(201).send({ success: true, data: article });
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

  // ==================== ADMIN: UPDATE ARTICLE ====================
  app.put('/admin/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const article = await prisma.article.findUnique({ where: { id } });
    if (!article) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Artikel tidak ditemukan' },
      });
    }

    try {
      const input = articleSchema.partial().parse(request.body);

      const updated = await prisma.article.update({
        where: { id },
        data: {
          ...(input.title && { title: input.title }),
          ...(input.content && { content: input.content }),
          ...(input.excerpt !== undefined && { excerpt: input.excerpt }),
          ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
          ...(input.status && { status: input.status }),
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

  // ==================== ADMIN: DELETE ARTICLE ====================
  app.delete('/admin/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const article = await prisma.article.findUnique({ where: { id } });
    if (!article) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Artikel tidak ditemukan' },
      });
    }

    await prisma.article.delete({ where: { id } });

    return reply.status(200).send({
      success: true,
      data: { message: 'Artikel berhasil dihapus' },
    });
  });
}
