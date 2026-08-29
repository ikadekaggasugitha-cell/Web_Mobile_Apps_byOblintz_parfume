import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
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
      const products = await prisma.product.findMany({
        where: { status: 'ACTIVE' },
        include: {
          category: { select: { name: true } },
          _count: { select: { reviews: true } },
        },
      });

      // Hitung rekomendasi
      const recommendations = calculateRecommendations(input, products);

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
