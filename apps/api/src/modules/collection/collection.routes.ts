import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { requireAuth } from '../../middleware/auth';

export async function collectionRoutes(app: FastifyInstance) {
  // ==================== GET USER COLLECTIONS ====================
  app.get('/', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const collections = await prisma.collection.findMany({
      where: { userId: request.userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: { select: { name: true } },
                _count: { select: { reviews: true } },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.status(200).send({ success: true, data: collections });
  });

  // ==================== CREATE COLLECTION ====================
  app.post('/', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { name } = request.body as { name: string };

    if (!name || name.trim().length === 0) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Nama koleksi diperlukan' },
      });
    }

    const collection = await prisma.collection.create({
      data: {
        userId: request.userId!,
        name: name.trim(),
      },
    });

    return reply.status(201).send({ success: true, data: collection });
  });

  // ==================== GET COLLECTION DETAIL ====================
  app.get('/:id', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const collection = await prisma.collection.findFirst({
      where: { id, userId: request.userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: { select: { name: true } },
                _count: { select: { reviews: true } },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!collection) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Koleksi tidak ditemukan' },
      });
    }

    return reply.status(200).send({ success: true, data: collection });
  });

  // ==================== UPDATE COLLECTION ====================
  app.put('/:id', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name } = request.body as { name: string };

    const collection = await prisma.collection.findFirst({
      where: { id, userId: request.userId },
    });

    if (!collection) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Koleksi tidak ditemukan' },
      });
    }

    const updated = await prisma.collection.update({
      where: { id },
      data: { name: name || collection.name },
    });

    return reply.status(200).send({ success: true, data: updated });
  });

  // ==================== DELETE COLLECTION ====================
  app.delete('/:id', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const collection = await prisma.collection.findFirst({
      where: { id, userId: request.userId },
    });

    if (!collection) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Koleksi tidak ditemukan' },
      });
    }

    await prisma.collectionItem.deleteMany({ where: { collectionId: id } });
    await prisma.collection.delete({ where: { id } });

    return reply.status(200).send({
      success: true,
      data: { message: 'Koleksi berhasil dihapus' },
    });
  });

  // ==================== ADD PRODUCT TO COLLECTION ====================
  app.post('/:id/products', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { productId } = request.body as { productId: string };

    const collection = await prisma.collection.findFirst({
      where: { id, userId: request.userId },
    });

    if (!collection) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Koleksi tidak ditemukan' },
      });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Produk tidak ditemukan' },
      });
    }

    // Cek duplikat
    const existing = await prisma.collectionItem.findFirst({
      where: { collectionId: id, productId },
    });

    if (existing) {
      return reply.status(409).send({
        success: false,
        error: { code: 'CONFLICT', message: 'Produk sudah ada di koleksi' },
      });
    }

    // Get sort order
    const count = await prisma.collectionItem.count({
      where: { collectionId: id },
    });

    await prisma.collectionItem.create({
      data: {
        collectionId: id,
        productId,
        sortOrder: count,
      },
    });

    return reply.status(201).send({
      success: true,
      data: { message: 'Produk ditambahkan ke koleksi' },
    });
  });

  // ==================== REMOVE PRODUCT FROM COLLECTION ====================
  app.delete('/:id/products/:productId', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { id, productId } = request.params as { id: string; productId: string };

    const collection = await prisma.collection.findFirst({
      where: { id, userId: request.userId },
    });

    if (!collection) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Koleksi tidak ditemukan' },
      });
    }

    const item = await prisma.collectionItem.findFirst({
      where: { collectionId: id, productId },
    });

    if (!item) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Produk tidak ada di koleksi' },
      });
    }

    await prisma.collectionItem.delete({ where: { id: item.id } });

    return reply.status(200).send({
      success: true,
      data: { message: 'Produk dihapus dari koleksi' },
    });
  });
}
