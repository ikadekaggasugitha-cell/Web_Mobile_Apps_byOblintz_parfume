import Fastify, { type FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';
import { ZodError } from 'zod';
import { AppError } from '../../../src/lib/errors';
import { productRoutes } from '../../../src/modules/product/product.routes';
import { categoryRoutes } from '../../../src/modules/category/category.routes';

/**
 * Build a real Fastify app wired to the real Prisma client (pointed at the test
 * DB via setup.ts). Only registers routes that have no external-service coupling
 * (no Redis/email/Midtrans) so integration tests exercise genuine DB behaviour.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(jwt, {
    secret: process.env.JWT_ACCESS_SECRET || 'test-jwt-secret-min-32-characters!!',
  });

  // Mirror of the production global error handler (subset).
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: { code: error.code, message: error.message },
      });
    }
    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.errors.map((e) => e.message).join('; ') },
      });
    }
    const code = (error as { code?: string }).code;
    if (code === 'P2002') {
      return reply.status(409).send({ success: false, error: { code: 'CONFLICT', message: 'Data sudah ada' } });
    }
    if (code === 'P2025') {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Data tidak ditemukan' } });
    }
    return reply.status(error.statusCode || 500).send({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Terjadi kesalahan server' },
    });
  });

  await app.register(productRoutes, { prefix: '/api/products' });
  await app.register(categoryRoutes, { prefix: '/api/categories' });
  await app.ready();
  return app;
}
