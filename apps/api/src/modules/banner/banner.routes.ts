import { FastifyInstance } from 'fastify';
import { eq, desc, asc, sql, and, isNull, isNotNull } from 'drizzle-orm';
import { db } from '../../db';
import { banners } from '../../db/schema';
import { handleRouteError } from '../../lib/errors';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { optionalUrl } from '../../lib/validation';
import { z } from 'zod';

const bannerSchema = z.object({
  title: z.string().min(1).max(100),
  subtitle: z.string().max(200).optional(),
  imageUrl: z.string().url(),
  // Optional URL fields arrive from the admin form as '' when left blank;
  // `optionalUrl` treats '' as undefined so an empty Link doesn't 400 the save.
  link: optionalUrl,
  position: z.string().default('home'),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().default(true),
});

export async function bannerRoutes(app: FastifyInstance) {
  // ==================== LIST ACTIVE BANNERS (PUBLIC) ====================
  app.get('/', async (request, reply) => {
    const activeBanners = await db
      .select({
        id: banners.id,
        title: banners.title,
        subtitle: banners.subtitle,
        imageUrl: banners.imageUrl,
        link: banners.link,
        position: banners.position,
      })
      .from(banners)
      .where(and(eq(banners.isActive, true), isNull(banners.deletedAt)))
      .orderBy(asc(banners.sortOrder));

    return reply.status(200).send({ success: true, data: activeBanners });
  });

  // ==================== ADMIN: LIST ALL BANNERS ====================
  app.get('/admin/all', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { deleted } = request.query as { deleted?: string };

    // `?deleted=true` returns only trashed rows; otherwise only active rows.
    const where = deleted === 'true' ? isNotNull(banners.deletedAt) : isNull(banners.deletedAt);

    const allBanners = await db
      .select()
      .from(banners)
      .where(where)
      .orderBy(asc(banners.sortOrder));

    return reply.status(200).send({ success: true, data: allBanners });
  });

  // ==================== ADMIN: CREATE BANNER ====================
  app.post('/admin', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    try {
      const input = bannerSchema.parse(request.body);

      const [maxSortRow] = await db
        .select({ maxSort: sql<number>`COALESCE(MAX(${banners.sortOrder}), 0)` })
        .from(banners);

      const nextSortOrder = input.sortOrder ?? (maxSortRow?.maxSort ?? 0) + 1;

      const [banner] = await db
        .insert(banners)
        .values({
          title: input.title,
          subtitle: input.subtitle,
          imageUrl: input.imageUrl,
          link: input.link,
          position: input.position,
          sortOrder: nextSortOrder,
          isActive: input.isActive,
        })
        .returning();

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

    const [existing] = await db
      .select()
      .from(banners)
      .where(eq(banners.id, id))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Banner tidak ditemukan' },
      });
    }

    try {
      const input = bannerSchema.partial().parse(request.body);

      const updateData: Record<string, any> = {};
      if (input.title) updateData.title = input.title;
      if (input.subtitle !== undefined) updateData.subtitle = input.subtitle;
      if (input.imageUrl) updateData.imageUrl = input.imageUrl;
      if (input.link !== undefined) updateData.link = input.link;
      if (input.position) updateData.position = input.position;
      if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;

      const [updated] = await db
        .update(banners)
        .set(updateData)
        .where(eq(banners.id, id))
        .returning();

      return reply.status(200).send({ success: true, data: updated });
    } catch (error) {
      return handleRouteError(error, reply);
    }
  });

  // ==================== ADMIN: SOFT DELETE BANNER (MOVE TO TRASH) ====================
  app.delete('/admin/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [existing] = await db
      .select()
      .from(banners)
      .where(eq(banners.id, id))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Banner tidak ditemukan' },
      });
    }

    await db
      .update(banners)
      .set({ deletedAt: new Date() })
      .where(eq(banners.id, id));

    return reply.status(200).send({
      success: true,
      data: { message: 'Banner dipindahkan ke sampah' },
    });
  });

  // ==================== ADMIN: RESTORE BANNER FROM TRASH ====================
  app.post('/admin/:id/restore', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [existing] = await db
      .select()
      .from(banners)
      .where(eq(banners.id, id))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Banner tidak ditemukan' },
      });
    }

    await db
      .update(banners)
      .set({ deletedAt: null })
      .where(eq(banners.id, id));

    return reply.status(200).send({
      success: true,
      data: { message: 'Banner berhasil dipulihkan' },
    });
  });

  // ==================== ADMIN: PERMANENT DELETE BANNER ====================
  app.delete('/admin/:id/permanent', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [existing] = await db
      .select()
      .from(banners)
      .where(eq(banners.id, id))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Banner tidak ditemukan' },
      });
    }

    await db.delete(banners).where(eq(banners.id, id));

    return reply.status(200).send({
      success: true,
      data: { message: 'Banner dihapus permanen' },
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

    await db.transaction(async (tx) => {
      for (let i = 0; i < ids.length; i++) {
        await tx
          .update(banners)
          .set({ sortOrder: i + 1 })
          .where(eq(banners.id, ids[i]));
      }
    });

    return reply.status(200).send({
      success: true,
      data: { message: 'Urutan banner diperbarui' },
    });
  });
}
