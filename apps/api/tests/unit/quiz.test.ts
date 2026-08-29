import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

const prisma = vi.hoisted(() => ({
  product: { findMany: vi.fn() },
}));

vi.mock('@/config/database', () => ({ default: prisma, prisma }));

import { quizRoutes } from '@/modules/quiz/quiz.routes';
import { calculateRecommendations, QUIZ_OPTIONS } from '@/modules/quiz/quiz.schema';

function makeProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prod-1',
    name: 'Amber Noir',
    price: 250000,
    notes: [],
    occasions: [],
    ...overrides,
  };
}

describe('quiz module', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(quizRoutes, { prefix: '/api/quiz' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== ROUTES ====================
  describe('GET /api/quiz/options', () => {
    it('returns the quiz option catalogue', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/quiz/options' });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.occasion.length).toBe(QUIZ_OPTIONS.occasion.length);
      expect(data.budget.map((b: any) => b.value)).toEqual(['low', 'medium', 'high']);
    });
  });

  describe('POST /api/quiz/submit', () => {
    it('returns scored recommendations for valid answers', async () => {
      prisma.product.findMany.mockResolvedValue([
        makeProduct({ id: 'match', occasions: ['daily'], notes: ['citrus'], price: 200000 }),
        makeProduct({ id: 'nomatch', occasions: [], notes: ['rose'], price: 900000 }),
      ]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/quiz/submit',
        payload: { occasion: 'daily', personality: 'fresh', season: 'summer', budget: 'low' },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.total).toBe(1);
      expect(data.recommendations[0].id).toBe('match');
      expect(data.answers.budget).toBe('low');
    });

    it('returns 400 VALIDATION_ERROR for invalid answers', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/quiz/submit',
        payload: { occasion: '', personality: 'fresh', season: 'summer', budget: 'huge' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ==================== SCORING LOGIC ====================
  describe('calculateRecommendations', () => {
    it('scores occasion + personality + season + budget matches', () => {
      const products = [
        makeProduct({ id: 'a', occasions: ['daily'], notes: ['Citrus'], price: 200000 }),
      ];

      const result = calculateRecommendations(
        { occasion: 'daily', personality: 'fresh', season: 'summer', budget: 'low' },
        products
      );

      // daily(3) + fresh/citrus(4) + summer/citrus(2) + low budget(2) = 11
      expect(result[0].score).toBe(11);
    });

    it('matches elegant personality, winter season and high budget', () => {
      const products = [
        makeProduct({ id: 'b', occasions: ['formal'], notes: ['amber'], price: 900000 }),
      ];

      const result = calculateRecommendations(
        { occasion: 'formal', personality: 'elegant', season: 'winter', budget: 'high' },
        products
      );

      // formal(3) + elegant/amber(4) + winter/amber(2) + high budget(2) = 11
      expect(result[0].score).toBe(11);
    });

    it('matches a date occasion against romantic products', () => {
      const products = [makeProduct({ occasions: ['romantic'], notes: ['rose'], price: 500000 })];

      const result = calculateRecommendations(
        { occasion: 'date', personality: 'floral', season: 'spring', budget: 'medium' },
        products
      );

      // date/romantic(3) + floral/rose(4) + spring/floral? rose not floral-note... rose in floral personality only
      // spring matches ['floral','fresh','green','light'] — 'rose' not included → 0
      // medium budget (500k) (2) => 3 + 4 + 0 + 2 = 9
      expect(result[0].score).toBe(9);
    });

    it('filters out products that match nothing', () => {
      const products = [makeProduct({ occasions: [], notes: ['tobacco'], price: 999999 })];

      const result = calculateRecommendations(
        { occasion: 'daily', personality: 'fresh', season: 'summer', budget: 'low' },
        products
      );

      expect(result).toHaveLength(0);
    });

    // M6: cover remaining occasion branches (each grants +3)
    it.each([
      ['work', 'work'],
      ['party', 'party'],
      ['formal', 'formal'],
      ['travel', 'fresh'],
    ])('scores occasion=%s against occasions containing "%s"', (occasion, occasionTag) => {
      const products = [makeProduct({ occasions: [occasionTag], notes: [], price: 250000 })];
      const result = calculateRecommendations(
        { occasion, personality: 'none', season: 'none', budget: 'low' },
        products
      );
      // occasion(3) + low budget(<=300k, 2) = 5
      expect(result[0].score).toBe(5);
    });

    // M6: cover remaining personality branches (each grants +4)
    it.each([
      ['sweet', 'vanilla'],
      ['bold', 'oud'],
      ['warm', 'woody'],
    ])('scores personality=%s against note "%s"', (personality, note) => {
      const products = [makeProduct({ occasions: [], notes: [note], price: 250000 })];
      const result = calculateRecommendations(
        { occasion: 'none', personality, season: 'none', budget: 'low' },
        products
      );
      // personality(4) + low budget(2) = 6
      expect(result[0].score).toBe(6);
    });

    // M6: cover remaining season branches (+2) and higher budgets (+2)
    it.each([
      ['autumn', 'woody', 'medium', 500000],
      ['spring', 'floral', 'high', 800000],
      ['tropical', 'tropical', 'medium', 400000],
    ])('scores season=%s (note %s) with %s budget', (season, note, budget, price) => {
      const products = [makeProduct({ occasions: [], notes: [note], price })];
      const result = calculateRecommendations(
        { occasion: 'none', personality: 'none', season, budget },
        products
      );
      // season(2) + budget(2) = 4
      expect(result[0].score).toBe(4);
    });

    it('sorts by score descending and caps at 6 results', () => {
      const products = Array.from({ length: 8 }, (_, i) =>
        makeProduct({ id: `p${i}`, occasions: ['daily'], notes: ['citrus'], price: 200000 })
      );
      // Give one product an extra-strong match so it ranks first
      products[3] = makeProduct({
        id: 'top',
        occasions: ['daily'],
        notes: ['citrus'],
        price: 200000,
      });

      const result = calculateRecommendations(
        { occasion: 'daily', personality: 'fresh', season: 'summer', budget: 'low' },
        products
      );

      expect(result).toHaveLength(6); // capped
      expect(result.every((p) => p.score > 0)).toBe(true);
    });
  });
});
