import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import prisma from '../../config/database';
import { requireAuth } from '../../middleware/auth';

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
}
