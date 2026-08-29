import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { requireAdmin } from '../../middleware/auth';

export async function categoryRoutes(app: FastifyInstance) {
  // ==================== LIST CATEGORIES (TREE) ====================
  app.get('/', async (request, reply) => {
    const categories: any[] = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { products: true } },
        children: {
          include: { _count: { select: { products: true } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    // Hanya return root categories (parentId = null)
    const rootCategories = categories.filter((c) => !c.parentId);

    return reply.status(200).send({ success: true, data: rootCategories });
  });

  // ==================== GET CATEGORY BY SLUG ====================
  app.get('/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const { page = '1', limit = '12' } = request.query as {
      page?: string;
      limit?: string;
    };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        products: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            comparePrice: true,
            images: true,
            status: true,
            createdAt: true,
            _count: { select: { reviews: true } },
          },
        },
        children: {
          include: {
            _count: { select: { products: true } },
          },
        },
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Kategori tidak ditemukan' },
      });
    }

    const totalProducts = await prisma.product.count({
      where: { categoryId: category.id, status: 'ACTIVE' },
    });

    return reply.status(200).send({
      success: true,
      data: {
        ...category,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalProducts,
          totalPages: Math.ceil(totalProducts / limitNum),
        },
      },
    });
  });

  // ==================== ADMIN: LIST ALL CATEGORIES ====================
  app.get('/admin/all', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { products: true } },
        parent: { select: { id: true, name: true } },
      },
    });

    return reply.status(200).send({ success: true, data: categories });
  });

  // ==================== ADMIN: CREATE CATEGORY ====================
  app.post('/admin', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const body = request.body as {
      name: string;
      description?: string;
      image?: string;
      parentId?: string;
      sortOrder?: number;
    };

    if (!body.name) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Nama kategori diperlukan' },
      });
    }

    const slug = body.name
      .toLowerCase()
      .replace(/[^\w ]+/g, '')
      .replace(/ +/g, '-');

    // Cek slug unik
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      return reply.status(409).send({
        success: false,
        error: { code: 'CONFLICT', message: 'Kategori dengan nama serupa sudah ada' },
      });
    }

    const category = await prisma.category.create({
      data: {
        name: body.name,
        slug,
        description: body.description,
        image: body.image,
        parentId: body.parentId,
        sortOrder: body.sortOrder || 0,
      },
    });

    return reply.status(201).send({ success: true, data: category });
  });

  // ==================== ADMIN: UPDATE CATEGORY ====================
  app.put('/admin/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      name?: string;
      description?: string;
      image?: string;
      parentId?: string;
      sortOrder?: number;
    };

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Kategori tidak ditemukan' },
      });
    }

    // Cegah parent loop
    if (body.parentId === id) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Kategori tidak bisa jadi parent diri sendiri' },
      });
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.image !== undefined && { image: body.image }),
        ...(body.parentId !== undefined && { parentId: body.parentId }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      },
    });

    return reply.status(200).send({ success: true, data: category });
  });

  // ==================== ADMIN: DELETE CATEGORY ====================
  app.delete('/admin/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Kategori tidak ditemukan' },
      });
    }

    if (existing._count.products > 0) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'HAS_PRODUCTS',
          message: `Tidak bisa hapus: ada ${existing._count.products} produk dalam kategori ini`,
        },
      });
    }

    await prisma.category.delete({ where: { id } });

    return reply.status(200).send({
      success: true,
      data: { message: 'Kategori berhasil dihapus' },
    });
  });
}
