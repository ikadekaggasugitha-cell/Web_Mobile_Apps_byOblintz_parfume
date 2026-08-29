import { FastifyInstance } from 'fastify';
import prisma from '../../config/database';
import { redis } from '../../config/redis';
import { requireAuth } from '../../middleware/auth';
import { addToCartSchema, updateCartItemSchema, applyPromoSchema } from './cart.schema';

const CART_TTL = 30 * 24 * 60 * 60; // 30 hari

interface CartItem {
  productId: string;
  quantity: number;
  giftWrap: boolean;
  addedAt: string;
}

async function getCart(userId: string): Promise<CartItem[]> {
  const raw = await redis.get(`cart:${userId}`);
  return raw ? JSON.parse(raw) : [];
}

async function saveCart(userId: string, items: CartItem[]): Promise<void> {
  await redis.set(`cart:${userId}`, JSON.stringify(items), 'EX', CART_TTL);
}

export async function cartRoutes(app: FastifyInstance) {
  // ==================== GET CART ====================
  app.get('/', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const items = await getCart(request.userId!);

    // Ambil detail produk
    if (items.length === 0) {
      return reply.status(200).send({
        success: true,
        data: { items: [], summary: { subtotal: 0, totalItems: 0 } },
      });
    }

    const productIds = items.map((i) => i.productId);
    const products: any[] = await prisma.product.findMany({
      where: { id: { in: productIds }, status: 'ACTIVE' },
      include: {
        category: { select: { name: true } },
      },
    });

    const productMap = new Map(products.map((p: any) => [p.id, p]));

    const cartItems = items
      .map((item) => {
        const product = productMap.get(item.productId);
        if (!product) return null;
        return {
          id: item.productId,
          quantity: item.quantity,
          giftWrap: item.giftWrap,
          product: {
            id: product.id,
            name: product.name,
            slug: product.slug,
            price: product.price,
            comparePrice: product.comparePrice,
            images: product.images,
            stock: product.stock,
            category: product.category?.name,
          },
          subtotal: Number(product.price) * item.quantity,
        };
      })
      .filter(Boolean);

    const subtotal = cartItems.reduce((sum, item) => sum + (item?.subtotal || 0), 0);
    const totalItems = cartItems.reduce((sum, item) => sum + (item?.quantity || 0), 0);

    return reply.status(200).send({
      success: true,
      data: {
        items: cartItems,
        summary: { subtotal, totalItems },
      },
    });
  });

  // ==================== ADD TO CART ====================
  app.post('/items', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const input = addToCartSchema.parse(request.body);

      // Cek produk exists & stok
      const product = await prisma.product.findUnique({
        where: { id: input.productId, status: 'ACTIVE' },
      });

      if (!product) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Produk tidak ditemukan' },
        });
      }

      if (product.stock < input.quantity) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INSUFFICIENT_STOCK', message: 'Stok tidak mencukupi' },
        });
      }

      const cart = await getCart(request.userId!);
      const existingIndex = cart.findIndex((i) => i.productId === input.productId);

      if (existingIndex >= 0) {
        // Update quantity
        const newQty = cart[existingIndex].quantity + input.quantity;
        if (newQty > 10) {
          return reply.status(400).send({
            success: false,
            error: { code: 'MAX_QUANTITY', message: 'Maksimal 10 item per produk' },
          });
        }
        if (newQty > product.stock) {
          return reply.status(400).send({
            success: false,
            error: { code: 'INSUFFICIENT_STOCK', message: 'Stok tidak mencukupi' },
          });
        }
        cart[existingIndex].quantity = newQty;
        cart[existingIndex].giftWrap = input.giftWrap || cart[existingIndex].giftWrap;
      } else {
        // Tambah baru
        cart.push({
          productId: input.productId,
          quantity: input.quantity,
          giftWrap: input.giftWrap || false,
          addedAt: new Date().toISOString(),
        });
      }

      await saveCart(request.userId!, cart);

      return reply.status(200).send({
        success: true,
        data: { message: 'Produk ditambahkan ke keranjang', totalItems: cart.length },
      });
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: error.message },
        });
      }
      throw error;
    }
  });

  // ==================== UPDATE CART ITEM ====================
  app.put('/items/:productId', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const { productId } = request.params as { productId: string };
      const input = updateCartItemSchema.parse(request.body);

      const product = await prisma.product.findUnique({
        where: { id: productId, status: 'ACTIVE' },
      });

      if (!product) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Produk tidak ditemukan' },
        });
      }

      if (input.quantity > product.stock) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INSUFFICIENT_STOCK', message: 'Stok tidak mencukupi' },
        });
      }

      const cart = await getCart(request.userId!);
      const index = cart.findIndex((i) => i.productId === productId);

      if (index < 0) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Item tidak ada di keranjang' },
        });
      }

      cart[index].quantity = input.quantity;
      if (input.giftWrap !== undefined) {
        cart[index].giftWrap = input.giftWrap;
      }

      await saveCart(request.userId!, cart);

      return reply.status(200).send({
        success: true,
        data: { message: 'Keranjang diperbarui' },
      });
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: error.message },
        });
      }
      throw error;
    }
  });

  // ==================== REMOVE CART ITEM ====================
  app.delete('/items/:productId', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { productId } = request.params as { productId: string };

    const cart = await getCart(request.userId!);
    const index = cart.findIndex((i) => i.productId === productId);

    if (index < 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Item tidak ada di keranjang' },
      });
    }

    cart.splice(index, 1);
    await saveCart(request.userId!, cart);

    return reply.status(200).send({
      success: true,
      data: { message: 'Item dihapus dari keranjang' },
    });
  });

  // ==================== CLEAR CART ====================
  app.delete('/', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    await redis.del(`cart:${request.userId}`);

    return reply.status(200).send({
      success: true,
      data: { message: 'Keranjang dikosongkan' },
    });
  });

  // ==================== APPLY PROMO ====================
  app.post('/apply-promo', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const input = applyPromoSchema.parse(request.body);

      const promo = await prisma.promoCode.findUnique({
        where: { code: input.code.toUpperCase() },
      });

      if (!promo) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Kode promo tidak ditemukan' },
        });
      }

      if (promo.status !== 'ACTIVE') {
        return reply.status(400).send({
          success: false,
          error: { code: 'PROMO_INACTIVE', message: 'Kode promo tidak aktif' },
        });
      }

      if (promo.startDate && new Date() < promo.startDate) {
        return reply.status(400).send({
          success: false,
          error: { code: 'PROMO_NOT_STARTED', message: 'Kode promo belum berlaku' },
        });
      }

      if (promo.endDate && new Date() > promo.endDate) {
        return reply.status(400).send({
          success: false,
          error: { code: 'PROMO_EXPIRED', message: 'Kode promo sudah kedaluwarsa' },
        });
      }

      if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
        return reply.status(400).send({
          success: false,
          error: { code: 'PROMO_LIMIT', message: 'Kode promo sudah mencapai batas penggunaan' },
        });
      }

      // Hitung subtotal cart
      const cart = await getCart(request.userId!);
      if (cart.length === 0) {
        return reply.status(400).send({
          success: false,
          error: { code: 'EMPTY_CART', message: 'Keranjang kosong' },
        });
      }

      const productIds = cart.map((i) => i.productId);
      const products: any[] = await prisma.product.findMany({
        where: { id: { in: productIds } },
      });
    const productMap = new Map(products.map((p: any) => [p.id, p]));

      const subtotal = cart.reduce((sum, item) => {
        const product = productMap.get(item.productId);
        return sum + (product ? Number(product.price) * item.quantity : 0);
      }, 0);

      // Cek min order
      if (promo.minOrder && subtotal < Number(promo.minOrder)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'MIN_ORDER',
            message: `Minimum order Rp ${Number(promo.minOrder).toLocaleString('id-ID')}`,
          },
        });
      }

      // Hitung diskon
      let discount = 0;
      if (promo.type === 'PERCENTAGE') {
        discount = subtotal * (Number(promo.value) / 100);
        if (promo.maxDiscount && discount > Number(promo.maxDiscount)) {
          discount = Number(promo.maxDiscount);
        }
      } else if (promo.type === 'FIXED') {
        discount = Number(promo.value);
      }

      return reply.status(200).send({
        success: true,
        data: {
          code: promo.code,
          type: promo.type,
          value: promo.value,
          discount,
          subtotal,
          total: subtotal - discount,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: error.message },
        });
      }
      throw error;
    }
  });
}
