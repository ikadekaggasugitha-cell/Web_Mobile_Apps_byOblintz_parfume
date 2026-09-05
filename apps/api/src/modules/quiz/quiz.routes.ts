import { FastifyInstance } from 'fastify';
import { eq, count, inArray } from 'drizzle-orm';
import { db } from '../../db';
import { products } from '../../db/schema/products';
import { reviews } from '../../db/schema/reviews';
import { handleRouteError } from '../../lib/errors';
import { quizAnswerSchema, calculateRecommendations } from './quiz.schema';

export async function quizRoutes(app: FastifyInstance) {
  // ==================== GET QUIZ OPTIONS ====================
  app.get('/options', async (request, reply) => {
    const { QUIZ_OPTIONS } = await import('./quiz.schema');
    return reply.status(200).send({ success: true, data: QUIZ_OPTIONS });
  });

  // ==================== SUBMIT QUIZ & GET RECOMMENDATIONS ====================
  app.post('/submit', async (request, reply) => {
    try {
      const input = quizAnswerSchema.parse(request.body);

      // Ambil semua produk aktif
      const activeProducts = await db.query.products.findMany({
        where: eq(products.status, 'ACTIVE'),
        with: {
          category: true,
        },
      });

      // Hitung review count untuk setiap produk
      const productIds = activeProducts.map(p => p.id);
      let reviewCounts: Record<string, number> = {};
      if (productIds.length > 0) {
        const counts = await db
          .select({ productId: reviews.productId, count: count() })
          .from(reviews)
          .where(inArray(reviews.productId, productIds))
          .groupBy(reviews.productId);

        reviewCounts = Object.fromEntries(counts.map(r => [r.productId, r.count]));
      }

      const productsWithCounts = activeProducts.map(p => ({
        ...p,
        _count: { reviews: reviewCounts[p.id] ?? 0 },
      }));

      // Hitung rekomendasi
      const recommendations = calculateRecommendations(input, productsWithCounts);

      return reply.status(200).send({
        success: true,
        data: {
          answers: input,
          recommendations,
          total: recommendations.length,
        },
      });
    } catch (error) {
      return handleRouteError(error, reply);
    }
  });
}
