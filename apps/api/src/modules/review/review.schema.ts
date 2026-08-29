import { z } from 'zod';

export const createReviewSchema = z.object({
  productId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(1000),
  images: z.array(z.string().url()).max(5).optional(),
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().min(10).max(1000).optional(),
  images: z.array(z.string().url()).max(5).optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
