import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { redis } from '../../config/redis';
import { requireAuth } from '../../middleware/auth';
import { checkoutSchema } from './checkout.schema';
import { processCheckout } from './checkout.service';

export async function checkoutRoutes(app: FastifyInstance) {
  // ==================== PROCESS CHECKOUT ====================
  app.post('/', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const input = checkoutSchema.parse(request.body);

      const result = await processCheckout({
        userId: request.userId!,
        shippingAddress: input.shippingAddress,
        shippingMethod: input.shippingMethod,
        notes: input.notes,
        giftMessage: input.giftMessage,
        promoCode: input.promoCode,
      });

      return reply.status(201).send({
        success: true,
        data: {
          message: 'Checkout berhasil',
          ...result,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({
          success: false,
          error: { code: 'CHECKOUT_ERROR', message: error.message },
        });
      }
      throw error;
    }
  });

  // ==================== PREVIEW CHECKOUT ====================
  app.post('/preview', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const { promoCode } = request.body as { promoCode?: string };

      // Ambil cart
      const raw = await redis.get(`cart:${request.userId}`);

      if (!raw) {
        return reply.status(400).send({
          success: false,
          error: { code: 'EMPTY_CART', message: 'Keranjang kosong' },
        });
      }

      const cartItems = JSON.parse(raw);
      const productIds = cartItems.map((i: any) => i.productId);

      const products: any[] = await prisma.product.findMany({
        where: { id: { in: productIds }, status: 'ACTIVE' },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      let subtotal = 0;
      let totalGiftWrap = 0;
      const items: any[] = [];

      for (const item of cartItems) {
        const product = productMap.get(item.productId);
        if (!product) continue;

        const giftWrapPrice = item.giftWrap ? 15000 * item.quantity : 0;
        const itemTotal = Number(product.price) * item.quantity + giftWrapPrice;

        subtotal += itemTotal;
        totalGiftWrap += giftWrapPrice;

        items.push({
          productId: item.productId,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          giftWrap: item.giftWrap,
          giftWrapPrice,
          subtotal: itemTotal,
        });
      }

      const shippingCost = 15000; // Standard
      let discount = 0;

      if (promoCode) {
        const promo = await prisma.promoCode.findUnique({
          where: { code: promoCode.toUpperCase() },
        });

        if (promo && promo.status === 'ACTIVE') {
          if (promo.type === 'PERCENTAGE') {
            discount = subtotal * (Number(promo.value) / 100);
            if (promo.maxDiscount && discount > Number(promo.maxDiscount)) {
              discount = Number(promo.maxDiscount);
            }
          } else if (promo.type === 'FIXED') {
            discount = Number(promo.value);
          } else if (promo.type === 'FREE_SHIPPING') {
            discount = shippingCost;
          }
        }
      }

      return reply.status(200).send({
        success: true,
        data: {
          items,
          subtotal,
          shippingCost,
          totalGiftWrap,
          discount,
          total: subtotal + shippingCost - discount,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({
          success: false,
          error: { code: 'PREVIEW_ERROR', message: error.message },
        });
      }
      throw error;
    }
  });
}
