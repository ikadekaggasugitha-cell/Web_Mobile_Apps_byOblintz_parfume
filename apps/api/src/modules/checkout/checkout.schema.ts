import { z } from 'zod';

export const checkoutSchema = z.object({
  shippingAddress: z.object({
    name: z.string().min(2),
    phone: z.string().min(10),
    address: z.string().min(5),
    city: z.string().min(2),
    province: z.string().min(2),
    postalCode: z.string().min(5),
  }),
  shippingMethod: z.enum(['standard', 'express']).default('standard'),
  notes: z.string().optional(),
  giftMessage: z.string().optional(),
  promoCode: z.string().optional(),
  paymentMethod: z.enum(['qris']).default('qris'),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
