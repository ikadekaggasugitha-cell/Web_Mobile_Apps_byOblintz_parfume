import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, and, or, desc, asc, count, ilike, gte, lte, sql, inArray, ne } from 'drizzle-orm';
import { db } from '../../db';
import { products, categories, reviews, orderItems, users } from '../../db/schema';
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

    const conditions = [eq(products.status, 'ACTIVE')];

    if (category) {
      conditions.push(eq(categories.slug, category));
    }

    if (search) {
      conditions.push(
        or(
          ilike(products.name, `%${search}%`),
          ilike(products.description, `%${search}%`),
          ilike(products.sku, `%${search}%`),
        )!
      );
    }

    if (minPrice) {
      conditions.push(gte(products.price, minPrice));
    }
    if (maxPrice) {
      conditions.push(lte(products.price, maxPrice));
    }

    if (occasion) {
      conditions.push(sql`${products.occasions} @> ARRAY[${occasion}]::text[]`);
    }

    const orderByClause = (() => {
      switch (sort) {
        case 'price_asc': return asc(products.price);
        case 'price_desc': return desc(products.price);
        case 'name': return asc(products.name);
        default: return desc(products.createdAt);
      }
    })();

    const [productsList, [{ total }]] = await Promise.all([
      db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          description: products.description,
          price: products.price,
          comparePrice: products.comparePrice,
          stock: products.stock,
          sku: products.sku,
          weight: products.weight,
          categoryId: products.categoryId,
          notes: products.notes,
          occasions: products.occasions,
          status: products.status,
          images: products.images,
          metaTitle: products.metaTitle,
          metaDesc: products.metaDesc,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
          category: {
            id: categories.id,
            name: categories.name,
            slug: categories.slug,
            description: categories.description,
            image: categories.image,
            parentId: categories.parentId,
            sortOrder: categories.sortOrder,
            createdAt: categories.createdAt,
          },
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(and(...conditions))
        .orderBy(orderByClause)
        .limit(limitNum)
        .offset(skip),
      db
        .select({ total: count() })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(and(...conditions)),
    ]);

    const productIds = productsList.map((p) => p.id);
    const reviewCounts = productIds.length
      ? await db
          .select({ productId: reviews.productId, count: count() })
          .from(reviews)
          .groupBy(reviews.productId)
      : [];

    const reviewCountMap = new Map<string, number>();
    for (const row of reviewCounts) {
      reviewCountMap.set(row.productId, Number(row.count));
    }

    const enrichedProducts = productsList.map((p) => ({
      ...p,
      _count: { reviews: reviewCountMap.get(p.id) || 0 },
    }));

    if (sort === 'popular') {
      enrichedProducts.sort(
        (a, b) => (b._count.reviews || 0) - (a._count.reviews || 0)
      );
    }

    return reply.status(200).send({
      success: true,
      data: {
        products: enrichedProducts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / limitNum),
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

    const searchConditions = [
      eq(products.status, 'ACTIVE'),
      or(
        ilike(products.name, `%${q}%`),
        ilike(products.description, `%${q}%`),
        ilike(products.sku, `%${q}%`),
      )!,
    ];

    const [productsList, [{ total }]] = await Promise.all([
      db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          description: products.description,
          price: products.price,
          comparePrice: products.comparePrice,
          stock: products.stock,
          sku: products.sku,
          weight: products.weight,
          categoryId: products.categoryId,
          notes: products.notes,
          occasions: products.occasions,
          status: products.status,
          images: products.images,
          metaTitle: products.metaTitle,
          metaDesc: products.metaDesc,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
          category: {
            id: categories.id,
            name: categories.name,
            slug: categories.slug,
            description: categories.description,
            image: categories.image,
            parentId: categories.parentId,
            sortOrder: categories.sortOrder,
            createdAt: categories.createdAt,
          },
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(and(...searchConditions))
        .orderBy(desc(products.createdAt))
        .limit(limitNum)
        .offset(skip),
      db
        .select({ total: count() })
        .from(products)
        .where(and(...searchConditions)),
    ]);

    const productIds = productsList.map((p) => p.id);
    const reviewCounts = productIds.length
      ? await db
          .select({ productId: reviews.productId, count: count() })
          .from(reviews)
          .groupBy(reviews.productId)
      : [];

    const reviewCountMap = new Map<string, number>();
    for (const row of reviewCounts) {
      reviewCountMap.set(row.productId, Number(row.count));
    }

    const enrichedProducts = productsList.map((p) => ({
      ...p,
      _count: { reviews: reviewCountMap.get(p.id) || 0 },
    }));

    return reply.status(200).send({
      success: true,
      data: {
        query: q,
        products: enrichedProducts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / limitNum),
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

    const [product] = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        description: products.description,
        price: products.price,
        comparePrice: products.comparePrice,
        stock: products.stock,
        sku: products.sku,
        weight: products.weight,
        categoryId: products.categoryId,
        notes: products.notes,
        occasions: products.occasions,
        status: products.status,
        images: products.images,
        metaTitle: products.metaTitle,
        metaDesc: products.metaDesc,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
        },
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.slug, slug))
      .limit(1);

    if (!product) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Produk tidak ditemukan' },
      });
    }

    const [productReviews, [{ total: reviewTotal }], [stats]] = await Promise.all([
      db
        .select({
          id: reviews.id,
          userId: reviews.userId,
          productId: reviews.productId,
          orderId: reviews.orderId,
          rating: reviews.rating,
          comment: reviews.comment,
          images: reviews.images,
          status: reviews.status,
          createdAt: reviews.createdAt,
          user: {
            id: users.id,
            name: users.name,
            avatar: users.avatar,
          },
        })
        .from(reviews)
        .innerJoin(users, eq(reviews.userId, users.id))
        .where(and(eq(reviews.productId, product.id), eq(reviews.status, 'APPROVED')))
        .orderBy(desc(reviews.createdAt))
        .limit(reviewLimitNum)
        .offset(reviewSkip),
      db
        .select({ total: count() })
        .from(reviews)
        .where(and(eq(reviews.productId, product.id), eq(reviews.status, 'APPROVED'))),
      db
        .select({
          avgRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
          totalReviews: count(),
        })
        .from(reviews)
        .where(and(eq(reviews.productId, product.id), eq(reviews.status, 'APPROVED'))),
    ]);

    return reply.status(200).send({
      success: true,
      data: {
        ...product,
        avgRating: stats ? Math.round(Number(stats.avgRating) * 10) / 10 : 0,
        reviews: productReviews,
        reviewPagination: {
          page: reviewPageNum,
          limit: reviewLimitNum,
          total: Number(reviewTotal),
          totalPages: Math.ceil(Number(reviewTotal) / reviewLimitNum),
        },
      },
    });
  });

  // ==================== RELATED PRODUCTS ====================
  app.get('/:slug/related', async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const [product] = await db
      .select({
        categoryId: products.categoryId,
        notes: products.notes,
        occasions: products.occasions,
      })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);

    if (!product) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Produk tidak ditemukan' },
      });
    }

    const related = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        description: products.description,
        price: products.price,
        comparePrice: products.comparePrice,
        stock: products.stock,
        sku: products.sku,
        weight: products.weight,
        categoryId: products.categoryId,
        notes: products.notes,
        occasions: products.occasions,
        status: products.status,
        images: products.images,
        metaTitle: products.metaTitle,
        metaDesc: products.metaDesc,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          description: categories.description,
          image: categories.image,
          parentId: categories.parentId,
          sortOrder: categories.sortOrder,
          createdAt: categories.createdAt,
        },
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          eq(products.status, 'ACTIVE'),
          ne(products.slug, slug),
          product.categoryId ? eq(products.categoryId, product.categoryId) : sql`true`,
        )
      )
      .orderBy(desc(products.createdAt))
      .limit(5);

    const relatedIds = related.map((p) => p.id);
    const relatedReviewCounts = relatedIds.length
      ? await db
          .select({ productId: reviews.productId, count: count() })
          .from(reviews)
          .groupBy(reviews.productId)
      : [];

    const relatedReviewCountMap = new Map<string, number>();
    for (const row of relatedReviewCounts) {
      relatedReviewCountMap.set(row.productId, Number(row.count));
    }

    const enrichedRelated = related.map((p) => ({
      ...p,
      _count: { reviews: relatedReviewCountMap.get(p.id) || 0 },
    }));

    return reply.status(200).send({
      success: true,
      data: enrichedRelated,
    });
  });

  // ==================== ADMIN: GET PRODUCT BY ID ====================
  app.get('/admin/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [product] = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        description: products.description,
        price: products.price,
        comparePrice: products.comparePrice,
        stock: products.stock,
        sku: products.sku,
        weight: products.weight,
        categoryId: products.categoryId,
        notes: products.notes,
        occasions: products.occasions,
        status: products.status,
        images: products.images,
        metaTitle: products.metaTitle,
        metaDesc: products.metaDesc,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        category: {
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          description: categories.description,
          image: categories.image,
          parentId: categories.parentId,
          sortOrder: categories.sortOrder,
          createdAt: categories.createdAt,
        },
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.id, id))
      .limit(1);

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

    const conditions: any[] = [];

    if (status) {
      conditions.push(eq(products.status, status as any));
    }
    if (category) {
      conditions.push(eq(categories.slug, category));
    }
    if (search) {
      conditions.push(
        or(
          ilike(products.name, `%${search}%`),
          ilike(products.sku, `%${search}%`),
        )!
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [productsList, [{ total }]] = await Promise.all([
      db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          description: products.description,
          price: products.price,
          comparePrice: products.comparePrice,
          stock: products.stock,
          sku: products.sku,
          weight: products.weight,
          categoryId: products.categoryId,
          notes: products.notes,
          occasions: products.occasions,
          status: products.status,
          images: products.images,
          metaTitle: products.metaTitle,
          metaDesc: products.metaDesc,
          createdAt: products.createdAt,
          updatedAt: products.updatedAt,
          category: {
            id: categories.id,
            name: categories.name,
            slug: categories.slug,
            description: categories.description,
            image: categories.image,
            parentId: categories.parentId,
            sortOrder: categories.sortOrder,
            createdAt: categories.createdAt,
          },
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(whereClause)
        .orderBy(desc(products.createdAt))
        .limit(limitNum)
        .offset(skip),
      db
        .select({ total: count() })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(whereClause),
    ]);

    const productIds = productsList.map((p) => p.id);
    const reviewCounts = productIds.length
      ? await db
          .select({ productId: reviews.productId, count: count() })
          .from(reviews)
          .groupBy(reviews.productId)
      : [];

    const orderItemCounts = productIds.length
      ? await db
          .select({ productId: orderItems.productId, count: count() })
          .from(orderItems)
          .groupBy(orderItems.productId)
      : [];

    const reviewCountMap = new Map<string, number>();
    for (const row of reviewCounts) {
      reviewCountMap.set(row.productId, Number(row.count));
    }

    const orderItemCountMap = new Map<string, number>();
    for (const row of orderItemCounts) {
      orderItemCountMap.set(row.productId, Number(row.count));
    }

    const enrichedProducts = productsList.map((p) => ({
      ...p,
      _count: {
        reviews: reviewCountMap.get(p.id) || 0,
        orderItems: orderItemCountMap.get(p.id) || 0,
      },
    }));

    return reply.status(200).send({
      success: true,
      data: {
        products: enrichedProducts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / limitNum),
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

      const slug = input.name
        .toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-');

      const [existing] = await db
        .select()
        .from(products)
        .where(eq(products.slug, slug))
        .limit(1);

      if (existing) {
        return reply.status(409).send({
          success: false,
          error: { code: 'CONFLICT', message: 'Produk dengan nama serupa sudah ada' },
        });
      }

      const [createdProduct] = await db
        .insert(products)
        .values({
          name: input.name,
          slug,
          description: input.description,
          price: String(input.price),
          comparePrice: input.comparePrice ? String(input.comparePrice) : null,
          stock: input.stock ?? 0,
          sku: input.sku,
          weight: input.weight ? String(input.weight) : null,
          categoryId: input.categoryId,
          notes: input.notes,
          occasions: input.occasions ?? [],
          status: input.status ?? 'DRAFT',
          images: input.images ?? [],
          metaTitle: input.metaTitle,
          metaDesc: input.metaDesc,
        })
        .returning();

      const [category] = createdProduct.categoryId
        ? await db
            .select()
            .from(categories)
            .where(eq(categories.id, createdProduct.categoryId))
            .limit(1)
        : [null];

      return reply.status(201).send({
        success: true,
        data: { ...createdProduct, category },
      });
    } catch (error) {
      return handleRouteError(error, reply);
    }
  });

  // ==================== ADMIN: UPDATE PRODUCT ====================
  app.put('/admin/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [existing] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Produk tidak ditemukan' },
      });
    }

    try {
      const input = productUpdateSchema.parse(request.body);

      const updateData: Record<string, any> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.price !== undefined) updateData.price = String(input.price);
      if (input.comparePrice !== undefined) updateData.comparePrice = input.comparePrice ? String(input.comparePrice) : null;
      if (input.stock !== undefined) updateData.stock = input.stock;
      if (input.sku !== undefined) updateData.sku = input.sku;
      if (input.weight !== undefined) updateData.weight = input.weight ? String(input.weight) : null;
      if (input.categoryId !== undefined) updateData.categoryId = input.categoryId;
      if (input.notes !== undefined) updateData.notes = input.notes;
      if (input.occasions !== undefined) updateData.occasions = input.occasions;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.images !== undefined) updateData.images = input.images;
      if (input.metaTitle !== undefined) updateData.metaTitle = input.metaTitle;
      if (input.metaDesc !== undefined) updateData.metaDesc = input.metaDesc;

      const [updated] = await db
        .update(products)
        .set(updateData)
        .where(eq(products.id, id))
        .returning();

      const [category] = updated.categoryId
        ? await db
            .select()
            .from(categories)
            .where(eq(categories.id, updated.categoryId))
            .limit(1)
        : [null];

      return reply.status(200).send({
        success: true,
        data: { ...updated, category },
      });
    } catch (error) {
      return handleRouteError(error, reply);
    }
  });

  // ==================== ADMIN: DELETE PRODUCT ====================
  app.delete('/admin/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [existing] = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Produk tidak ditemukan' },
      });
    }

    await db
      .update(products)
      .set({ status: 'ARCHIVED' })
      .where(eq(products.id, id));

    return reply.status(200).send({
      success: true,
      data: { message: 'Produk berhasil dihapus' },
    });
  });
}
