import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { requireAuth } from '../../middleware/auth';

export async function wishlistRoutes(app: FastifyInstance) {
  // ==================== GET WISHLIST ====================
  app.get('/', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { page = '1', limit = '20' } = request.query as {
      page?: string;
      limit?: string;
    };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      prisma.wishlist.findMany({
        where: { userId: request.userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          product: {
            include: {
              category: { select: { name: true } },
              _count: { select: { reviews: true } },
            },
          },
        },
      }),
      prisma.wishlist.count({ where: { userId: request.userId } }),
    ]);

    return reply.status(200).send({
      success: true,
      data: {
        items,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  });

  // ==================== ADD TO WISHLIST ====================
  app.post('/:productId', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { productId } = request.params as { productId: string };

    // Cek produk exists
    const product = await prisma.product.findUnique({
      where: { id: productId, status: 'ACTIVE' },
    });

    if (!product) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Produk tidak ditemukan' },
      });
    }

    // Cek sudah ada belum
    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId: request.userId!,
          productId,
        },
      },
    });

    if (existing) {
      return reply.status(409).send({
        success: false,
        error: { code: 'ALREADY_WISHLISTED', message: 'Produk sudah ada di wishlist' },
      });
    }

    const wishlist = await prisma.wishlist.create({
      data: {
        userId: request.userId!,
        productId,
      },
      include: {
        product: { select: { id: true, name: true, slug: true, price: true, images: true } },
      },
    });

    return reply.status(201).send({ success: true, data: wishlist });
  });

  // ==================== REMOVE FROM WISHLIST ====================
  app.delete('/:productId', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { productId } = request.params as { productId: string };

    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId: request.userId!,
          productId,
        },
      },
    });

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Produk tidak ada di wishlist' },
      });
    }

    await prisma.wishlist.delete({
      where: {
        userId_productId: {
          userId: request.userId!,
          productId,
        },
      },
    });

    return reply.status(200).send({
      success: true,
      data: { message: 'Produk dihapus dari wishlist' },
    });
  });

  // ==================== CHECK IF WISHLISTED ====================
  app.get('/check/:productId', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { productId } = request.params as { productId: string };

    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId: request.userId!,
          productId,
        },
      },
    });

    return reply.status(200).send({
      success: true,
      data: { isWishlisted: !!existing },
    });
  });

  // ==================== TOGGLE WISHLIST ====================
  app.post('/toggle/:productId', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { productId } = request.params as { productId: string };

    // Cek produk exists
    const product = await prisma.product.findUnique({
      where: { id: productId, status: 'ACTIVE' },
    });

    if (!product) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Produk tidak ditemukan' },
      });
    }

    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId: request.userId!,
          productId,
        },
      },
    });

    if (existing) {
      await prisma.wishlist.delete({
        where: {
          userId_productId: {
            userId: request.userId!,
            productId,
          },
        },
      });

      return reply.status(200).send({
        success: true,
        data: { isWishlisted: false, message: 'Dihapus dari wishlist' },
      });
    } else {
      await prisma.wishlist.create({
        data: {
          userId: request.userId!,
          productId,
        },
      });

      return reply.status(201).send({
        success: true,
        data: { isWishlisted: true, message: 'Ditambahkan ke wishlist' },
      });
    }
  });
}
