import { FastifyInstance } from 'fastify';
import { eq, desc, count } from 'drizzle-orm';
import { db } from '../../db';
import { promoCodes } from '../../db/schema';
import { handleRouteError } from '../../lib/errors';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { createPromoSchema, updatePromoSchema, validatePromoSchema } from './promo.schema';

export async function promoRoutes(app: FastifyInstance) {
  // ==================== VALIDATE PROMO (PUBLIC) ====================
  app.post('/validate', async (request, reply) => {
    try {
      const input = validatePromoSchema.parse(request.body);

      const [promo] = await db
        .select()
        .from(promoCodes)
        .where(eq(promoCodes.code, input.code.toUpperCase()))
        .limit(1);

      if (!promo) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Kode promo tidak ditemukan' },
        });
      }

      if (promo.status !== 'ACTIVE') {
        return reply.status(400).send({
          success: false,
          error: { code: 'INACTIVE', message: 'Kode promo tidak aktif' },
        });
      }

      const now = new Date();
      if (promo.startDate && now < promo.startDate) {
        return reply.status(400).send({
          success: false,
          error: { code: 'NOT_STARTED', message: 'Kode promo belum berlaku' },
        });
      }

      if (promo.endDate && now > promo.endDate) {
        return reply.status(400).send({
          success: false,
          error: { code: 'EXPIRED', message: 'Kode promo sudah kedaluwarsa' },
        });
      }

      if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
        return reply.status(400).send({
          success: false,
          error: { code: 'LIMIT_REACHED', message: 'Kode promo sudah mencapai batas penggunaan' },
        });
      }

      if (promo.minOrder && input.subtotal < Number(promo.minOrder)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'MIN_ORDER',
            message: `Minimum order Rp ${Number(promo.minOrder).toLocaleString('id-ID')}`,
          },
        });
      }

      let discount = 0;
      if (promo.type === 'PERCENTAGE') {
        discount = input.subtotal * (Number(promo.value) / 100);
        if (promo.maxDiscount && discount > Number(promo.maxDiscount)) {
          discount = Number(promo.maxDiscount);
        }
      } else if (promo.type === 'FIXED') {
        discount = Math.min(Number(promo.value), input.subtotal);
      } else if (promo.type === 'FREE_SHIPPING') {
        discount = 15000;
      }

      return reply.status(200).send({
        success: true,
        data: {
          code: promo.code,
          name: promo.name,
          type: promo.type,
          value: promo.value,
          discount,
          subtotal: input.subtotal,
          total: input.subtotal - discount,
        },
      });
    } catch (error) {
      return handleRouteError(error, reply);
    }
  });

  // ==================== ADMIN: LIST ALL PROMOS ====================
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

    const whereClause = status ? eq(promoCodes.status, status as any) : undefined;

    const [promos, [{ total }]] = await Promise.all([
      db
        .select()
        .from(promoCodes)
        .where(whereClause)
        .orderBy(desc(promoCodes.createdAt))
        .limit(limitNum)
        .offset(skip),
      db
        .select({ total: count() })
        .from(promoCodes)
        .where(whereClause),
    ]);

    return reply.status(200).send({
      success: true,
      data: {
        promos,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / limitNum),
        },
      },
    });
  });

  // ==================== ADMIN: CREATE PROMO ====================
  app.post('/admin', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    try {
      const input = createPromoSchema.parse(request.body);

      const [existing] = await db
        .select()
        .from(promoCodes)
        .where(eq(promoCodes.code, input.code))
        .limit(1);

      if (existing) {
        return reply.status(409).send({
          success: false,
          error: { code: 'CONFLICT', message: 'Kode promo sudah ada' },
        });
      }

      const [promo] = await db
        .insert(promoCodes)
        .values({
          code: input.code,
          name: input.name,
          type: input.type,
          value: String(input.value),
          minOrder: input.minOrder ? String(input.minOrder) : null,
          maxDiscount: input.maxDiscount ? String(input.maxDiscount) : null,
          usageLimit: input.usageLimit,
          startDate: input.startDate ? new Date(input.startDate) : null,
          endDate: input.endDate ? new Date(input.endDate) : null,
          status: input.isActive ? 'ACTIVE' : 'INACTIVE',
        })
        .returning();

      return reply.status(201).send({ success: true, data: promo });
    } catch (error) {
      return handleRouteError(error, reply);
    }
  });

  // ==================== ADMIN: UPDATE PROMO ====================
  app.put('/admin/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [existingPromo] = await db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.id, id))
      .limit(1);

    if (!existingPromo) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Promo tidak ditemukan' },
      });
    }

    try {
      const input = updatePromoSchema.parse(request.body);

      const updateData: Record<string, any> = {};
      if (input.name) updateData.name = input.name;
      if (input.type) updateData.type = input.type;
      if (input.value !== undefined) updateData.value = String(input.value);
      if (input.minOrder !== undefined) updateData.minOrder = input.minOrder ? String(input.minOrder) : null;
      if (input.maxDiscount !== undefined) updateData.maxDiscount = input.maxDiscount ? String(input.maxDiscount) : null;
      if (input.usageLimit !== undefined) updateData.usageLimit = input.usageLimit;
      if (input.startDate !== undefined) {
        updateData.startDate = input.startDate ? new Date(input.startDate) : null;
      }
      if (input.endDate !== undefined) {
        updateData.endDate = input.endDate ? new Date(input.endDate) : null;
      }
      if (input.isActive !== undefined) {
        updateData.status = input.isActive ? 'ACTIVE' : 'INACTIVE';
      }

      const [updated] = await db
        .update(promoCodes)
        .set(updateData)
        .where(eq(promoCodes.id, id))
        .returning();

      return reply.status(200).send({ success: true, data: updated });
    } catch (error) {
      return handleRouteError(error, reply);
    }
  });

  // ==================== ADMIN: DELETE PROMO ====================
  app.delete('/admin/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [existing] = await db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.id, id))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Promo tidak ditemukan' },
      });
    }

    await db.delete(promoCodes).where(eq(promoCodes.id, id));

    return reply.status(200).send({
      success: true,
      data: { message: 'Promo berhasil dihapus' },
    });
  });

  // ==================== ADMIN: TOGGLE STATUS ====================
  app.put('/admin/:id/toggle', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [existing] = await db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.id, id))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Promo tidak ditemukan' },
      });
    }

    const newStatus = existing.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const [updated] = await db
      .update(promoCodes)
      .set({ status: newStatus as any })
      .where(eq(promoCodes.id, id))
      .returning();

    return reply.status(200).send({
      success: true,
      data: { status: updated.status, message: `Promo ${newStatus === 'ACTIVE' ? 'diaktifkan' : 'dinonaktifkan'}` },
    });
  });
}
