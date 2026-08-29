import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import prisma from '../../config/database';
import { requireAuth } from '../../middleware/auth';
import { config } from '../../config';

export async function paymentRoutes(app: FastifyInstance) {
  // ==================== CREATE QRIS PAYMENT ====================
  app.post('/create', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { orderId } = request.body as { orderId: string };

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: request.userId },
      include: { items: true },
    });

    if (!order) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Pesanan tidak ditemukan' },
      });
    }

    if (!['PENDING', 'WAITING_PAYMENT'].includes(order.status)) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Pesanan tidak dalam status menunggu pembayaran' },
      });
    }

    // Generate unique transaction ID
    const paymentId = `PAY-${order.orderNumber}-${Date.now()}`;

    // Midtrans QRIS payload
    const payload = {
      transaction_details: {
        order_id: order.orderNumber,
        gross_amount: Number(order.totalAmount),
      },
      payment_type: 'qris',
      customer_details: {
        first_name: (order.shippingAddress as any)?.name || 'Customer',
        email: 'customer@oblintz.com',
        phone: (order.shippingAddress as any)?.phone || '',
      },
      callbacks: {
        finish: `${config.frontendUrl}/payment/callback`,
      },
    };

    // TODO: Integrasi Midtrans production
    const mockQrCode = `00020101021226${order.orderNumber}52040000530336054${Number(order.totalAmount)}5802ID5925OBLINTZ PERFUME6006JAKARTA6304`;

    // Simpan transaction record
    const transaction = await prisma.transaction.create({
      data: {
        orderId: order.id,
        paymentId,
        amount: order.totalAmount,
        method: 'QRIS',
        status: 'PENDING',
        qrCode: mockQrCode,
      },
    });

    // Update order status
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'WAITING_PAYMENT' },
    });

    return reply.status(201).send({
      success: true,
      data: {
        transactionId: transaction.id,
        paymentId,
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
        qrCode: mockQrCode,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
  });

  // ==================== CHECK PAYMENT STATUS ====================
  app.get('/status/:orderId', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { orderId } = request.params as { orderId: string };

    const transaction = await prisma.transaction.findFirst({
      where: { orderId },
      include: {
        order: { select: { id: true, orderNumber: true, status: true } },
      },
    });

    if (!transaction) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Pembayaran tidak ditemukan' },
      });
    }

    return reply.status(200).send({
      success: true,
      data: {
        transactionId: transaction.id,
        status: transaction.status,
        amount: transaction.amount,
        order: transaction.order,
      },
    });
  });

  // ==================== MIDTRANS WEBHOOK ====================
  app.post('/webhook', async (request, reply) => {
    const body = request.body as any;

    // Verifikasi signature (production)
    if (config.midtrans.serverKey) {
      const signatureKey = body.signature_key;
      const orderId = body.order_id;
      const statusCode = body.status_code;
      const grossAmount = body.gross_amount;
      const serverKey = config.midtrans.serverKey;

      const expectedSignature = crypto
        .createHash('sha512')
        .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
        .digest('hex');

      if (signatureKey !== expectedSignature) {
        return reply.status(401).send({
          success: false,
          error: { code: 'INVALID_SIGNATURE', message: 'Signature tidak valid' },
        });
      }
    }

    const { order_id, transaction_status, fraud_status } = body;

    // Find transaction by order_id
    const transaction = await prisma.transaction.findFirst({
      where: { order: { orderNumber: order_id } },
    });

    if (!transaction) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Transaksi tidak ditemukan' },
      });
    }

    // Map Midtrans status
    let txStatus: any = 'PENDING';
    let orderStatus: any = 'WAITING_PAYMENT';

    if (transaction_status === 'capture') {
      if (fraud_status === 'accept') {
        txStatus = 'SUCCESS';
        orderStatus = 'PAID';
      } else if (fraud_status === 'challenge') {
        txStatus = 'PENDING';
      }
    } else if (transaction_status === 'settlement') {
      txStatus = 'SUCCESS';
      orderStatus = 'PAID';
    } else if (transaction_status === 'pending') {
      txStatus = 'PENDING';
    } else if (transaction_status === 'deny') {
      txStatus = 'FAILED';
    } else if (transaction_status === 'expire') {
      txStatus = 'FAILED';
    } else if (transaction_status === 'cancel') {
      txStatus = 'FAILED';
    }

    // Update transaction + order
    await prisma.$transaction(async (tx: any) => {
      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: txStatus,
          callbackData: body,
        },
      });

      const orderUpdate: any = { status: orderStatus };
      if (orderStatus === 'PAID') {
        orderUpdate.paidAt = new Date();
      }

      await tx.order.update({
        where: { id: transaction.orderId },
        data: orderUpdate,
      });
    });

    return reply.status(200).send({ status: 'ok' });
  });

  // ==================== ADMIN: LIST ALL TRANSACTIONS ====================
  app.get('/admin/all', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { page = '1', limit = '20', status } = request.query as {
      page?: string;
      limit?: string;
      status?: string;
    };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          order: {
            select: { orderNumber: true, totalAmount: true },
          },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    return reply.status(200).send({
      success: true,
      data: {
        transactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  });
}
