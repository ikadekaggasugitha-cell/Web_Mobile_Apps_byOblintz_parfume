import type { Database } from '../db';
import Redis from 'ioredis';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
    redis: Redis;
  }
}
