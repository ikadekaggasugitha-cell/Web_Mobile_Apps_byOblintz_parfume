import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';

const prisma = vi.hoisted(() => ({
  article: {
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/config/database', () => ({ default: prisma, prisma }));

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
  });

  // ==================== PUBLIC LIST ====================
  describe('GET /api/articles', () => {
    it('lists published articles with pagination', async () => {
      prisma.article.findMany.mockResolvedValue([makeArticle()]);
      prisma.article.count.mockResolvedValue(1);

      const res = await app.inject({ method: 'GET', url: '/api/articles' });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.articles).toHaveLength(1);
      expect(prisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'PUBLISHED' } })
      );
    });
  });

  // ==================== PUBLIC DETAIL ====================
  describe('GET /api/articles/:slug', () => {
    it('returns a published article', async () => {
      prisma.article.findUnique.mockResolvedValue(makeArticle());

      const res = await app.inject({ method: 'GET', url: '/api/articles/cara-memilih-parfum' });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.slug).toBe('cara-memilih-parfum');
    });

    it('returns 404 for a draft article', async () => {
      prisma.article.findUnique.mockResolvedValue(makeArticle({ status: 'DRAFT' }));

      const res = await app.inject({ method: 'GET', url: '/api/articles/cara-memilih-parfum' });

      expect(res.statusCode).toBe(404);
    });

    it('returns 404 when the article does not exist', async () => {
      prisma.article.findUnique.mockResolvedValue(null);

      const res = await app.inject({ method: 'GET', url: '/api/articles/ghost' });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('NOT_FOUND');
    });
  });

  // ==================== ADMIN LIST ====================
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
      prisma.article.findMany.mockResolvedValue([makeArticle({ status: 'DRAFT' })]);
      prisma.article.count.mockResolvedValue(1);

      const res = await app.inject({
        method: 'GET',
        url: '/api/articles/admin/all?status=DRAFT&search=parfum',
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.articles).toHaveLength(1);
    });
  });

  // ==================== ADMIN CREATE ====================
  describe('POST /api/articles/admin', () => {
    it('creates an article and generates a slug', async () => {
      prisma.article.findUnique.mockResolvedValue(null);
      prisma.article.create.mockResolvedValue(makeArticle());

      const res = await app.inject({
        method: 'POST',
        url: '/api/articles/admin',
        headers: adminHeader(app),
        payload: validBody,
      });

      expect(res.statusCode).toBe(201);
      expect(prisma.article.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: 'cara-memilih-parfum', author: 'Admin' }),
        })
      );
    });

    it('returns 409 when the slug already exists', async () => {
      prisma.article.findUnique.mockResolvedValue(makeArticle());

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

  // ==================== ADMIN UPDATE ====================
  describe('PUT /api/articles/admin/:id', () => {
    it('updates an existing article', async () => {
      prisma.article.findUnique.mockResolvedValue(makeArticle());
      prisma.article.update.mockResolvedValue(makeArticle({ title: 'Judul Baru' }));

      const res = await app.inject({
        method: 'PUT',
        url: `/api/articles/admin/${ARTICLE_ID}`,
        headers: adminHeader(app),
        payload: { title: 'Judul Baru', status: 'PUBLISHED' },
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.article.update).toHaveBeenCalled();
    });

    it('returns 404 when the article is missing', async () => {
      prisma.article.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/articles/admin/${ARTICLE_ID}`,
        headers: adminHeader(app),
        payload: { title: 'Judul Baru' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 400 VALIDATION_ERROR for an invalid update', async () => {
      prisma.article.findUnique.mockResolvedValue(makeArticle());

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

  // ==================== ADMIN DELETE ====================
  describe('DELETE /api/articles/admin/:id', () => {
    it('deletes an article', async () => {
      prisma.article.findUnique.mockResolvedValue(makeArticle());
      prisma.article.delete.mockResolvedValue(makeArticle());

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/articles/admin/${ARTICLE_ID}`,
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.article.delete).toHaveBeenCalledWith({ where: { id: ARTICLE_ID } });
    });

    it('returns 404 when the article is missing', async () => {
      prisma.article.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/articles/admin/${ARTICLE_ID}`,
        headers: adminHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
