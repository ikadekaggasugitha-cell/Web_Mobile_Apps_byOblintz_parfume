import { z } from 'zod';

export const quizAnswerSchema = z.object({
  occasion: z.string().min(1, 'Pilih occasion'),
  personality: z.string().min(1, 'Pilih personality'),
  season: z.string().min(1, 'Pilih season'),
  budget: z.enum(['low', 'medium', 'high']),
});

export type QuizAnswerInput = z.infer<typeof quizAnswerSchema>;

export const QUIZ_OPTIONS = {
  occasion: [
    { value: 'daily', label: 'Sehari-hari', icon: '☀️' },
    { value: 'work', label: 'Kantor', icon: '💼' },
    { value: 'date', label: 'Kencan', icon: '💕' },
    { value: 'party', label: 'Pesta', icon: '🎉' },
    { value: 'formal', label: 'Formal', icon: '👔' },
    { value: 'travel', label: 'Traveling', icon: '✈️' },
  ],
  personality: [
    { value: 'fresh', label: 'Fresh & Clean', icon: '🌊' },
    { value: 'sweet', label: 'Sweet & Playful', icon: '🍬' },
    { value: 'elegant', label: 'Elegant & Sophisticated', icon: '👑' },
    { value: 'bold', label: 'Bold & Mysterious', icon: '🖤' },
    { value: 'warm', label: 'Warm & Cozy', icon: '🔥' },
    { value: 'floral', label: 'Floral & Romantic', icon: '🌸' },
  ],
  season: [
    { value: 'spring', label: 'Spring', icon: '🌷' },
    { value: 'summer', label: 'Summer', icon: '☀️' },
    { value: 'autumn', label: 'Autumn', icon: '🍂' },
    { value: 'winter', label: 'Winter', icon: '❄️' },
    { value: 'tropical', label: 'Tropis (Indonesia)', icon: '🌴' },
  ],
  budget: [
    { value: 'low', label: 'Rp 100rb - 300rb', icon: '💰' },
    { value: 'medium', label: 'Rp 300rb - 700rb', icon: '💎' },
    { value: 'high', label: 'Rp 700rb+', icon: '👑' },
  ],
};

// Scoring logic
export function calculateRecommendations(answers: QuizAnswerInput, products: any[]) {
  return products
    .map((product) => {
      let score = 0;
      const notes = product.notes || [];
      const occasions = product.occasions || [];
      const price = Number(product.price);

      // Occasion matching
      if (answers.occasion === 'daily' && occasions.includes('daily')) score += 3;
      if (answers.occasion === 'work' && occasions.includes('work')) score += 3;
      if (answers.occasion === 'date' && occasions.includes('romantic')) score += 3;
      if (answers.occasion === 'party' && occasions.includes('party')) score += 3;
      if (answers.occasion === 'formal' && occasions.includes('formal')) score += 3;
      if (answers.occasion === 'travel' && occasions.includes('fresh')) score += 3;

      // Personality matching
      if (answers.personality === 'fresh' && notes.some((n: string) => ['citrus', 'aquatic', 'green', 'mint'].includes(n.toLowerCase()))) score += 4;
      if (answers.personality === 'sweet' && notes.some((n: string) => ['vanilla', 'caramel', 'gourmand', 'sweet'].includes(n.toLowerCase()))) score += 4;
      if (answers.personality === 'elegant' && notes.some((n: string) => ['amber', 'sandalwood', 'musk', 'oud'].includes(n.toLowerCase()))) score += 4;
      if (answers.personality === 'bold' && notes.some((n: string) => ['oud', 'leather', 'tobacco', 'spicy'].includes(n.toLowerCase()))) score += 4;
      if (answers.personality === 'warm' && notes.some((n: string) => ['amber', 'vanilla', 'woody', 'oriental'].includes(n.toLowerCase()))) score += 4;
      if (answers.personality === 'floral' && notes.some((n: string) => ['rose', 'jasmine', 'lily', 'floral', 'peony'].includes(n.toLowerCase()))) score += 4;

      // Season matching
      if (answers.season === 'summer' && notes.some((n: string) => ['citrus', 'aquatic', 'fresh', 'light'].includes(n.toLowerCase()))) score += 2;
      if (answers.season === 'winter' && notes.some((n: string) => ['amber', 'warm', 'spicy', 'oriental'].includes(n.toLowerCase()))) score += 2;
      if (answers.season === 'spring' && notes.some((n: string) => ['floral', 'fresh', 'green', 'light'].includes(n.toLowerCase()))) score += 2;
      if (answers.season === 'autumn' && notes.some((n: string) => ['woody', 'warm', 'amber', 'earth'].includes(n.toLowerCase()))) score += 2;
      if (answers.season === 'tropical' && notes.some((n: string) => ['fresh', 'citrus', 'aquatic', 'light', 'tropical'].includes(n.toLowerCase()))) score += 2;

      // Budget matching
      if (answers.budget === 'low' && price <= 300000) score += 2;
      if (answers.budget === 'medium' && price > 300000 && price <= 700000) score += 2;
      if (answers.budget === 'high' && price > 700000) score += 2;

      return { ...product, score };
    })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}
