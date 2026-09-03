import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import prisma from '../../config/database';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { handleRouteError } from '../../lib/errors';

const PRODUCT_STATUSES = ['ACTIVE', 'INACTIVE', 'DRAFT', 'ARCHIVED'] as const;

const productCreateSchema = z.object({
  name: z.string().min(1, 'Nama produk diperlukan'),
  description: z.string().optional(),
  price: z.number().positive('Harga harus lebih dari 0'),
  comparePrice: z.number().positive().optional().nullable(),
  stock: z.number().int().min(0).optional(),
  sku: z.string().optional(),
  weight: z.number().optional(),
  categoryId: z.string().uuid('Category ID tidak valid').optional(),
  notes: z.any().optional(),
  occasions: z.array(z.string()).optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  images: z.array(z.string()).optional(),
  metaTitle: z.string().optional(),
  metaDesc: z.string().optional(),
});

const productUpdateSchema = productCreateSchema.partial();

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

  // ==================== ADMIN: GET PRODUCT BY ID ====================
  app.get('/admin/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!product) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Produk tidak ditemukan' },
      });
    }

    return reply.status(200).send({ success: true, data: product });
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
    try {
      const input = productCreateSchema.parse(request.body);

      // Generate slug dari name
      const slug = input.name
        .toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-');

      // Cek slug unik agar tidak melempar error unique constraint dari Prisma
      const existing = await prisma.product.findUnique({ where: { slug } });
      if (existing) {
        return reply.status(409).send({
          success: false,
          error: { code: 'CONFLICT', message: 'Produk dengan nama serupa sudah ada' },
        });
      }

      const product = await prisma.product.create({
        data: {
          name: input.name,
          slug,
          description: input.description,
          price: input.price,
          comparePrice: input.comparePrice,
          stock: input.stock ?? 0,
          sku: input.sku,
          weight: input.weight,
          categoryId: input.categoryId,
          notes: input.notes,
          occasions: input.occasions ?? [],
          status: input.status ?? 'DRAFT',
          images: input.images ?? [],
          metaTitle: input.metaTitle,
          metaDesc: input.metaDesc,
        },
        include: { category: true },
      });

      return reply.status(201).send({ success: true, data: product });
    } catch (error) {
      return handleRouteError(error, reply);
    }
  });

  // ==================== ADMIN: UPDATE PRODUCT ====================
  app.put('/admin/:id', {
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

    try {
      const input = productUpdateSchema.parse(request.body);

      const product = await prisma.product.update({
        where: { id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.price !== undefined && { price: input.price }),
          ...(input.comparePrice !== undefined && { comparePrice: input.comparePrice }),
          ...(input.stock !== undefined && { stock: input.stock }),
          ...(input.sku !== undefined && { sku: input.sku }),
          ...(input.weight !== undefined && { weight: input.weight }),
          ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
          ...(input.notes !== undefined && { notes: input.notes }),
          ...(input.occasions !== undefined && { occasions: input.occasions }),
          ...(input.status !== undefined && { status: input.status }),
          ...(input.images !== undefined && { images: input.images }),
          ...(input.metaTitle !== undefined && { metaTitle: input.metaTitle }),
          ...(input.metaDesc !== undefined && { metaDesc: input.metaDesc }),
        },
        include: { category: true },
      });

      return reply.status(200).send({ success: true, data: product });
    } catch (error) {
      return handleRouteError(error, reply);
    }
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
