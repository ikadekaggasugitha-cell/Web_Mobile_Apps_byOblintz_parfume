import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { db } from '../../src/db';
import { products } from '../../src/db/schema';
import { sql } from 'drizzle-orm';
import { buildApp } from './helpers/buildApp';

// Only runs when a dedicated test database is configured.
// Set DATABASE_URL_TEST to enable.
const RUN = !!process.env.DATABASE_URL_TEST;
const suite = RUN ? describe : describe.skip;

const PREFIX = 'itest-';

suite('product integration — real database constraints', () => {
  let app: FastifyInstance;
  let adminToken: string;

  beforeAll(async () => {
    app = await buildApp();
    adminToken = app.jwt.sign({ id: 'itest-admin', role: 'ADMIN' });
  });

  afterAll(async () => {
    // Clean up anything this suite created.
    await db.delete(products).where(sql`${products.slug} LIKE ${PREFIX + '%'}`);
    await app.close();
  });

  it('connects to the database', async () => {
    const result = await db.execute(sql`SELECT 1 as ok`);
    expect(result).toBeTruthy();
  });

  it('creates a product then rejects a duplicate slug (real unique constraint → 409)', async () => {
    const name = `${PREFIX}amber ${Date.now()}`;
    const auth = { authorization: `Bearer ${adminToken}` };

    const first = await app.inject({
      method: 'POST',
      url: '/api/products/admin',
      headers: auth,
      payload: { name, price: 150000, status: 'ACTIVE' },
    });
    expect(first.statusCode).toBe(201);
    const slug = first.json().data.slug;

    // Same name → same slug → must be rejected, not a 500.
    const second = await app.inject({
      method: 'POST',
      url: '/api/products/admin',
      headers: auth,
      payload: { name, price: 150000 },
    });
    expect(second.statusCode).toBe(409);
    expect(second.json().error.code).toBe('CONFLICT');

    // And the created product is really readable by slug.
    const detail = await app.inject({ method: 'GET', url: `/api/products/${slug}` });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().data.slug).toBe(slug);
  });

  it('rejects invalid admin input against the real app (400)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/products/admin',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { description: 'no name/price' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });
});
