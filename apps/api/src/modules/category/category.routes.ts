import { FastifyInstance } from 'fastify';
import { eq, asc, count, and, isNull, isNotNull } from 'drizzle-orm';
import { db } from '../../db';
import { categories, products, reviews } from '../../db/schema';
import { requireAdmin } from '../../middleware/auth';

export async function categoryRoutes(app: FastifyInstance) {
  // ==================== LIST CATEGORIES (TREE) ====================
  app.get('/', async (request, reply) => {
    const allCategories = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        image: categories.image,
        parentId: categories.parentId,
        sortOrder: categories.sortOrder,
        createdAt: categories.createdAt,
      })
      .from(categories)
      .where(isNull(categories.deletedAt))
      .orderBy(asc(categories.sortOrder));

    const productCounts = await db
      .select({
        categoryId: products.categoryId,
        count: count(),
      })
      .from(products)
      .groupBy(products.categoryId);

    const countMap = new Map<string, number>();
    for (const row of productCounts) {
      if (row.categoryId) countMap.set(row.categoryId, Number(row.count));
    }

    const rootCategories = allCategories
      .filter((c) => !c.parentId)
      .map((root) => ({
        ...root,
        _count: { products: countMap.get(root.id) || 0 },
        children: allCategories
          .filter((c) => c.parentId === root.id)
          .map((child) => ({
            ...child,
            _count: { products: countMap.get(child.id) || 0 },
          })),
      }));

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

    const [category] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.slug, slug), isNull(categories.deletedAt)))
      .limit(1);

    if (!category) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Kategori tidak ditemukan' },
      });
    }

    const categoryProducts = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        price: products.price,
        comparePrice: products.comparePrice,
        images: products.images,
        status: products.status,
        createdAt: products.createdAt,
      })
      .from(products)
      .where(and(eq(products.categoryId, category.id), eq(products.status, 'ACTIVE')))
      .orderBy(asc(products.createdAt))
      .limit(limitNum)
      .offset(skip);

    const productIds = categoryProducts.map((p) => p.id);
    const reviewCounts = productIds.length
      ? await db
          .select({ productId: reviews.productId, count: count() })
          .from(reviews)
          .where(and(eq(reviews.status, 'APPROVED')))
          .groupBy(reviews.productId)
      : [];

    const reviewCountMap = new Map<string, number>();
    for (const row of reviewCounts) {
      reviewCountMap.set(row.productId, Number(row.count));
    }

    const productsWithCount = categoryProducts.map((p) => ({
      ...p,
      _count: { reviews: reviewCountMap.get(p.id) || 0 },
    }));

    const childrenData = await db
      .select()
      .from(categories)
      .where(and(eq(categories.parentId, category.id), isNull(categories.deletedAt)));

    const childProductCounts = await db
      .select({
        categoryId: products.categoryId,
        count: count(),
      })
      .from(products)
      .where(eq(products.status, 'ACTIVE'))
      .groupBy(products.categoryId);

    const childCountMap = new Map<string, number>();
    for (const row of childProductCounts) {
      if (row.categoryId) childCountMap.set(row.categoryId, Number(row.count));
    }

    const childrenWithCount = childrenData.map((child) => ({
      ...child,
      _count: { products: childCountMap.get(child.id) || 0 },
    }));

    const [{ total: totalProducts }] = await db
      .select({ total: count() })
      .from(products)
      .where(and(eq(products.categoryId, category.id), eq(products.status, 'ACTIVE')));

    return reply.status(200).send({
      success: true,
      data: {
        ...category,
        products: productsWithCount,
        children: childrenWithCount,
        _count: { products: Number(totalProducts) },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: Number(totalProducts),
          totalPages: Math.ceil(Number(totalProducts) / limitNum),
        },
      },
    });
  });

  // ==================== ADMIN: LIST ALL CATEGORIES ====================
  app.get('/admin/all', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { deleted } = request.query as { deleted?: string };

    // `?deleted=true` returns only trashed rows; otherwise only active rows.
    const trashFilter =
      deleted === 'true' ? isNotNull(categories.deletedAt) : isNull(categories.deletedAt);

    const allCategories = await db
      .select()
      .from(categories)
      .where(trashFilter)
      .orderBy(asc(categories.sortOrder));

    const productCounts = await db
      .select({
        categoryId: products.categoryId,
        count: count(),
      })
      .from(products)
      .groupBy(products.categoryId);

    const countMap = new Map<string, number>();
    for (const row of productCounts) {
      if (row.categoryId) countMap.set(row.categoryId, Number(row.count));
    }

    const result = allCategories.map((c) => ({
      ...c,
      _count: { products: countMap.get(c.id) || 0 },
      parent: c.parentId
        ? allCategories.find((p) => p.id === c.parentId)
          ? { id: allCategories.find((p) => p.id === c.parentId)!.id, name: allCategories.find((p) => p.id === c.parentId)!.name }
          : null
        : null,
    }));

    return reply.status(200).send({ success: true, data: result });
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

    const [existing] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);

    if (existing) {
      return reply.status(409).send({
        success: false,
        error: { code: 'CONFLICT', message: 'Kategori dengan nama serupa sudah ada' },
      });
    }

    const [category] = await db
      .insert(categories)
      .values({
        name: body.name,
        slug,
        description: body.description,
        image: body.image,
        parentId: body.parentId,
        sortOrder: body.sortOrder || 0,
      })
      .returning();

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

    const [existing] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Kategori tidak ditemukan' },
      });
    }

    if (body.parentId === id) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Kategori tidak bisa jadi parent diri sendiri' },
      });
    }

    const updateData: Record<string, any> = {};
    if (body.name) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.image !== undefined) updateData.image = body.image;
    if (body.parentId !== undefined) updateData.parentId = body.parentId;
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;

    const [category] = await db
      .update(categories)
      .set(updateData)
      .where(eq(categories.id, id))
      .returning();

    return reply.status(200).send({ success: true, data: category });
  });

  // ==================== ADMIN: SOFT DELETE CATEGORY (MOVE TO TRASH) ====================
  app.delete('/admin/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [existing] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Kategori tidak ditemukan' },
      });
    }

    const [{ productCount }] = await db
      .select({ productCount: count() })
      .from(products)
      .where(eq(products.categoryId, id));

    if (Number(productCount) > 0) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'HAS_PRODUCTS',
          message: `Tidak bisa hapus: ada ${productCount} produk dalam kategori ini`,
        },
      });
    }

    await db
      .update(categories)
      .set({ deletedAt: new Date() })
      .where(eq(categories.id, id));

    return reply.status(200).send({
      success: true,
      data: { message: 'Kategori dipindahkan ke sampah' },
    });
  });

  // ==================== ADMIN: RESTORE CATEGORY FROM TRASH ====================
  app.post('/admin/:id/restore', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [existing] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Kategori tidak ditemukan' },
      });
    }

    await db
      .update(categories)
      .set({ deletedAt: null })
      .where(eq(categories.id, id));

    return reply.status(200).send({
      success: true,
      data: { message: 'Kategori berhasil dipulihkan' },
    });
  });

  // ==================== ADMIN: PERMANENT DELETE CATEGORY ====================
  app.delete('/admin/:id/permanent', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [existing] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Kategori tidak ditemukan' },
      });
    }

    const [{ productCount }] = await db
      .select({ productCount: count() })
      .from(products)
      .where(eq(products.categoryId, id));

    if (Number(productCount) > 0) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'HAS_PRODUCTS',
          message: `Tidak bisa hapus permanen: ada ${productCount} produk dalam kategori ini`,
        },
      });
    }

    await db.delete(categories).where(eq(categories.id, id));

    return reply.status(200).send({
      success: true,
      data: { message: 'Kategori dihapus permanen' },
    });
  });
}
