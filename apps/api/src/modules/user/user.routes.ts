import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { eq, and, or, ilike, count, desc, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { users, addresses } from '../../db/schema/users';
import { orders } from '../../db/schema/orders';
import { subscriptions } from '../../db/schema/subscriptions';
import { reviews } from '../../db/schema/reviews';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { handleRouteError } from '../../lib/errors';

export async function userRoutes(app: FastifyInstance) {
  // ==================== GET PROFILE ====================
  app.get('/me', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const [user] = await db.query.users.findMany({
      where: eq(users.id, request.userId!),
      columns: {
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
      limit: 1,
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

    const updateData: Record<string, any> = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (avatar) updateData.avatar = avatar;

    const [user] = await db.update(users).set(updateData).where(
      eq(users.id, request.userId!)
    ).returning();

    return reply.status(200).send({ success: true, data: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
    }});
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

    const [user] = await db.query.users.findMany({
      where: eq(users.id, request.userId!),
      limit: 1,
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
    await db.update(users).set({ passwordHash }).where(eq(users.id, request.userId!));

    return reply.status(200).send({
      success: true,
      data: { message: 'Password berhasil diubah' },
    });
  });

  // ==================== GET ADDRESSES ====================
  app.get('/me/addresses', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const userAddresses = await db.query.addresses.findMany({
      where: eq(addresses.userId, request.userId!),
      orderBy: (addresses, { desc }) => [desc(addresses.isDefault)],
    });

    return reply.status(200).send({ success: true, data: userAddresses });
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
      await db.update(addresses).set({ isDefault: false }).where(
        eq(addresses.userId, request.userId!)
      );
    }

    const [newAddress] = await db.insert(addresses).values({
      userId: request.userId!,
      name,
      phone,
      address,
      city,
      province,
      postalCode,
      isDefault: isDefault || false,
    }).returning();

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
    const [existing] = await db.query.addresses.findMany({
      where: and(eq(addresses.id, id), eq(addresses.userId, request.userId!)),
      limit: 1,
    });

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Alamat tidak ditemukan' },
      });
    }

    if (isDefault) {
      await db.update(addresses).set({ isDefault: false }).where(
        eq(addresses.userId, request.userId!)
      );
    }

    const updateData: Record<string, any> = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;
    if (city) updateData.city = city;
    if (province) updateData.province = province;
    if (postalCode) updateData.postalCode = postalCode;
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    const [updated] = await db.update(addresses).set(updateData).where(
      eq(addresses.id, id)
    ).returning();

    return reply.status(200).send({ success: true, data: updated });
  });

  // ==================== DELETE ADDRESS ====================
  app.delete('/me/addresses/:id', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [existing] = await db.query.addresses.findMany({
      where: and(eq(addresses.id, id), eq(addresses.userId, request.userId!)),
      limit: 1,
    });

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Alamat tidak ditemukan' },
      });
    }

    await db.delete(addresses).where(eq(addresses.id, id));

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
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    if (role) conditions.push(eq(users.role, role as any));
    if (search) {
      conditions.push(or(
        ilike(users.name, `%${search}%`),
        ilike(users.email, `%${search}%`),
      ));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [allUsers, totalResult] = await Promise.all([
      db.query.users.findMany({
        where: whereClause,
        orderBy: (users, { desc }) => [desc(users.createdAt)],
        limit: limitNum,
        offset,
        columns: {
          id: true,
          email: true,
          phone: true,
          name: true,
          avatar: true,
          role: true,
          banned: true,
          emailVerified: true,
          createdAt: true,
        },
      }),
      db.select({ count: count() }).from(users).where(whereClause),
    ]);

    const total = totalResult[0]?.count ?? 0;

    // Get order and subscription counts per user
    const userIds = allUsers.map(u => u.id);
    let orderCounts: Record<string, number> = {};
    let subscriptionCounts: Record<string, number> = {};

    if (userIds.length > 0) {
      const [oc, sc] = await Promise.all([
        db.select({ userId: orders.userId, count: count() })
          .from(orders)
          .where(inArray(orders.userId, userIds))
          .groupBy(orders.userId),
        db.select({ userId: subscriptions.userId, count: count() })
          .from(subscriptions)
          .where(inArray(subscriptions.userId, userIds))
          .groupBy(subscriptions.userId),
      ]);
      orderCounts = Object.fromEntries(oc.map(r => [r.userId, r.count]));
      subscriptionCounts = Object.fromEntries(sc.map(r => [r.userId, r.count]));
    }

    const usersWithCounts = allUsers.map(u => ({
      ...u,
      _count: {
        orders: orderCounts[u.id] ?? 0,
        subscriptions: subscriptionCounts[u.id] ?? 0,
      },
    }));

    return reply.status(200).send({
      success: true,
      data: {
        users: usersWithCounts,
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

    const [user] = await db.query.users.findMany({
      where: eq(users.id, id),
      columns: {
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
      },
      limit: 1,
    });

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User tidak ditemukan' },
      });
    }

    // Get counts
    const [orderCountResult, subscriptionCountResult, reviewCountResult] = await Promise.all([
      db.select({ count: count() }).from(orders).where(eq(orders.userId, id)),
      db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.userId, id)),
      db.select({ count: count() }).from(reviews).where(eq(reviews.userId, id)),
    ]);

    // Get recent orders
    const recentOrders = await db.query.orders.findMany({
      where: eq(orders.userId, id),
      orderBy: (orders, { desc }) => [desc(orders.createdAt)],
      limit: 10,
      columns: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true,
      },
    });

    return reply.status(200).send({
      success: true,
      data: {
        ...user,
        _count: {
          orders: orderCountResult[0]?.count ?? 0,
          subscriptions: subscriptionCountResult[0]?.count ?? 0,
          reviews: reviewCountResult[0]?.count ?? 0,
        },
        orders: recentOrders,
      },
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

    const [existing] = await db.query.users.findMany({
      where: eq(users.id, id),
      limit: 1,
    });

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User tidak ditemukan' },
      });
    }

    try {
      const updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;

      const [updated] = await db.update(users).set(updateData).where(
        eq(users.id, id)
      ).returning();

      return reply.status(200).send({ success: true, data: {
        id: updated.id,
        email: updated.email,
        phone: updated.phone,
        name: updated.name,
        role: updated.role,
        banned: updated.banned,
      }});
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

    const [existing] = await db.query.users.findMany({
      where: eq(users.id, id),
      limit: 1,
    });

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

    const [updated] = await db.update(users).set({
      role: role as any,
    }).where(eq(users.id, id)).returning();

    return reply.status(200).send({ success: true, data: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
    }});
  });

  // ==================== ADMIN: BAN/UNBAN USER ====================
  app.put('/admin/:id/ban', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [existing] = await db.query.users.findMany({
      where: eq(users.id, id),
      limit: 1,
    });

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

    const [updated] = await db.update(users).set({
      banned: !existing.banned,
    }).where(eq(users.id, id)).returning();

    return reply.status(200).send({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        banned: updated.banned,
        message: updated.banned ? 'User berhasil diblokir' : 'User berhasil dibuka blokirnya',
      },
    });
  });
}
