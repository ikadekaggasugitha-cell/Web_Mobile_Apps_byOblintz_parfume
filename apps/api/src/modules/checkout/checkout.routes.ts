import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { redis } from '../../config/redis';
import { requireAuth } from '../../middleware/auth';
import { checkoutSchema } from './checkout.schema';
import { processCheckout } from './checkout.service';
import { handleRouteError } from '../../lib/errors';
import { evaluatePromo } from '../../lib/promo';

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
      return handleRouteError(error, reply);
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

        // Same validation/calculation as the actual checkout (M1) so the
        // previewed discount matches what will be applied.
        discount = evaluatePromo(promo, subtotal, shippingCost).discount;
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
      return handleRouteError(error, reply);
    }
  });
}
