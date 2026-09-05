import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import helmet from '@fastify/helmet';
import { ZodError } from 'zod';
import { config } from './config';
import { db } from './db';
import { sql } from 'drizzle-orm';
import { redis } from './config/redis';
import { AppError } from './lib/errors';
import { authRoutes } from './modules/auth/auth.routes';
import { productRoutes } from './modules/product/product.routes';
import { categoryRoutes } from './modules/category/category.routes';
import { userRoutes } from './modules/user/user.routes';
import { cartRoutes } from './modules/cart/cart.routes';
import { checkoutRoutes } from './modules/checkout/checkout.routes';
import { orderRoutes } from './modules/order/order.routes';
import { paymentRoutes } from './modules/payment/payment.routes';
import { reviewRoutes } from './modules/review/review.routes';
import { wishlistRoutes } from './modules/wishlist/wishlist.routes';
import { promoRoutes } from './modules/promo/promo.routes';
import { uploadRoutes } from './modules/upload/upload.routes';
import { quizRoutes } from './modules/quiz/quiz.routes';
import { collectionRoutes } from './modules/collection/collection.routes';
import { subscriptionRoutes } from './modules/subscription/subscription.routes';
import { articleRoutes } from './modules/article/article.routes';
import { bannerRoutes } from './modules/banner/banner.routes';
import { reportRoutes } from './modules/report/report.routes';
import { faqRoutes } from './modules/faq/faq.routes';
import { stockRoutes } from './modules/stock/stock.routes';

const server = Fastify({
  logger: {
    level: config.nodeEnv === 'development' ? 'info' : 'warn',
  },
});

// ==================== GLOBAL ERROR HANDLER ====================
server.setErrorHandler((error, request, reply) => {
  server.log.error(error);

  // Intended application errors (safe to surface)
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: { code: error.code, message: error.message },
    });
  }

  // Zod schema validation
  if (error instanceof ZodError) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.errors.map((e) => e.message).join('; '),
      },
    });
  }

  // PostgreSQL unique constraint violation
  if (error.code === '23505') {
    return reply.status(409).send({
      success: false,
      error: { code: 'CONFLICT', message: 'Data sudah ada' },
    });
  }

  // PostgreSQL foreign key violation
  if (error.code === '23503') {
    return reply.status(404).send({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Data tidak ditemukan' },
    });
  }

  // JWT errors
  if (error.message === 'jwt malformed' || error.message === 'jwt invalid signature') {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Token tidak valid' },
    });
  }

  if (error.message === 'jwt expired') {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Token kedaluwarsa' },
    });
  }

  // Validation errors
  if (error.validation) {
    return reply.status(400).send({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Input tidak valid', details: error.validation },
    });
  }

  // Default
  const statusCode = error.statusCode || 500;
  return reply.status(statusCode).send({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.nodeEnv === 'development' ? error.message : 'Terjadi kesalahan server',
    },
  });
});

// Not found handler
server.setNotFoundHandler((request, reply) => {
  return reply.status(404).send({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${request.method} ${request.url} tidak ditemukan` },
  });
});

// Request time logging
server.addHook('onRequest', async (request) => {
  (request as any).startTime = Date.now();
  if (!request.id) {
    request.id = crypto.randomUUID();
  }
});

server.addHook('onResponse', async (request, reply) => {
  const duration = (request as any).startTime ? Date.now() - (request as any).startTime : 0;
  reply.header('X-Request-Id', request.id);
  const logLevel = duration > 1000 ? 'warn' : 'info';
  if (logLevel === 'warn') {
    server.log.warn({ requestId: request.id, method: request.method, url: request.url, duration }, 'Slow request');
  }
});

async function bootstrap() {
  // Register plugins
  await server.register(cors, config.cors as Parameters<typeof cors>[1]);

  await server.register(helmet, {
    contentSecurityPolicy: false,
  });

  await server.register(jwt, {
    secret: config.jwt.accessSecret,
  });

  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      success: false,
      error: { code: 'RATE_LIMIT', message: 'Terlalu banyak request, coba lagi nanti' },
    }),
  });

  await server.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  });

  // Set body size limit for JSON requests (1MB)
  server.addContentTypeParser('application/json', { parseAs: 'string', bodyLimit: 1048576 }, (req, body, done) => {
    try {
      const json = JSON.parse(body as string);
      done(null, json);
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  // Decorators
  server.decorate('db', db);
  server.decorate('redis', redis);

  // Health check (deep - verifikasi DB dan Redis)
  server.get('/health', async () => {
    const checks = {
      database: false,
      redis: false,
    };

    try {
      await db.execute(sql`SELECT 1`);
      checks.database = true;
    } catch {
      // Database connection failed
    }

    try {
      await redis.ping();
      checks.redis = true;
    } catch {
      // Redis connection failed
    }

    const status = checks.database && checks.redis ? 'ok' : 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      checks,
    };
  });

  // Register routes
  await server.register(authRoutes, { prefix: '/api/auth' });
  await server.register(productRoutes, { prefix: '/api/products' });
  await server.register(categoryRoutes, { prefix: '/api/categories' });
  await server.register(userRoutes, { prefix: '/api/users' });
  await server.register(cartRoutes, { prefix: '/api/cart' });
  await server.register(checkoutRoutes, { prefix: '/api/checkout' });
  await server.register(orderRoutes, { prefix: '/api/orders' });
  await server.register(paymentRoutes, { prefix: '/api/payments' });
  await server.register(reviewRoutes, { prefix: '/api/reviews' });
  await server.register(wishlistRoutes, { prefix: '/api/wishlist' });
  await server.register(promoRoutes, { prefix: '/api/promos' });
  await server.register(uploadRoutes, { prefix: '/api/upload' });
  await server.register(quizRoutes, { prefix: '/api/quiz' });
  await server.register(collectionRoutes, { prefix: '/api/collections' });
  await server.register(subscriptionRoutes, { prefix: '/api/subscriptions' });
  await server.register(articleRoutes, { prefix: '/api/articles' });
  await server.register(bannerRoutes, { prefix: '/api/banners' });
  await server.register(reportRoutes, { prefix: '/api/reports' });
  await server.register(faqRoutes, { prefix: '/api/faq' });
  await server.register(stockRoutes, { prefix: '/api/stock' });

  // Start server
  try {
    await server.listen({ port: config.port, host: config.host });
    console.log(`🚀 Server running on http://${config.host}:${config.port}`);
    console.log(`📦 Environment: ${config.nodeEnv}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown with timeout
const signals = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    server.log.info(`Received ${signal}, shutting down...`);
    const forceExit = setTimeout(() => {
      server.log.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
    try {
      await server.close();
      redis.disconnect();
    } catch (err) {
      server.log.error(err, 'Error during shutdown');
    }
    clearTimeout(forceExit);
    process.exit(0);
  });
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  server.log.error(error, 'Uncaught Exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  server.log.error(reason as Error, 'Unhandled Rejection');
});

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
