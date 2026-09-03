import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import prisma from '../../config/database';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { handleRouteError } from '../../lib/errors';

export async function userRoutes(app: FastifyInstance) {
  // ==================== GET PROFILE ====================
  app.get('/me', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        avatar: true,
        role: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User tidak ditemukan' },
      });
    }

    return reply.status(200).send({ success: true, data: user });
  });

  // ==================== UPDATE PROFILE ====================
  app.put('/me', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { name, phone, avatar } = request.body as {
      name?: string;
      phone?: string;
      avatar?: string;
    };

    const user = await prisma.user.update({
      where: { id: request.userId },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(avatar && { avatar }),
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        avatar: true,
        role: true,
      },
    });

    return reply.status(200).send({ success: true, data: user });
  });

  // ==================== CHANGE PASSWORD ====================
  app.put('/me/password', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { currentPassword, newPassword } = request.body as {
      currentPassword: string;
      newPassword: string;
    };

    if (!currentPassword || !newPassword) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Password lama dan baru diperlukan' },
      });
    }

    if (newPassword.length < 8) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Password baru minimal 8 karakter' },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: request.userId },
    });

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User tidak ditemukan' },
      });
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_PASSWORD', message: 'Password lama salah' },
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: request.userId },
      data: { passwordHash },
    });

    return reply.status(200).send({
      success: true,
      data: { message: 'Password berhasil diubah' },
    });
  });

  // ==================== GET ADDRESSES ====================
  app.get('/me/addresses', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const addresses = await prisma.address.findMany({
      where: { userId: request.userId },
      orderBy: { isDefault: 'desc' },
    });

    return reply.status(200).send({ success: true, data: addresses });
  });

  // ==================== ADD ADDRESS ====================
  app.post('/me/addresses', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { name, phone, address, city, province, postalCode, isDefault } = request.body as {
      name: string;
      phone: string;
      address: string;
      city: string;
      province: string;
      postalCode: string;
      isDefault?: boolean;
    };

    if (!name || !phone || !address || !city || !province || !postalCode) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Semua field alamat wajib diisi' },
      });
    }

    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: request.userId },
        data: { isDefault: false },
      });
    }

    const newAddress = await prisma.address.create({
      data: {
        userId: request.userId!,
        name,
        phone,
        address,
        city,
        province,
        postalCode,
        isDefault: isDefault || false,
      },
    });

    return reply.status(201).send({ success: true, data: newAddress });
  });

  // ==================== UPDATE ADDRESS ====================
  app.put('/me/addresses/:id', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name, phone, address, city, province, postalCode, isDefault } = request.body as {
      name?: string;
      phone?: string;
      address?: string;
      city?: string;
      province?: string;
      postalCode?: string;
      isDefault?: boolean;
    };

    // Pastikan alamat milik user
    const existing = await prisma.address.findFirst({
      where: { id, userId: request.userId },
    });

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Alamat tidak ditemukan' },
      });
    }

    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: request.userId },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.address.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(address && { address }),
        ...(city && { city }),
        ...(province && { province }),
        ...(postalCode && { postalCode }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    return reply.status(200).send({ success: true, data: updated });
  });

  // ==================== DELETE ADDRESS ====================
  app.delete('/me/addresses/:id', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.address.findFirst({
      where: { id, userId: request.userId },
    });

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Alamat tidak ditemukan' },
      });
    }

    await prisma.address.delete({ where: { id } });

    return reply.status(200).send({
      success: true,
      data: { message: 'Alamat berhasil dihapus' },
    });
  });

  // ==================== ADMIN: LIST ALL USERS ====================
  app.get('/admin/all', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { page = '1', limit = '20', search, role } = request.query as {
      page?: string;
      limit?: string;
      search?: string;
      role?: string;
    };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          avatar: true,
          role: true,
          banned: true,
          emailVerified: true,
          createdAt: true,
          _count: { select: { orders: true, subscriptions: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return reply.status(200).send({
      success: true,
      data: {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  });

  // ==================== ADMIN: GET USER DETAIL ====================
  app.get('/admin/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        avatar: true,
        role: true,
        banned: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { orders: true, subscriptions: true, reviews: true } },
      },
    });

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User tidak ditemukan' },
      });
    }

    const orders = await prisma.order.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true,
      },
    });

    return reply.status(200).send({
      success: true,
      data: { ...user, orders },
    });
  });

  // ==================== ADMIN: UPDATE USER ====================
  app.put('/admin/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name, email, phone } = request.body as {
      name?: string;
      email?: string;
      phone?: string;
    };

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User tidak ditemukan' },
      });
    }

    try {
      const updated = await prisma.user.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(email !== undefined && { email }),
          ...(phone !== undefined && { phone }),
        },
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          role: true,
          banned: true,
        },
      });

      return reply.status(200).send({ success: true, data: updated });
    } catch (error) {
      return handleRouteError(error, reply);
    }
  });

  // ==================== ADMIN: UPDATE USER ROLE ====================
  app.put('/admin/:id/role', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { role } = request.body as { role: string };

    if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Role tidak valid' },
      });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User tidak ditemukan' },
      });
    }

    // Prevent self-promotion to SUPER_ADMIN
    if (request.userId === id && role === 'SUPER_ADMIN' && existing.role !== 'SUPER_ADMIN') {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Tidak bisa promosi diri sendiri ke Super Admin' },
      });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: role as any },
      select: { id: true, name: true, email: true, role: true },
    });

    return reply.status(200).send({ success: true, data: updated });
  });

  // ==================== ADMIN: BAN/UNBAN USER ====================
  app.put('/admin/:id/ban', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User tidak ditemukan' },
      });
    }

    // Prevent banning a SUPER_ADMIN
    if (existing.role === 'SUPER_ADMIN') {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Tidak bisa memblokir Super Admin' },
      });
    }

    // Prevent self-ban
    if (request.userId === id) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Tidak bisa memblokir diri sendiri' },
      });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { banned: !existing.banned },
      select: { id: true, name: true, email: true, banned: true },
    });

    return reply.status(200).send({
      success: true,
      data: {
        ...updated,
        message: updated.banned ? 'User berhasil diblokir' : 'User berhasil dibuka blokirnya',
      },
    });
  });
}
