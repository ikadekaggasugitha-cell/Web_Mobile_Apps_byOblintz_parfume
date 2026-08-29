import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { handleRouteError } from '../../lib/errors';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { z } from 'zod';

const bannerSchema = z.object({
  title: z.string().min(1).max(100),
  subtitle: z.string().max(200).optional(),
  imageUrl: z.string().url(),
  link: z.string().url().optional(),
  position: z.string().default('home'),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().default(true),
});

export async function bannerRoutes(app: FastifyInstance) {
  // ==================== LIST ACTIVE BANNERS (PUBLIC) ====================
  app.get('/', async (request, reply) => {
    const banners = await prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        title: true,
        subtitle: true,
        imageUrl: true,
        link: true,
        position: true,
      },
    });

    return reply.status(200).send({ success: true, data: banners });
  });

  // ==================== ADMIN: LIST ALL BANNERS ====================
  app.get('/admin/all', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const banners = await prisma.banner.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return reply.status(200).send({ success: true, data: banners });
  });

  // ==================== ADMIN: CREATE BANNER ====================
  app.post('/admin', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    try {
      const input = bannerSchema.parse(request.body);

      // Get max sort order
      const maxSort = await prisma.banner.aggregate({
        _max: { sortOrder: true },
      });

      const banner = await prisma.banner.create({
        data: {
          title: input.title,
          subtitle: input.subtitle,
          imageUrl: input.imageUrl,
          link: input.link,
          position: input.position,
          sortOrder: input.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1,
          isActive: input.isActive,
        },
      });

      return reply.status(201).send({ success: true, data: banner });
    } catch (error) {
      return handleRouteError(error, reply);
    }
  });

  // ==================== ADMIN: UPDATE BANNER ====================
  app.put('/admin/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const banner = await prisma.banner.findUnique({ where: { id } });
    if (!banner) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Banner tidak ditemukan' },
      });
    }

    try {
      const input = bannerSchema.partial().parse(request.body);

      const updated = await prisma.banner.update({
        where: { id },
        data: {
          ...(input.title && { title: input.title }),
          ...(input.subtitle !== undefined && { subtitle: input.subtitle }),
          ...(input.imageUrl && { imageUrl: input.imageUrl }),
          ...(input.link !== undefined && { link: input.link }),
          ...(input.position && { position: input.position }),
          ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
        },
      });

      return reply.status(200).send({ success: true, data: updated });
    } catch (error) {
      return handleRouteError(error, reply);
    }
  });

  // ==================== ADMIN: DELETE BANNER ====================
  app.delete('/admin/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const banner = await prisma.banner.findUnique({ where: { id } });
    if (!banner) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Banner tidak ditemukan' },
      });
    }

    await prisma.banner.delete({ where: { id } });

    return reply.status(200).send({
      success: true,
      data: { message: 'Banner berhasil dihapus' },
    });
  });

  // ==================== ADMIN: REORDER BANNERS ====================
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
        prisma.banner.update({
          where: { id },
          data: { sortOrder: index + 1 },
        })
      )
    );

    return reply.status(200).send({
      success: true,
      data: { message: 'Urutan banner diperbarui' },
    });
  });
}
