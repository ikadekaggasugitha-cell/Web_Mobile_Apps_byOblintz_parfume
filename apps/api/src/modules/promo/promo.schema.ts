import { z } from 'zod';

export const createPromoSchema = z.object({
  code: z.string().min(3).max(50).transform((v) => v.toUpperCase()),
  name: z.string().min(3).max(100),
  type: z.enum(['PERCENTAGE', 'FIXED', 'FREE_SHIPPING']),
  value: z.number().min(0),
  minOrder: z.number().optional(),
  maxDiscount: z.number().optional(),
  usageLimit: z.number().int().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
});

export const updatePromoSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  type: z.enum(['PERCENTAGE', 'FIXED', 'FREE_SHIPPING']).optional(),
  value: z.number().min(0).optional(),
  minOrder: z.number().optional(),
  maxDiscount: z.number().optional(),
  usageLimit: z.number().int().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

export const validatePromoSchema = z.object({
  code: z.string().min(1),
  subtotal: z.number().min(0),
});

export type CreatePromoInput = z.infer<typeof createPromoSchema>;
export type UpdatePromoInput = z.infer<typeof updatePromoSchema>;
export type ValidatePromoInput = z.infer<typeof validatePromoSchema>;
