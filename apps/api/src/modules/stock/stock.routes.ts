import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db';
import { stockMovements, products } from '../../db/schema';
import { eq, and, desc, count, sql, gte, lte } from 'drizzle-orm';
import { requireAdmin } from '../../middleware/auth';
import { handleRouteError } from '../../lib/errors';

const adjustmentSchema = z.object({
  productId: z.string().uuid('Product ID tidak valid'),
  quantity: z.number().int().min(1, 'Quantity harus lebih dari 0'),
  type: z.enum(['RESTOCK', 'ADJUSTMENT', 'RETURN']),
  note: z.string().optional(),
});

export async function stockRoutes(app: FastifyInstance) {
  // ==================== RECAP STATS ====================
  app.get('/recap', {
    preHandler: [requireAdmin],
  }, async (_request, reply) => {
    const [
      totalProductsResult,
      lowStockResult,
      outOfStockResult,
      totalStockValueResult,
    ] = await Promise.all([
      db.select({ count: count() }).from(products).where(eq(products.status, 'ACTIVE')),
      db.select({ count: count() }).from(products).where(
        and(eq(products.status, 'ACTIVE'), lte(products.stock, 5), sql`${products.stock} > 0`)
      ),
      db.select({ count: count() }).from(products).where(
        and(eq(products.status, 'ACTIVE'), eq(products.stock, 0))
      ),
      db.select({
        total: sql`COALESCE(SUM(${products.stock} * ${products.price}), 0)::numeric`,
      }).from(products).where(eq(products.status, 'ACTIVE')),
    ]);

    return reply.status(200).send({
      success: true,
      data: {
        totalProducts: Number(totalProductsResult[0]?.count || 0),
        lowStock: Number(lowStockResult[0]?.count || 0),
        outOfStock: Number(outOfStockResult[0]?.count || 0),
        totalStockValue: Number(totalStockValueResult[0]?.total || 0),
      },
    });
  });

  // ==================== LIST MOVEMENTS ====================
  app.get('/movements', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const {
      page = '1',
      limit = '20',
      productId,
      type,
      startDate,
      endDate,
    } = request.query as {
      page?: string;
      limit?: string;
      productId?: string;
      type?: string;
      startDate?: string;
      endDate?: string;
    };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const conditions = [];

    if (productId) {
      conditions.push(eq(stockMovements.productId, productId));
    }
    if (type) {
      conditions.push(eq(stockMovements.type, type as any));
    }
    if (startDate) {
      conditions.push(gte(stockMovements.createdAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(stockMovements.createdAt, new Date(endDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [movements, [{ total }]] = await Promise.all([
      db
        .select({
          id: stockMovements.id,
          productId: stockMovements.productId,
          type: stockMovements.type,
          quantity: stockMovements.quantity,
          referenceId: stockMovements.referenceId,
          referenceType: stockMovements.referenceType,
          note: stockMovements.note,
          adminUserId: stockMovements.adminUserId,
          createdAt: stockMovements.createdAt,
          product: {
            id: products.id,
            name: products.name,
            sku: products.sku,
          },
        })
        .from(stockMovements)
        .leftJoin(products, eq(stockMovements.productId, products.id))
        .where(whereClause)
        .orderBy(desc(stockMovements.createdAt))
        .limit(limitNum)
        .offset(skip),
      db
        .select({ total: count() })
        .from(stockMovements)
        .where(whereClause),
    ]);

    return reply.status(200).send({
      success: true,
      data: {
        movements,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / limitNum),
        },
      },
    });
  });

  // ==================== MOVEMENTS BY PRODUCT ====================
  app.get('/movements/:productId', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { productId } = request.params as { productId: string };
    const { page = '1', limit = '20' } = request.query as {
      page?: string;
      limit?: string;
    };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [product] = await db
      .select({ id: products.id, name: products.name, sku: products.sku })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Produk tidak ditemukan' },
      });
    }

    const [movements, [{ total }]] = await Promise.all([
      db
        .select()
        .from(stockMovements)
        .where(eq(stockMovements.productId, productId))
        .orderBy(desc(stockMovements.createdAt))
        .limit(limitNum)
        .offset(skip),
      db
        .select({ total: count() })
        .from(stockMovements)
        .where(eq(stockMovements.productId, productId)),
    ]);

    return reply.status(200).send({
      success: true,
      data: {
        product,
        movements,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / limitNum),
        },
      },
    });
  });

  // ==================== MANUAL ADJUSTMENT ====================
  app.post('/adjustment', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    try {
      const input = adjustmentSchema.parse(request.body);

      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, input.productId))
        .limit(1);

      if (!product) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Produk tidak ditemukan' },
        });
      }

      const quantityChange = input.type === 'RESTOCK' ? input.quantity : -input.quantity;

      if (product.stock + quantityChange < 0) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: 'Stok tidak mencukupi untuk pengurangan ini',
          },
        });
      }

      await db.transaction(async (tx) => {
        await tx
          .update(products)
          .set({ stock: sql`${products.stock} + ${quantityChange}` })
          .where(eq(products.id, input.productId));

        await tx.insert(stockMovements).values({
          productId: input.productId,
          type: input.type,
          quantity: quantityChange,
          referenceType: 'MANUAL',
          note: input.note,
          adminUserId: request.userId,
        });
      });

      return reply.status(200).send({
        success: true,
        data: {
          message: 'Stok berhasil disesuaikan',
          product: {
            id: product.id,
            name: product.name,
            previousStock: product.stock,
            currentStock: product.stock + quantityChange,
          },
        },
      });
    } catch (error) {
      return handleRouteError(error, reply);
    }
  });
}
