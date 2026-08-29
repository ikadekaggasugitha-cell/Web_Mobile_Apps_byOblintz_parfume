import prisma from '../../config/database';
import { redis } from '../../config/redis';
import { nanoid } from 'nanoid';

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
    throw new Error('Keranjang kosong');
  }

  const cartItems: CartItem[] = JSON.parse(raw);
  if (cartItems.length === 0) {
    throw new Error('Keranjang kosong');
  }

  // 2. Ambil detail produk
  const productIds = cartItems.map((i) => i.productId);
  const products: any[] = await prisma.product.findMany({
    where: { id: { in: productIds }, status: 'ACTIVE' },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  // 3. Validasi stok
  for (const item of cartItems) {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new Error(`Produk ${item.productId} tidak ditemukan`);
    }
    if (product.stock < item.quantity) {
      throw new Error(`Stok ${product.name} tidak mencukupi`);
    }
  }

  // 4. Hitung subtotal
  let subtotal = 0;
  let totalGiftWrap = 0;
  const orderItems: any[] = [];

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

  // 6. Hitung diskon (promo code)
  let discount = 0;
  let promoCodeId = null;

  if (data.promoCode) {
    const promo = await prisma.promoCode.findUnique({
      where: { code: data.promoCode.toUpperCase() },
    });

    if (promo && promo.status === 'ACTIVE') {
      if (!promo.startDate || new Date() >= promo.startDate) {
        if (!promo.endDate || new Date() <= promo.endDate) {
          if (!promo.usageLimit || promo.usedCount < promo.usageLimit) {
            if (!promo.minOrder || subtotal >= Number(promo.minOrder)) {
              if (promo.type === 'PERCENTAGE') {
                discount = subtotal * (Number(promo.value) / 100);
                if (promo.maxDiscount && discount > Number(promo.maxDiscount)) {
                  discount = Number(promo.maxDiscount);
                }
              } else if (promo.type === 'FIXED') {
                discount = Number(promo.value);
              } else if (promo.type === 'FREE_SHIPPING') {
                discount = shippingFee;
              }

              promoCodeId = promo.id;

              // Update usedCount
              await prisma.promoCode.update({
                where: { id: promo.id },
                data: { usedCount: { increment: 1 } },
              });
            }
          }
        }
      }
    }
  }

  const totalAmount = subtotal + shippingFee + totalGiftWrap - discount;

  // 7. Generate order number
  const orderNumber = `ORD-${nanoid(8).toUpperCase()}`;

  // 8. Create order dalam transaction
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

    // Create order items
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

      // Kurangi stok
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
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
