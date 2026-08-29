import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { requireAuth, requireAdmin } from '../../middleware/auth';

export async function productRoutes(app: FastifyInstance) {
  // ==================== LIST PRODUCTS ====================
  app.get('/', async (request, reply) => {
    const {
      page = '1',
      limit = '12',
      sort = 'newest',
      category,
      search,
      minPrice,
      maxPrice,
      occasion,
    } = request.query as {
      page?: string;
      limit?: string;
      sort?: string;
      category?: string;
      search?: string;
      minPrice?: string;
      maxPrice?: string;
      occasion?: string;
    };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { status: 'ACTIVE' };

    if (category) {
      where.category = { slug: category };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    if (occasion) {
      where.occasions = { has: occasion };
    }

    const orderBy: any = (() => {
      switch (sort) {
        case 'price_asc': return { price: 'asc' as const };
        case 'price_desc': return { price: 'desc' as const };
        case 'popular': return { reviews: { _count: 'desc' as const } };
        case 'name': return { name: 'asc' as const };
        default: return { createdAt: 'desc' as const };
      }
    })();

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          category: true,
          _count: { select: { reviews: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return reply.status(200).send({
      success: true,
      data: {
        products,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  });

  // ==================== SEARCH PRODUCTS ====================
  app.get('/search', async (request, reply) => {
    const { q, page = '1', limit = '12' } = request.query as {
      q?: string;
      page?: string;
      limit?: string;
    };

    if (!q || q.trim().length === 0) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Query pencarian diperlukan' },
      });
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where = {
      status: 'ACTIVE' as const,
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { description: { contains: q, mode: 'insensitive' as const } },
        { sku: { contains: q, mode: 'insensitive' as const } },
      ],
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' as const },
        skip,
        take: limitNum,
        include: {
          category: true,
          _count: { select: { reviews: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return reply.status(200).send({
      success: true,
      data: {
        query: q,
        products,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  });

  // ==================== GET PRODUCT BY SLUG ====================
  app.get('/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const { reviewPage = '1', reviewLimit = '5' } = request.query as {
      reviewPage?: string;
      reviewLimit?: string;
    };

    const reviewPageNum = Math.max(1, parseInt(reviewPage));
    const reviewLimitNum = Math.min(50, Math.max(1, parseInt(reviewLimit)));
    const reviewSkip = (reviewPageNum - 1) * reviewLimitNum;

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { reviews: true } },
      },
    });

    if (!product) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Produk tidak ditemukan' },
      });
    }

    // Fetch reviews separately with pagination
    const [reviews, reviewTotal] = await Promise.all([
      prisma.review.findMany({
        where: { productId: product.id, status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        skip: reviewSkip,
        take: reviewLimitNum,
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
      }),
      prisma.review.count({
        where: { productId: product.id, status: 'APPROVED' },
      }),
    ]);

    // Hitung rata-rata rating
    const stats = await prisma.review.aggregate({
      where: { productId: product.id, status: 'APPROVED' },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return reply.status(200).send({
      success: true,
      data: {
        ...product,
        avgRating: stats._avg.rating ? Math.round(stats._avg.rating * 10) / 10 : 0,
        reviews,
        reviewPagination: {
          page: reviewPageNum,
          limit: reviewLimitNum,
          total: reviewTotal,
          totalPages: Math.ceil(reviewTotal / reviewLimitNum),
        },
      },
    });
  });

  // ==================== RELATED PRODUCTS ====================
  app.get('/:slug/related', async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const product = await prisma.product.findUnique({
      where: { slug },
      select: { categoryId: true, notes: true, occasions: true },
    });

    if (!product) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Produk tidak ditemukan' },
      });
    }

    // Cari produk sejenis berdasarkan category + notes overlap
    const related = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        NOT: { slug },
        OR: [
          { categoryId: product.categoryId },
        ],
      },
      take: 5,
      include: {
        category: true,
        _count: { select: { reviews: true } },
      },
      orderBy: { createdAt: 'desc' as const },
    });

    return reply.status(200).send({
      success: true,
      data: related,
    });
  });

  // ==================== ADMIN: LIST ALL PRODUCTS ====================
  app.get('/admin/all', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const {
      page = '1',
      limit = '20',
      status,
      category,
      search,
    } = request.query as {
      page?: string;
      limit?: string;
      status?: string;
      category?: string;
      search?: string;
    };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (status) where.status = status;
    if (category) where.category = { slug: category };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          category: true,
          _count: { select: { reviews: true, orderItems: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return reply.status(200).send({
      success: true,
      data: {
        products,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  });

  // ==================== ADMIN: CREATE PRODUCT ====================
  app.post('/admin', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const body = request.body as any;

    // Generate slug dari name
    const slug = body.name
      .toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');

    const product = await prisma.product.create({
      data: {
        name: body.name,
        slug,
        description: body.description,
        price: body.price,
        comparePrice: body.comparePrice,
        stock: body.stock || 0,
        sku: body.sku,
        weight: body.weight,
        categoryId: body.categoryId,
        notes: body.notes,
        occasions: body.occasions || [],
        status: body.status || 'DRAFT',
        images: body.images || [],
        metaTitle: body.metaTitle,
        metaDesc: body.metaDesc,
      },
      include: { category: true },
    });

    return reply.status(201).send({ success: true, data: product });
  });

  // ==================== ADMIN: UPDATE PRODUCT ====================
  app.put('/admin/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Produk tidak ditemukan' },
      });
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.price && { price: body.price }),
        ...(body.comparePrice !== undefined && { comparePrice: body.comparePrice }),
        ...(body.stock !== undefined && { stock: body.stock }),
        ...(body.sku !== undefined && { sku: body.sku }),
        ...(body.weight !== undefined && { weight: body.weight }),
        ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
        ...(body.notes && { notes: body.notes }),
        ...(body.occasions && { occasions: body.occasions }),
        ...(body.status && { status: body.status }),
        ...(body.images && { images: body.images }),
        ...(body.metaTitle !== undefined && { metaTitle: body.metaTitle }),
        ...(body.metaDesc !== undefined && { metaDesc: body.metaDesc }),
      },
      include: { category: true },
    });

    return reply.status(200).send({ success: true, data: product });
  });

  // ==================== ADMIN: DELETE PRODUCT ====================
  app.delete('/admin/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Produk tidak ditemukan' },
      });
    }

    // Soft delete - ubah status ke ARCHIVED
    await prisma.product.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    return reply.status(200).send({
      success: true,
      data: { message: 'Produk berhasil dihapus' },
    });
  });
}
