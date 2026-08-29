import prisma from '../../config/database';
import { redis } from '../../config/redis';
import { nanoid } from 'nanoid';
import { AppError } from '../../lib/errors';
import { evaluatePromo } from '../../lib/promo';

interface CartItem {
  productId: string;
  quantity: number;
  giftWrap: boolean;
}

interface CheckoutData {
  userId: string;
  shippingAddress: any;
  shippingMethod: string;
  notes?: string;
  giftMessage?: string;
  promoCode?: string;
}

const SHIPPING_COSTS: Record<string, number> = {
  standard: 15000,
  express: 35000,
};

export async function processCheckout(data: CheckoutData) {
  // 1. Ambil cart dari Redis
  const raw = await redis.get(`cart:${data.userId}`);
  if (!raw) {
    throw new AppError('CHECKOUT_ERROR', 'Keranjang kosong', 400);
  }

  const cartItems: CartItem[] = JSON.parse(raw);
  if (cartItems.length === 0) {
    throw new AppError('CHECKOUT_ERROR', 'Keranjang kosong', 400);
  }

  // 2. Ambil detail produk
  const productIds = cartItems.map((i) => i.productId);
  const products: { id: string; name: string; price: any; stock: number }[] = await prisma.product.findMany({
    where: { id: { in: productIds }, status: 'ACTIVE' },
    select: { id: true, name: true, price: true, stock: true },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  // 3. Validasi produk exists
  for (const item of cartItems) {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new AppError('CHECKOUT_ERROR', `Produk ${item.productId} tidak ditemukan`, 404);
    }
  }

  // 4. Hitung subtotal
  let subtotal = 0;
  let totalGiftWrap = 0;
  const orderItems: {
    productId: string;
    quantity: number;
    price: any;
    giftWrap: boolean;
    giftWrapPrice: number;
  }[] = [];

  for (const item of cartItems) {
    const product = productMap.get(item.productId)!;
    const itemTotal = Number(product.price) * item.quantity;
    const giftWrapPrice = item.giftWrap ? 15000 * item.quantity : 0;

    subtotal += itemTotal;
    totalGiftWrap += giftWrapPrice;

    orderItems.push({
      productId: item.productId,
      quantity: item.quantity,
      price: product.price,
      giftWrap: item.giftWrap,
      giftWrapPrice: giftWrapPrice,
    });
  }

  // 5. Hitung ongkir
  const shippingFee = SHIPPING_COSTS[data.shippingMethod] || SHIPPING_COSTS.standard;

  // 6. Validasi promo code (tanpa increment - akan dilakukan di dalam transaction)
  let discount = 0;
  let promoCodeId = null;
  let promoRecord: any = null;

  if (data.promoCode) {
    const promo = await prisma.promoCode.findUnique({
      where: { code: data.promoCode.toUpperCase() },
    });

    const result = evaluatePromo(promo, subtotal, shippingFee);
    if (result.applicable && promo) {
      discount = result.discount;
      promoCodeId = promo.id;
      promoRecord = promo;
    }
  }

  const totalAmount = subtotal + shippingFee + totalGiftWrap - discount;

  // 7. Generate order number
  const orderNumber = `ORD-${nanoid(8).toUpperCase()}`;

  // 8. Create order dalam transaction (stock decrement + promo increment atomic)
  const order = await prisma.$transaction(async (tx: any) => {
    // Create order
    const newOrder = await tx.order.create({
      data: {
        userId: data.userId,
        orderNumber,
        status: 'PENDING',
        subtotal,
        shippingFee,
        discount,
        totalAmount,
        promoCodeId,
        shippingAddress: data.shippingAddress,
        notes: data.notes,
        giftMessage: data.giftMessage,
      },
    });

    // Create order items + kurangi stok secara atomik
    for (const item of orderItems) {
      await tx.orderItem.create({
        data: {
          orderId: newOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          giftWrap: item.giftWrap,
          giftWrapPrice: item.giftWrapPrice,
        },
      });

      // Conditional decrement - gagal jika stok tidak cukup
      const stockResult = await tx.product.updateMany({
        where: {
          id: item.productId,
          stock: { gte: item.quantity },
        },
        data: { stock: { decrement: item.quantity } },
      });

      if (stockResult.count === 0) {
        throw new AppError('INSUFFICIENT_STOCK', `Stok produk ${item.productId} tidak mencukupi`, 400);
      }
    }

    // Increment promo usage di dalam transaction
    if (promoRecord) {
      await tx.promoCode.update({
        where: { id: promoRecord.id },
        data: { usedCount: { increment: 1 } },
      });
    }

    // Create gift wrapping jika ada
    const hasGiftWrap = orderItems.some((i: any) => i.giftWrap);
    if (hasGiftWrap) {
      await tx.giftWrapping.create({
        data: {
          orderId: newOrder.id,
          wrappingType: 'standard',
          price: totalGiftWrap,
          message: data.giftMessage,
        },
      });
    }

    return newOrder;
  });

  // 9. Hapus cart
  await redis.del(`cart:${data.userId}`);

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    subtotal,
    shippingFee,
    totalGiftWrap,
    discount,
    totalAmount,
  };
}
