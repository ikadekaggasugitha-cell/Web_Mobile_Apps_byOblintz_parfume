import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';

export async function userRoutes(app: FastifyInstance) {
  // Get user profile
  app.get('/me', {
    preHandler: [async (request, reply) => {
      try {
        const token = request.headers.authorization?.replace('Bearer ', '');
        if (!token) {
          return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'No token' } });
        }
        const decoded = app.jwt.verify<{ id: string }>(token);
        request.userId = decoded.id;
      } catch {
        return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
      }
    }],
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
        createdAt: true,
      },
    });

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }

    return reply.status(200).send({
      success: true,
      data: user,
    });
  });

  // Update user profile
  app.put('/me', {
    preHandler: [async (request, reply) => {
      try {
        const token = request.headers.authorization?.replace('Bearer ', '');
        if (!token) {
          return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'No token' } });
        }
        const decoded = app.jwt.verify<{ id: string }>(token);
        request.userId = decoded.id;
      } catch {
        return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
      }
    }],
  }, async (request, reply) => {
    const { name, phone, avatar } = request.body as { name?: string; phone?: string; avatar?: string };

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

    return reply.status(200).send({
      success: true,
      data: user,
    });
  });

  // Get user addresses
  app.get('/me/addresses', {
    preHandler: [async (request, reply) => {
      try {
        const token = request.headers.authorization?.replace('Bearer ', '');
        if (!token) {
          return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'No token' } });
        }
        const decoded = app.jwt.verify<{ id: string }>(token);
        request.userId = decoded.id;
      } catch {
        return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
      }
    }],
  }, async (request, reply) => {
    const addresses = await prisma.address.findMany({
      where: { userId: request.userId },
      orderBy: { isDefault: 'desc' },
    });

    return reply.status(200).send({
      success: true,
      data: addresses,
    });
  });

  // Add address
  app.post('/me/addresses', {
    preHandler: [async (request, reply) => {
      try {
        const token = request.headers.authorization?.replace('Bearer ', '');
        if (!token) {
          return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'No token' } });
        }
        const decoded = app.jwt.verify<{ id: string }>(token);
        request.userId = decoded.id;
      } catch {
        return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
      }
    }],
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

    // If this is default, unset other defaults
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

    return reply.status(201).send({
      success: true,
      data: newAddress,
    });
  });
}
