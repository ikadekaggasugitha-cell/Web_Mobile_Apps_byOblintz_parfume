import { FastifyInstance } from 'fastify';
import { db } from '../../db';
import { wishlists } from '../../db/schema/wishlists';
import { products, categories } from '../../db/schema/products';
import { reviews } from '../../db/schema/reviews';
import { eq, and, desc, count, inArray } from 'drizzle-orm';
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

    const where = eq(wishlists.userId, request.userId!);

    const [wishlistResult, totalResult] = await Promise.all([
      db
        .select({
          id: wishlists.id,
          userId: wishlists.userId,
          productId: wishlists.productId,
          createdAt: wishlists.createdAt,
          productName: products.name,
          productSlug: products.slug,
          productPrice: products.price,
          productComparePrice: products.comparePrice,
          productImages: products.images,
          productStatus: products.status,
          categoryName: categories.name,
        })
        .from(wishlists)
        .innerJoin(products, eq(wishlists.productId, products.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(where)
        .orderBy(desc(wishlists.createdAt))
        .limit(limitNum)
        .offset(skip),
      db
        .select({ count: count() })
        .from(wishlists)
        .where(where),
    ]);

    const productIds = wishlistResult.map((item) => item.productId);

    const reviewCounts = productIds.length > 0
      ? await db
          .select({
            productId: reviews.productId,
            count: count(),
          })
          .from(reviews)
          .where(inArray(reviews.productId, productIds))
          .groupBy(reviews.productId)
      : [];

    const reviewCountMap = new Map(reviewCounts.map((r) => [r.productId, r.count]));

    const items = wishlistResult.map((item) => ({
      id: item.id,
      userId: item.userId,
      productId: item.productId,
      createdAt: item.createdAt,
      product: {
        id: item.productId,
        name: item.productName,
        slug: item.productSlug,
        price: item.productPrice,
        comparePrice: item.productComparePrice,
        images: item.productImages,
        status: item.productStatus,
        category: { name: item.categoryName },
        _count: {
          reviews: Number(reviewCountMap.get(item.productId) ?? 0),
        },
      },
    }));

    const total = Number(totalResult[0].count);

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

    const productResult = await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.status, 'ACTIVE')))
      .limit(1);

    if (!productResult[0]) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Produk tidak ditemukan' },
      });
    }

    const existing = await db
      .select()
      .from(wishlists)
      .where(and(eq(wishlists.userId, request.userId!), eq(wishlists.productId, productId)))
      .limit(1);

    if (existing[0]) {
      return reply.status(409).send({
        success: false,
        error: { code: 'ALREADY_WISHLISTED', message: 'Produk sudah ada di wishlist' },
      });
    }

    const result = await db
      .insert(wishlists)
      .values({
        userId: request.userId!,
        productId,
      })
      .returning();

    const wishlistWithProduct = await db
      .select({
        id: wishlists.id,
        userId: wishlists.userId,
        productId: wishlists.productId,
        createdAt: wishlists.createdAt,
        productName: products.name,
        productSlug: products.slug,
        productPrice: products.price,
        productImages: products.images,
      })
      .from(wishlists)
      .innerJoin(products, eq(wishlists.productId, products.id))
      .where(eq(wishlists.id, result[0].id))
      .limit(1);

    const item = wishlistWithProduct[0];
    return reply.status(201).send({
      success: true,
      data: {
        id: item.id,
        userId: item.userId,
        productId: item.productId,
        createdAt: item.createdAt,
        product: {
          id: item.productId,
          name: item.productName,
          slug: item.productSlug,
          price: item.productPrice,
          images: item.productImages,
        },
      },
    });
  });

  // ==================== REMOVE FROM WISHLIST ====================
  app.delete('/:productId', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { productId } = request.params as { productId: string };

    const existing = await db
      .select()
      .from(wishlists)
      .where(and(eq(wishlists.userId, request.userId!), eq(wishlists.productId, productId)))
      .limit(1);

    if (!existing[0]) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Produk tidak ada di wishlist' },
      });
    }

    await db
      .delete(wishlists)
      .where(and(eq(wishlists.userId, request.userId!), eq(wishlists.productId, productId)));

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

    const existing = await db
      .select()
      .from(wishlists)
      .where(and(eq(wishlists.userId, request.userId!), eq(wishlists.productId, productId)))
      .limit(1);

    return reply.status(200).send({
      success: true,
      data: { isWishlisted: !!existing[0] },
    });
  });

  // ==================== TOGGLE WISHLIST ====================
  app.post('/toggle/:productId', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { productId } = request.params as { productId: string };

    const productResult = await db
      .select()
      .from(products)
      .where(and(eq(products.id, productId), eq(products.status, 'ACTIVE')))
      .limit(1);

    if (!productResult[0]) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Produk tidak ditemukan' },
      });
    }

    const existing = await db
      .select()
      .from(wishlists)
      .where(and(eq(wishlists.userId, request.userId!), eq(wishlists.productId, productId)))
      .limit(1);

    if (existing[0]) {
      await db
        .delete(wishlists)
        .where(and(eq(wishlists.userId, request.userId!), eq(wishlists.productId, productId)));

      return reply.status(200).send({
        success: true,
        data: { isWishlisted: false, message: 'Dihapus dari wishlist' },
      });
    } else {
      await db
        .insert(wishlists)
        .values({
          userId: request.userId!,
          productId,
        });

      return reply.status(201).send({
        success: true,
        data: { isWishlisted: true, message: 'Ditambahkan ke wishlist' },
      });
    }
  });
}
