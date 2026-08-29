import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import prisma from '../../config/database';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { config } from '../../config';
import {
  createMidtransQRIS,
  verifyMidtransSignature,
} from '../../services/midtrans';

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

    const paymentId = `PAY-${order.orderNumber}-${Date.now()}`;
    const shipping = order.shippingAddress as any;

    try {
      let qrCode = '';

      if (config.midtrans.serverKey) {
        // Real Midtrans integration
        const midtransResponse = await createMidtransQRIS(
          order.orderNumber,
          Number(order.totalAmount),
          {
            name: shipping?.name || 'Customer',
            email: shipping?.email || 'customer@oblintz.com',
            phone: shipping?.phone || '',
          }
        );

        // Extract QR code from actions
        const qrAction = midtransResponse.actions?.find(
          (a) => a.method === 'GET_QR'
        );
        qrCode = qrAction?.url || midtransResponse.qr_code || midtransResponse.payment_code || '';

        // If no QR from actions, generate from snap URL
        if (!qrCode && midtransResponse.redirect_url) {
          qrCode = midtransResponse.redirect_url;
        }
      } else {
        // Mock QR code for sandbox/dev without keys
        qrCode = `00020101021226${order.orderNumber}52040000530336054${Number(order.totalAmount)}5802ID5925OBLINTZ PERFUME6006JAKARTA6304`;
      }

      // Save transaction record + update order status secara atomik
      const transaction = await prisma.$transaction(async (tx: any) => {
        const newTransaction = await tx.transaction.create({
          data: {
            orderId: order.id,
            paymentId,
            amount: order.totalAmount,
            method: 'QRIS',
            status: 'PENDING',
            qrCode,
          },
        });

        await tx.order.update({
          where: { id: order.id },
          data: { status: 'WAITING_PAYMENT' },
        });

        return newTransaction;
      });

      return reply.status(201).send({
        success: true,
        data: {
          transactionId: transaction.id,
          paymentId,
          orderNumber: order.orderNumber,
          amount: order.totalAmount,
          qrCode,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });
    } catch (error: any) {
      request.log.error('Midtrans error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'PAYMENT_ERROR',
          message: 'Gagal membuat pembayaran. Silakan coba lagi.',
        },
      });
    }
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

    // Verify signature
    if (!verifyMidtransSignature(body)) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_SIGNATURE', message: 'Signature tidak valid' },
      });
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
    preHandler: [requireAdmin],
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
