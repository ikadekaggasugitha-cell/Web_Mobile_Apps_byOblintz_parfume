import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  planId: z.string().uuid('Plan ID tidak valid'),
  frequency: z.enum(['monthly', 'quarterly', 'yearly']),
  shippingAddress: z.object({
    name: z.string().min(2),
    phone: z.string().min(10),
    address: z.string().min(5),
    city: z.string().min(2),
    province: z.string().min(2),
    postalCode: z.string().min(5),
  }),
});

export const updateSubscriptionSchema = z.object({
  frequency: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
  shippingAddress: z.object({
    name: z.string().min(2),
    phone: z.string().min(10),
    address: z.string().min(5),
    city: z.string().min(2),
    province: z.string().min(2),
    postalCode: z.string().min(5),
  }).optional(),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
