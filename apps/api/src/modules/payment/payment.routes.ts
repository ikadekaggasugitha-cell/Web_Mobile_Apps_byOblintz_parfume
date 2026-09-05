import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { db } from '../../db';
import { orders, orderItems, transactions } from '../../db/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { config } from '../../config';
import {
  createMidtransQRIS,
  verifyMidtransSignature,
} from '../../services/midtrans';

export async function paymentRoutes(app: FastifyInstance) {
  app.post('/create', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { orderId } = request.body as { orderId: string };

    const [order] = await db.select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, request.userId!)))
      .limit(1);

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

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

    const paymentId = `PAY-${order.orderNumber}-${Date.now()}`;
    const shipping = order.shippingAddress as any;

    try {
      let qrCode = '';

      if (config.midtrans.serverKey) {
        const midtransResponse = await createMidtransQRIS(
          order.orderNumber,
          Number(order.totalAmount),
          {
            name: shipping?.name || 'Customer',
            email: shipping?.email || 'customer@oblintz.com',
            phone: shipping?.phone || '',
          }
        );

        const qrAction = midtransResponse.actions?.find(
          (a) => a.method === 'GET_QR'
        );
        qrCode = qrAction?.url || midtransResponse.qr_code || midtransResponse.payment_code || '';

        if (!qrCode && midtransResponse.redirect_url) {
          qrCode = midtransResponse.redirect_url;
        }
      } else {
        qrCode = `00020101021226${order.orderNumber}52040000530336054${Number(order.totalAmount)}5802ID5925OBLINTZ PERFUME6006JAKARTA6304`;
      }

      const transaction = await db.transaction(async (tx) => {
        const [newTransaction] = await tx.insert(transactions).values({
          orderId: order.id,
          paymentId,
          amount: order.totalAmount,
          method: 'QRIS',
          status: 'PENDING',
          qrCode,
        }).returning();

        await tx.update(orders)
          .set({ status: 'WAITING_PAYMENT' })
          .where(eq(orders.id, order.id));

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

  app.get('/status/:orderId', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const { orderId } = request.params as { orderId: string };

    const [transaction] = await db.select({
      id: transactions.id,
      status: transactions.status,
      amount: transactions.amount,
      orderId: transactions.orderId,
      order: {
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
      },
    })
      .from(transactions)
      .innerJoin(orders, eq(transactions.orderId, orders.id))
      .where(eq(transactions.orderId, orderId))
      .limit(1);

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

  app.post('/webhook', async (request, reply) => {
    const body = request.body as any;

    if (!verifyMidtransSignature(body)) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_SIGNATURE', message: 'Signature tidak valid' },
      });
    }

    const { order_id, transaction_status, fraud_status } = body;

    const [transaction] = await db.select()
      .from(transactions)
      .innerJoin(orders, eq(transactions.orderId, orders.id))
      .where(eq(orders.orderNumber, order_id))
      .limit(1);

    if (!transaction) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Transaksi tidak ditemukan' },
      });
    }

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

    await db.transaction(async (tx) => {
      await tx.update(transactions)
        .set({
          status: txStatus,
          callbackData: body,
        })
        .where(eq(transactions.id, transaction.transactions.id));

      const orderUpdate: Record<string, any> = { status: orderStatus };
      if (orderStatus === 'PAID') {
        orderUpdate.paidAt = new Date();
      }

      await tx.update(orders)
        .set(orderUpdate)
        .where(eq(orders.id, transaction.transactions.orderId));
    });

    return reply.status(200).send({ status: 'ok' });
  });

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
    const offset = (pageNum - 1) * limitNum;

    const whereClause = status ? eq(transactions.status, status as any) : undefined;

    const [transactionList, countResult] = await Promise.all([
      db.select({
        id: transactions.id,
        orderId: transactions.orderId,
        paymentId: transactions.paymentId,
        amount: transactions.amount,
        fee: transactions.fee,
        status: transactions.status,
        method: transactions.method,
        createdAt: transactions.createdAt,
        order: {
          orderNumber: orders.orderNumber,
          totalAmount: orders.totalAmount,
        },
      })
        .from(transactions)
        .innerJoin(orders, eq(transactions.orderId, orders.id))
        .where(whereClause)
        .orderBy(desc(transactions.createdAt))
        .limit(limitNum)
        .offset(offset),
      db.select({ count: count() }).from(transactions).where(whereClause),
    ]);

    return reply.status(200).send({
      success: true,
      data: {
        transactions: transactionList,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: countResult[0]?.count || 0,
          totalPages: Math.ceil((countResult[0]?.count || 0) / limitNum),
        },
      },
    });
  });
}
