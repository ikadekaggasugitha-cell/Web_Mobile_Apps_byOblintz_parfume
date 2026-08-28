import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { config } from './config';
import prisma from './config/database';
import { redis } from './config/redis';
import authRoutes from './modules/auth/auth.routes';
import productRoutes from './modules/product/product.routes';
import categoryRoutes from './modules/category/category.routes';
import userRoutes from './modules/user/user.routes';

const server = Fastify({
  logger: {
    level: config.nodeEnv === 'development' ? 'info' : 'warn',
  },
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

  // Start server
  try {
    await server.listen({ port: config.port, host: config.host });
    console.log(`Server running on http://${config.host}:${config.port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
const signals = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    console.log(`Received ${signal}, shutting down...`);
    await server.close();
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  });
});

bootstrap();
