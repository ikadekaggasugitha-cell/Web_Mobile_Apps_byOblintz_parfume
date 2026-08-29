import { z } from 'zod';

export const addToCartSchema = z.object({
  productId: z.string().uuid('Product ID tidak valid'),
  quantity: z.number().int().min(1, 'Minimal 1 item').max(10, 'Maksimal 10 item'),
  giftWrap: z.boolean().optional().default(false),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1, 'Minimal 1 item').max(10, 'Maksimal 10 item'),
  giftWrap: z.boolean().optional(),
});

export const applyPromoSchema = z.object({
  code: z.string().min(1, 'Kode promo diperlukan'),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type ApplyPromoInput = z.infer<typeof applyPromoSchema>;
