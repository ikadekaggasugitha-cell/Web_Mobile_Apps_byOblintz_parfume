import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';

const prisma = vi.hoisted(() => ({
  collection: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  collectionItem: {
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  product: { findUnique: vi.fn() },
}));

vi.mock('@/config/database', () => ({ default: prisma, prisma }));

import { collectionRoutes } from '@/modules/collection/collection.routes';

const USER_ID = 'user-1';
const COL_ID = 'col-1';
const PID = 'prod-1';

function authHeader(app: FastifyInstance) {
  return { authorization: `Bearer ${app.jwt.sign({ id: USER_ID })}` };
}

function makeCollection(overrides: Record<string, unknown> = {}) {
  return { id: COL_ID, userId: USER_ID, name: 'Favorit Saya', ...overrides };
}

describe('collection module', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(jwt, { secret: 'test-jwt-secret-min-32-characters!!' });
    await app.register(collectionRoutes, { prefix: '/api/collections' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== LIST ====================
  describe('GET /api/collections', () => {
    it('lists the user collections', async () => {
      prisma.collection.findMany.mockResolvedValue([makeCollection()]);

      const res = await app.inject({ method: 'GET', url: '/api/collections', headers: authHeader(app) });

      expect(res.statusCode).toBe(200);
      expect(res.json().data).toHaveLength(1);
    });

    it('returns 401 without a token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/collections' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ==================== CREATE ====================
  describe('POST /api/collections', () => {
    it('creates a collection', async () => {
      prisma.collection.create.mockResolvedValue(makeCollection());

      const res = await app.inject({
        method: 'POST',
        url: '/api/collections',
        headers: authHeader(app),
        payload: { name: '  Favorit Saya  ' },
      });

      expect(res.statusCode).toBe(201);
      expect(prisma.collection.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { userId: USER_ID, name: 'Favorit Saya' } })
      );
    });

    it('returns 400 when the name is empty', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/collections',
        headers: authHeader(app),
        payload: { name: '   ' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ==================== DETAIL ====================
  describe('GET /api/collections/:id', () => {
    it('returns the collection detail', async () => {
      prisma.collection.findFirst.mockResolvedValue(makeCollection({ items: [] }));

      const res = await app.inject({
        method: 'GET',
        url: `/api/collections/${COL_ID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.id).toBe(COL_ID);
    });

    it('returns 404 when not owned', async () => {
      prisma.collection.findFirst.mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: `/api/collections/${COL_ID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== UPDATE ====================
  describe('PUT /api/collections/:id', () => {
    it('renames the collection', async () => {
      prisma.collection.findFirst.mockResolvedValue(makeCollection());
      prisma.collection.update.mockResolvedValue(makeCollection({ name: 'Koleksi Baru' }));

      const res = await app.inject({
        method: 'PUT',
        url: `/api/collections/${COL_ID}`,
        headers: authHeader(app),
        payload: { name: 'Koleksi Baru' },
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.collection.update).toHaveBeenCalledWith({
        where: { id: COL_ID },
        data: { name: 'Koleksi Baru' },
      });
    });

    it('returns 404 when the collection is not owned', async () => {
      prisma.collection.findFirst.mockResolvedValue(null);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/collections/${COL_ID}`,
        headers: authHeader(app),
        payload: { name: 'X' },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== DELETE ====================
  describe('DELETE /api/collections/:id', () => {
    it('deletes the collection and its items', async () => {
      prisma.collection.findFirst.mockResolvedValue(makeCollection());
      prisma.collectionItem.deleteMany.mockResolvedValue({ count: 2 });
      prisma.collection.delete.mockResolvedValue(makeCollection());

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/collections/${COL_ID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.collectionItem.deleteMany).toHaveBeenCalledWith({
        where: { collectionId: COL_ID },
      });
      expect(prisma.collection.delete).toHaveBeenCalledWith({ where: { id: COL_ID } });
    });

    it('returns 404 when the collection is not owned', async () => {
      prisma.collection.findFirst.mockResolvedValue(null);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/collections/${COL_ID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ==================== ADD PRODUCT ====================
  describe('POST /api/collections/:id/products', () => {
    it('adds a product to the collection', async () => {
      prisma.collection.findFirst.mockResolvedValue(makeCollection());
      prisma.product.findUnique.mockResolvedValue({ id: PID });
      prisma.collectionItem.findFirst.mockResolvedValue(null);
      prisma.collectionItem.count.mockResolvedValue(0);
      prisma.collectionItem.create.mockResolvedValue({ id: 'item-1' });

      const res = await app.inject({
        method: 'POST',
        url: `/api/collections/${COL_ID}/products`,
        headers: authHeader(app),
        payload: { productId: PID },
      });

      expect(res.statusCode).toBe(201);
      expect(prisma.collectionItem.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { collectionId: COL_ID, productId: PID, sortOrder: 0 } })
      );
    });

    it('returns 404 when the collection is not owned', async () => {
      prisma.collection.findFirst.mockResolvedValue(null);

      const res = await app.inject({
        method: 'POST',
        url: `/api/collections/${COL_ID}/products`,
        headers: authHeader(app),
        payload: { productId: PID },
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 404 when the product does not exist', async () => {
      prisma.collection.findFirst.mockResolvedValue(makeCollection());
      prisma.product.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'POST',
        url: `/api/collections/${COL_ID}/products`,
        headers: authHeader(app),
        payload: { productId: PID },
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 409 when the product is already in the collection', async () => {
      prisma.collection.findFirst.mockResolvedValue(makeCollection());
      prisma.product.findUnique.mockResolvedValue({ id: PID });
      prisma.collectionItem.findFirst.mockResolvedValue({ id: 'item-1' });

      const res = await app.inject({
        method: 'POST',
        url: `/api/collections/${COL_ID}/products`,
        headers: authHeader(app),
        payload: { productId: PID },
      });

      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe('CONFLICT');
    });
  });

  // ==================== REMOVE PRODUCT ====================
  describe('DELETE /api/collections/:id/products/:productId', () => {
    it('removes a product from the collection', async () => {
      prisma.collection.findFirst.mockResolvedValue(makeCollection());
      prisma.collectionItem.findFirst.mockResolvedValue({ id: 'item-1' });
      prisma.collectionItem.delete.mockResolvedValue({ id: 'item-1' });

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/collections/${COL_ID}/products/${PID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.collectionItem.delete).toHaveBeenCalledWith({ where: { id: 'item-1' } });
    });

    it('returns 404 when the collection is not owned', async () => {
      prisma.collection.findFirst.mockResolvedValue(null);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/collections/${COL_ID}/products/${PID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 404 when the product is not in the collection', async () => {
      prisma.collection.findFirst.mockResolvedValue(makeCollection());
      prisma.collectionItem.findFirst.mockResolvedValue(null);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/collections/${COL_ID}/products/${PID}`,
        headers: authHeader(app),
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
