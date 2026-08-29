import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { createPromoSchema, updatePromoSchema, validatePromoSchema } from './promo.schema';

export async function promoRoutes(app: FastifyInstance) {
  // ==================== VALIDATE PROMO (PUBLIC) ====================
  app.post('/validate', async (request, reply) => {
    try {
      const input = validatePromoSchema.parse(request.body);

      const promo = await prisma.promoCode.findUnique({
        where: { code: input.code.toUpperCase() },
      });

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

      // Hitung diskon
      let discount = 0;
      if (promo.type === 'PERCENTAGE') {
        discount = input.subtotal * (Number(promo.value) / 100);
        if (promo.maxDiscount && discount > Number(promo.maxDiscount)) {
          discount = Number(promo.maxDiscount);
        }
      } else if (promo.type === 'FIXED') {
        discount = Math.min(Number(promo.value), input.subtotal);
      } else if (promo.type === 'FREE_SHIPPING') {
        discount = 15000; // Standard shipping cost
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
      if (error instanceof Error) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: error.message },
        });
      }
      throw error;
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

    const where: any = {};
    if (status) where.status = status;

    const [promos, total] = await Promise.all([
      prisma.promoCode.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.promoCode.count({ where }),
    ]);

    return reply.status(200).send({
      success: true,
      data: {
        promos,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
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

      // Cek kode unik
      const existing = await prisma.promoCode.findUnique({
        where: { code: input.code },
      });

      if (existing) {
        return reply.status(409).send({
          success: false,
          error: { code: 'CONFLICT', message: 'Kode promo sudah ada' },
        });
      }

      const promo = await prisma.promoCode.create({
        data: {
          code: input.code,
          name: input.name,
          type: input.type,
          value: input.value,
          minOrder: input.minOrder,
          maxDiscount: input.maxDiscount,
          usageLimit: input.usageLimit,
          startDate: input.startDate ? new Date(input.startDate) : null,
          endDate: input.endDate ? new Date(input.endDate) : null,
          status: input.isActive ? 'ACTIVE' : 'INACTIVE',
        },
      });

      return reply.status(201).send({ success: true, data: promo });
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

  // ==================== ADMIN: UPDATE PROMO ====================
  app.put('/admin/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const promo = await prisma.promoCode.findUnique({ where: { id } });
    if (!promo) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Promo tidak ditemukan' },
      });
    }

    try {
      const input = updatePromoSchema.parse(request.body);

      const updated = await prisma.promoCode.update({
        where: { id },
        data: {
          ...(input.name && { name: input.name }),
          ...(input.type && { type: input.type }),
          ...(input.value !== undefined && { value: input.value }),
          ...(input.minOrder !== undefined && { minOrder: input.minOrder }),
          ...(input.maxDiscount !== undefined && { maxDiscount: input.maxDiscount }),
          ...(input.usageLimit !== undefined && { usageLimit: input.usageLimit }),
          ...(input.startDate !== undefined && {
            startDate: input.startDate ? new Date(input.startDate) : null,
          }),
          ...(input.endDate !== undefined && {
            endDate: input.endDate ? new Date(input.endDate) : null,
          }),
          ...(input.isActive !== undefined && {
            status: input.isActive ? 'ACTIVE' : 'INACTIVE',
          }),
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

  // ==================== ADMIN: DELETE PROMO ====================
  app.delete('/admin/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const promo = await prisma.promoCode.findUnique({ where: { id } });
    if (!promo) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Promo tidak ditemukan' },
      });
    }

    await prisma.promoCode.delete({ where: { id } });

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

    const promo = await prisma.promoCode.findUnique({ where: { id } });
    if (!promo) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Promo tidak ditemukan' },
      });
    }

    const newStatus = promo.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const updated = await prisma.promoCode.update({
      where: { id },
      data: { status: newStatus as any },
    });

    return reply.status(200).send({
      success: true,
      data: { status: updated.status, message: `Promo ${newStatus === 'ACTIVE' ? 'diaktifkan' : 'dinonaktifkan'}` },
    });
  });
}
