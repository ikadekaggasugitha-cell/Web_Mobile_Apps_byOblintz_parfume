import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import { config } from './config';
import prisma from './config/database';
import { redis } from './config/redis';
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

const server = Fastify({
  logger: {
    level: config.nodeEnv === 'development' ? 'info' : 'warn',
  },
});

// ==================== GLOBAL ERROR HANDLER ====================
server.setErrorHandler((error, request, reply) => {
  server.log.error(error);

  // Prisma errors
  if (error.code === 'P2002') {
    return reply.status(409).send({
      success: false,
      error: { code: 'CONFLICT', message: 'Data sudah ada' },
    });
  }

  if (error.code === 'P2025') {
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

async function bootstrap() {
  // Register plugins
  await server.register(cors, config.cors);

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

  // Decorators
  server.decorate('prisma', prisma);
  server.decorate('redis', redis);

  // Health check
  server.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
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

// Graceful shutdown
const signals = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    console.log(`\n📴 Received ${signal}, shutting down...`);
    await server.close();
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  });
});

bootstrap();
