import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';

export async function productRoutes(app: FastifyInstance) {
  // Get all products
  app.get('/', async (request, reply) => {
    const { page = '1', limit = '12', sort = 'newest', category, search } = request.query as {
      page?: string;
      limit?: string;
      sort?: string;
      category?: string;
      search?: string;
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: any = { status: 'ACTIVE' };
    
    if (category) {
      where.category = { slug: category };
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = (() => {
      switch (sort) {
        case 'price_asc': return { price: 'asc' as const };
        case 'price_desc': return { price: 'desc' as const };
        case 'popular': return { reviews: { _count: 'desc' as const } };
        default: return { createdAt: 'desc' as const };
      }
    })();

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take,
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
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  });

  // Get product by slug
  app.get('/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        reviews: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' },
      });
    }

    return reply.status(200).send({
      success: true,
      data: product,
    });
  });
}
