import { FastifyInstance } from 'fastify';
import { eq, and, count, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { collections, collectionItems } from '../../db/schema/collections';
import { products } from '../../db/schema/products';
import { reviews } from '../../db/schema/reviews';
import { requireAuth } from '../../middleware/auth';

export async function collectionRoutes(app: FastifyInstance) {
  // ==================== GET USER COLLECTIONS ====================
  app.get('/', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const userCollections = await db.query.collections.findMany({
      where: eq(collections.userId, request.userId!),
      orderBy: (collections, { desc }) => [desc(collections.createdAt)],
      with: {
        items: {
          orderBy: (collectionItems, { asc }) => [asc(collectionItems.sortOrder)],
          with: {
            product: {
              with: {
                category: true,
              },
            },
          },
        },
      },
    });

    // Get review counts for each product
    const productIds = userCollections
      .flatMap(c => c.items.map(i => i.product.id));

    let reviewCounts: Record<string, number> = {};
    if (productIds.length > 0) {
      const counts = await db
        .select({ productId: reviews.productId, count: count() })
        .from(reviews)
        .where(inArray(reviews.productId, productIds))
        .groupBy(reviews.productId);

      reviewCounts = Object.fromEntries(counts.map(r => [r.productId, r.count]));
    }

    const data = userCollections.map(c => ({
      ...c,
      items: c.items.map(i => ({
        ...i,
        product: {
          ...i.product,
          _count: { reviews: reviewCounts[i.product.id] ?? 0 },
        },
      })),
    }));

    return reply.status(200).send({ success: true, data });
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

    const [collection] = await db.insert(collections).values({
      userId: request.userId!,
      name: name.trim(),
    }).returning();

    return reply.status(201).send({ success: true, data: collection });
  });

  // ==================== GET COLLECTION DETAIL ====================
  app.get('/:id', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [collection] = await db.query.collections.findMany({
      where: and(eq(collections.id, id), eq(collections.userId, request.userId!)),
      with: {
        items: {
          orderBy: (collectionItems, { asc }) => [asc(collectionItems.sortOrder)],
          with: {
            product: {
              with: {
                category: true,
              },
            },
          },
        },
      },
      limit: 1,
    });

    if (!collection) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Koleksi tidak ditemukan' },
      });
    }

    // Get review counts
    const productIds = collection.items.map(i => i.product.id);
    let reviewCounts: Record<string, number> = {};
    if (productIds.length > 0) {
      const counts = await db
        .select({ productId: reviews.productId, count: count() })
        .from(reviews)
        .where(inArray(reviews.productId, productIds))
        .groupBy(reviews.productId);

      reviewCounts = Object.fromEntries(counts.map(r => [r.productId, r.count]));
    }

    const data = {
      ...collection,
      items: collection.items.map(i => ({
        ...i,
        product: {
          ...i.product,
          _count: { reviews: reviewCounts[i.product.id] ?? 0 },
        },
      })),
    };

    return reply.status(200).send({ success: true, data });
  });

  // ==================== UPDATE COLLECTION ====================
  app.put('/:id', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name } = request.body as { name: string };

    const [existing] = await db.select().from(collections).where(
      and(eq(collections.id, id), eq(collections.userId, request.userId!))
    ).limit(1);

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Koleksi tidak ditemukan' },
      });
    }

    const [updated] = await db.update(collections).set({
      name: name || existing.name,
    }).where(eq(collections.id, id)).returning();

    return reply.status(200).send({ success: true, data: updated });
  });

  // ==================== DELETE COLLECTION ====================
  app.delete('/:id', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [existing] = await db.select().from(collections).where(
      and(eq(collections.id, id), eq(collections.userId, request.userId!))
    ).limit(1);

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Koleksi tidak ditemukan' },
      });
    }

    await db.delete(collectionItems).where(eq(collectionItems.collectionId, id));
    await db.delete(collections).where(eq(collections.id, id));

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

    const [existingCollection] = await db.select().from(collections).where(
      and(eq(collections.id, id), eq(collections.userId, request.userId!))
    ).limit(1);

    if (!existingCollection) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Koleksi tidak ditemukan' },
      });
    }

    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Produk tidak ditemukan' },
      });
    }

    // Cek duplikat
    const [existingItem] = await db.select().from(collectionItems).where(
      and(eq(collectionItems.collectionId, id), eq(collectionItems.productId, productId))
    ).limit(1);

    if (existingItem) {
      return reply.status(409).send({
        success: false,
        error: { code: 'CONFLICT', message: 'Produk sudah ada di koleksi' },
      });
    }

    // Get sort order
    const [{ itemCount }] = await db
      .select({ itemCount: count() })
      .from(collectionItems)
      .where(eq(collectionItems.collectionId, id));

    await db.insert(collectionItems).values({
      collectionId: id,
      productId,
      sortOrder: itemCount,
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

    const [existingCollection] = await db.select().from(collections).where(
      and(eq(collections.id, id), eq(collections.userId, request.userId!))
    ).limit(1);

    if (!existingCollection) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Koleksi tidak ditemukan' },
      });
    }

    const [item] = await db.select().from(collectionItems).where(
      and(eq(collectionItems.collectionId, id), eq(collectionItems.productId, productId))
    ).limit(1);

    if (!item) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Produk tidak ada di koleksi' },
      });
    }

    await db.delete(collectionItems).where(eq(collectionItems.id, item.id));

    return reply.status(200).send({
      success: true,
      data: { message: 'Produk dihapus dari koleksi' },
    });
  });
}
