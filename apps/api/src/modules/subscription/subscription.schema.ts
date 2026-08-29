import { z } from 'zod';

// Aligned with the actual subscription routes (single source of truth).
export const createSubscriptionSchema = z.object({
  productId: z.string().uuid('Product ID tidak valid'),
  frequency: z.enum(['MONTHLY', 'QUARTERLY']),
});

export const updateSubscriptionSchema = z.object({
  frequency: z.enum(['MONTHLY', 'QUARTERLY']).optional(),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
