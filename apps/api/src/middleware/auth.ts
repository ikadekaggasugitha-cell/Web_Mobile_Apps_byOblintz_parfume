import { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token tidak diberikan',
        },
      });
    }

    const decoded = request.server.jwt.verify<{ id: string }>(token);
    request.userId = decoded.id;
  } catch {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token tidak valid atau kedaluwarsa',
      },
    });
  }
}

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token tidak diberikan',
        },
      });
    }

    const decoded = request.server.jwt.verify<{ id: string; role: string }>(token);

    if (decoded.role !== 'ADMIN' && decoded.role !== 'SUPER_ADMIN') {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Akses admin diperlukan',
        },
      });
    }

    request.userId = decoded.id;
  } catch {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token tidak valid atau kedaluwarsa',
      },
    });
  }
}
