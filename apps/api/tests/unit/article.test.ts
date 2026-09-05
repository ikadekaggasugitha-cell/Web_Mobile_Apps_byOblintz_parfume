import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';

const { chain, returningResult, db } = vi.hoisted(() => {
  const chain: any = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.offset = vi.fn().mockReturnValue(chain);

  const returningResult = vi.fn();

  const db = {
    select: vi.fn().mockReturnValue(chain),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({ returning: returningResult }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ returning: returningResult }),
      }),
    }),
    delete: vi.fn().mockReturnValue({ where: vi.fn() }),
  };

  return { chain, returningResult, db };
});

vi.mock('@/db', () => ({ db }));

import { articleRoutes } from '@/modules/article/article.routes';

const ARTICLE_ID = 'article-1';

function userHeader(app: FastifyInstance) {
  return { authorization: `Bearer ${app.jwt.sign({ id: 'user-1' })}` };
}
function adminHeader(app: FastifyInstance) {
  return { authorization: `Bearer ${app.jwt.sign({ id: 'admin-1', role: 'ADMIN' })}` };
}

function makeArticle(overrides: Record<string, unknown> = {}) {
  return {
    id: ARTICLE_ID,
    title: 'Cara Memilih Parfum',
    slug: 'cara-memilih-parfum',
    content: 'Konten artikel yang panjang dan bermanfaat.',
    excerpt: 'Tips memilih parfum',
    imageUrl: null,
    author: 'Admin',
    status: 'PUBLISHED',
    ...overrides,
  };
}

const validBody = {
  title: 'Cara Memilih Parfum',
  content: 'Konten artikel yang panjang dan bermanfaat.',
};

describe('article module', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(jwt, { secret: 'test-jwt-secret-min-32-characters!!' });
    await app.register(articleRoutes, { prefix: '/api/articles' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    chain.from.mockReturnValue(chain);
    chain.where.mockReturnValue(chain);
    chain.orderBy.mockReturnValue(chain);
    chain.limit.mockReturnValue(chain);
    chain.offset.mockReturnValue(chain);
  });

  describe('GET /api/articles', () => {
    it('lists published articles with pagination', async () => {
      // Route: Promise.all([
      //   db.select({...}).from(articles).where().orderBy().limit().offset(),  // terminal: .offset()
      //   db.select({count}).from(articles).where(),                          // terminal: .where()
      // ])
      // Query 1 calls .where() too, so we need mockReturnValueOnce(chain) for it
      chain.where.mockReturnValueOnce(chain);
      chain.offset.mockResolvedValueOnce([makeArticle()]);
      chain.where.mockResolvedValueOnce([{ count: 1 }]);

      const res = await app.inject({ method: 'GET', url: '/api/articles' });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.articles).toHaveLength(1);
    });
  });

  describe('GET /api/articles/:slug', () => {
    it('returns a published article', async () => {
      chain.limit.mockResolvedValueOnce([makeArticle()]);

      const res = await app.inject({ method: 'GET', url: '/api/articles/cara-memilih-parfum' });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.slug).toBe('cara-memilih-parfum');
    });

    it('returns 404 for a draft article', async () => {
      chain.limit.mockResolvedValueOnce([makeArticle({ status: 'DRAFT' })]);

      const res = await app.inject({ method: 'GET', url: '/api/articles/cara-memilih-parfum' });

      expect(res.statusCode).toBe(404);
    });

    it('returns 404 when the article does not exist', async () => {
      chain.limit.mockResolvedValueOnce([]);

      const res = await app.inject({ method: 'GET', url: '/api/articles/ghost' });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/articles/admin/all', () => {
    it('rejects non-admin users (403)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/articles/admin/all',
        headers: userHeader(app),
      });

      expect(res.statusCode).toBe(403);
    });

    it('lists all articles for an admin with filters', async () => {
      // Same pattern as public list
      chain.where.mockReturnValueOnce(chain);
      chain.offset.mockResolvedValueOnce([makeArticle({ status: 'DRAFT' })]);
      chain.where.mockResolvedValueOnce([{ count: 1 }]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/articles/admin/all?status=DRAFT&search=parfum',
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.articles).toHaveLength(1);
    });
  });

  describe('POST /api/articles/admin', () => {
    it('creates an article and generates a slug', async () => {
      chain.limit.mockResolvedValueOnce([]);
      returningResult.mockResolvedValueOnce([makeArticle()]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/articles/admin',
        headers: adminHeader(app),
        payload: validBody,
      });

      expect(res.statusCode).toBe(201);
      expect(db.insert).toHaveBeenCalled();
    });

    it('returns 409 when the slug already exists', async () => {
      chain.limit.mockResolvedValueOnce([makeArticle()]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/articles/admin',
        headers: adminHeader(app),
        payload: validBody,
      });

      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe('CONFLICT');
    });

    it('returns 400 VALIDATION_ERROR for an invalid payload', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/articles/admin',
        headers: adminHeader(app),
        payload: { title: 'ab', content: 'x' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/articles/admin/:id', () => {
    it('updates an existing article', async () => {
      chain.limit.mockResolvedValueOnce([makeArticle()]);
      returningResult.mockResolvedValueOnce([makeArticle({ title: 'Judul Baru' })]);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/articles/admin/${ARTICLE_ID}`,
        headers: adminHeader(app),
        payload: { title: 'Judul Baru', status: 'PUBLISHED' },
      });

      expect(res.statusCode).toBe(200);
      expect(db.update).toHaveBeenCalled();
    });

    it('returns 404 when the article is missing', async () => {
      chain.limit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/articles/admin/${ARTICLE_ID}`,
        headers: adminHeader(app),
        payload: { title: 'Judul Baru' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 400 VALIDATION_ERROR for an invalid update', async () => {
      chain.limit.mockResolvedValueOnce([makeArticle()]);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/articles/admin/${ARTICLE_ID}`,
        headers: adminHeader(app),
        payload: { imageUrl: 'not-a-url' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/articles/admin/:id', () => {
    it('deletes an article', async () => {
      chain.limit.mockResolvedValueOnce([makeArticle()]);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/articles/admin/${ARTICLE_ID}`,
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(db.delete).toHaveBeenCalled();
    });

    it('returns 404 when the article is missing', async () => {
      chain.limit.mockResolvedValueOnce([]);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/articles/admin/${ARTICLE_ID}`,
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
