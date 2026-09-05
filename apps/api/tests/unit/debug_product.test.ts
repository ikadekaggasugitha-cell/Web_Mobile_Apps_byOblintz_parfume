import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';

const { chain, returningResult, db } = vi.hoisted(() => {
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
    innerJoin: vi.fn(),
    leftJoin: vi.fn(),
    groupBy: vi.fn(),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.offset.mockReturnValue(chain);
  chain.innerJoin.mockReturnValue(chain);
  chain.leftJoin.mockReturnValue(chain);
  chain.groupBy.mockReturnValue(chain);

  const returningResult = vi.fn();

  const db = {
    select: vi.fn().mockReturnValue(chain),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: returningResult,
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: returningResult,
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn(),
    }),
    execute: vi.fn(),
  };

  return { chain, returningResult, db };
});

vi.mock('@/db', () => ({ db }));

import { productRoutes } from '@/modules/product/product.routes';

describe('debug product', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(jwt, { secret: 'test-jwt-secret-min-32-characters!!' });
    await app.register(productRoutes, { prefix: '/api/products' });
    await app.ready();
  });

  afterAll(async () => { await app.close(); });

  beforeEach(() => {
    vi.clearAllMocks();
    chain.from.mockReturnValue(chain);
    chain.where.mockReturnValue(chain);
    chain.orderBy.mockReturnValue(chain);
    chain.limit.mockReturnValue(chain);
    chain.offset.mockReturnValue(chain);
    chain.innerJoin.mockReturnValue(chain);
    chain.leftJoin.mockReturnValue(chain);
    chain.groupBy.mockReturnValue(chain);
  });

  it('debug list', async () => {
    // Track which terminal methods are called
    chain.from.mockImplementation((...args: any[]) => { console.log('chain.from called'); return chain; });
    chain.leftJoin.mockImplementation((...args: any[]) => { console.log('chain.leftJoin called'); return chain; });
    chain.where.mockImplementation((...args: any[]) => { console.log('chain.where called'); return chain; });
    chain.orderBy.mockImplementation((...args: any[]) => { console.log('chain.orderBy called'); return chain; });
    chain.limit.mockImplementation((...args: any[]) => { console.log('chain.limit called'); return chain; });
    chain.offset.mockImplementation((...args: any[]) => { console.log('chain.offset called - SHOULD RESOLVE'); return Promise.resolve([{}]); });

    const res = await app.inject({ method: 'GET', url: '/api/products' });
    console.log('status:', res.statusCode);
    if (res.statusCode !== 200) {
      console.log('body:', res.body);
    }
  });
});
