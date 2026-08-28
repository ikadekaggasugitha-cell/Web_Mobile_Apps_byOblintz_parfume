import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';

export async function categoryRoutes(app: FastifyInstance) {
  // Get all categories
  app.get('/', async (request, reply) => {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { products: true } },
      },
    });

    return reply.status(200).send({
      success: true,
      data: categories,
    });
  });

  // Get category by slug
  app.get('/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        products: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!category) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Category not found' },
      });
    }

    return reply.status(200).send({
      success: true,
      data: category,
    });
  });
}
