import { db } from '../../db';
import { products, orders, orderItems, promoCodes, giftWrappings, stockMovements } from '../../db/schema';
import { eq, and, gte, inArray, sql } from 'drizzle-orm';
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
  const raw = await redis.get(`cart:${data.userId}`);
  if (!raw) {
    throw new AppError('CHECKOUT_ERROR', 'Keranjang kosong', 400);
  }

  const cartItems: CartItem[] = JSON.parse(raw);
  if (cartItems.length === 0) {
    throw new AppError('CHECKOUT_ERROR', 'Keranjang kosong', 400);
  }

  const productIds = cartItems.map((i) => i.productId);
  const productList = await db.select({
    id: products.id,
    name: products.name,
    price: products.price,
    stock: products.stock,
  })
    .from(products)
    .where(and(inArray(products.id, productIds), eq(products.status, 'ACTIVE')));

  const productMap = new Map(productList.map((p) => [p.id, p]));

  for (const item of cartItems) {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new AppError('CHECKOUT_ERROR', `Produk ${item.productId} tidak ditemukan`, 404);
    }
  }

  let subtotal = 0;
  let totalGiftWrap = 0;
  const orderItemsData: {
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

    orderItemsData.push({
      productId: item.productId,
      quantity: item.quantity,
      price: product.price,
      giftWrap: item.giftWrap,
      giftWrapPrice: giftWrapPrice,
    });
  }

  const shippingFee = SHIPPING_COSTS[data.shippingMethod] || SHIPPING_COSTS.standard;

  let discount = 0;
  let promoCodeId = null;
  let promoRecord: any = null;

  if (data.promoCode) {
    const [promo] = await db.select()
      .from(promoCodes)
      .where(eq(promoCodes.code, data.promoCode.toUpperCase()))
      .limit(1);

    const result = evaluatePromo(promo, subtotal, shippingFee);
    if (result.applicable && promo) {
      discount = result.discount;
      promoCodeId = promo.id;
      promoRecord = promo;
    }
  }

  const totalAmount = subtotal + shippingFee + totalGiftWrap - discount;
  const orderNumber = `ORD-${nanoid(8).toUpperCase()}`;

  const order = await db.transaction(async (tx) => {
    const [newOrder] = await tx.insert(orders).values({
      userId: data.userId,
      orderNumber,
      status: 'PENDING',
      subtotal: subtotal.toString(),
      shippingFee: shippingFee.toString(),
      discount: discount.toString(),
      totalAmount: totalAmount.toString(),
      promoCodeId,
      shippingAddress: data.shippingAddress,
      notes: data.notes,
      giftMessage: data.giftMessage,
    }).returning();

    for (const item of orderItemsData) {
      await tx.insert(orderItems).values({
        orderId: newOrder.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        giftWrap: item.giftWrap,
        giftWrapPrice: item.giftWrapPrice.toString(),
      });

      // Check stock first
      const [currentProduct] = await tx.select({ stock: products.stock })
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1);

      if (!currentProduct || currentProduct.stock < item.quantity) {
        throw new AppError('INSUFFICIENT_STOCK', `Stok produk ${item.productId} tidak mencukupi`, 400);
      }

      await tx.update(products)
        .set({ stock: sql`${products.stock} - ${item.quantity}` })
        .where(eq(products.id, item.productId));

      await tx.insert(stockMovements).values({
        productId: item.productId,
        type: 'ORDER',
        quantity: -item.quantity,
        referenceId: newOrder.id,
        referenceType: 'ORDER',
      });
    }

    if (promoRecord) {
      await tx.update(promoCodes)
        .set({ usedCount: sql`${promoCodes.usedCount} + 1` })
        .where(eq(promoCodes.id, promoRecord.id));
    }

    const hasGiftWrap = orderItemsData.some((i) => i.giftWrap);
    if (hasGiftWrap) {
      await tx.insert(giftWrappings).values({
        orderId: newOrder.id,
        wrappingType: 'standard',
        price: totalGiftWrap.toString(),
        message: data.giftMessage,
      });
    }

    return newOrder;
  });

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
