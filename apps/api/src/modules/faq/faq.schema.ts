import { z } from 'zod';

export const createFaqSchema = z.object({
  question: z.string().min(5, 'Pertanyaan minimal 5 karakter').max(500),
  answer: z.string().min(5, 'Jawaban minimal 5 karakter').max(2000),
  category: z.string().max(100).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().default(true),
});

export const updateFaqSchema = createFaqSchema.partial();

export type CreateFaqInput = z.infer<typeof createFaqSchema>;
export type UpdateFaqInput = z.infer<typeof updateFaqSchema>;
