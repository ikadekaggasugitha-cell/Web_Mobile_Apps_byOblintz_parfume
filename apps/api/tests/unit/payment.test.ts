import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';

const SERVER_KEY = 'test-server-key';

const configHolder = vi.hoisted(() => ({
  midtrans: { serverKey: 'test-server-key', isProduction: false },
  frontendUrl: 'http://localhost:3000',
}));

vi.mock('@/config', () => ({ config: configHolder }));

const prisma = vi.hoisted(() => ({
  order: { findFirst: vi.fn(), update: vi.fn() },
  transaction: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock('@/config/database', () => ({
  default: prisma,
  prisma,
}));

vi.mock('@/services/midtrans', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/midtrans')>();
  return {
    ...actual,
    createMidtransQRIS: vi.fn(),
  };
});

import { paymentRoutes } from '@/modules/payment/payment.routes';
import { createMidtransQRIS } from '@/services/midtrans';

const USER_ID = 'user-1';

function makeOrder(status: string) {
  return {
    id: 'order-1',
    orderNumber: 'ORD-001',
    userId: USER_ID,
    status,
    totalAmount: 250000,
    shippingAddress: { name: 'Budi', email: 'budi@example.com', phone: '081234567890' },
    items: [{ id: 'item-1', orderId: 'order-1' }],
  };
}

function signedWebhook(overrides: Record<string, unknown> = {}) {
  const body: Record<string, unknown> = {
    order_id: 'ORD-001',
    status_code: '200',
    gross_amount: '250000.00',
    ...overrides,
  };
  if (!('signature_key' in body)) {
    body.signature_key = crypto
      .createHash('sha512')
      .update(`${body.order_id}${body.status_code}${body.gross_amount}${SERVER_KEY}`)
      .digest('hex');
  }
  return body;
}

describe('payment module (TC-040 – TC-043)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(jwt, { secret: 'test-jwt-secret-min-32-characters!!' });
    await app.register(paymentRoutes, { prefix: '/api/payments' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma));
    prisma.order.update.mockResolvedValue({});
    prisma.transaction.create.mockResolvedValue({
      id: 'tx-1',
      orderId: 'order-1',
      paymentId: 'PAY-ORD-001-0000',
      status: 'PENDING',
    });
    prisma.transaction.update.mockResolvedValue({});
  });

  // ==================== TC-040: GENERATE QRIS ====================
  describe('TC-040: POST /api/payments/create', () => {
    it('generates QRIS code from Midtrans and stores PENDING transaction', async () => {
      prisma.order.findFirst.mockResolvedValue(makeOrder('PENDING'));
      vi.mocked(createMidtransQRIS).mockResolvedValue({
        status_code: '201',
        status_message: 'Success',
        transaction_id: 'mt-tx-1',
        order_id: 'ORD-001',
        gross_amount: '250000.00',
        payment_type: 'qris',
        transaction_time: '2026-08-30 01:00:00',
        transaction_status: 'pending',
        actions: [
          { name: 'generate-qr-code', method: 'GET', url: 'https://api.sandbox.midtrans.com/v2/qr/mt-tx-1' },
          { name: 'generate-qr-code-metadata', method: 'GET_QR', url: 'https://qr.midtrans.com/ABC123' },
        ],
      } as any);

      const res = await app.inject({
        method: 'POST',
        url: '/api/payments/create',
        headers: { authorization: `Bearer ${app.jwt.sign({ id: USER_ID })}` },
        payload: { orderId: 'order-1' },
      });

      expect(res.statusCode).toBe(201);
      const data = res.json().data;
      expect(data.qrCode).toBe('https://qr.midtrans.com/ABC123');
      expect(data.orderNumber).toBe('ORD-001');
      expect(data.amount).toBe(250000);
      expect(data.paymentId).toMatch(/^PAY-ORD-001-\d+$/);
      expect(data.expiresAt).toBeDefined();

      expect(createMidtransQRIS).toHaveBeenCalledWith(
        'ORD-001',
        250000,
        { name: 'Budi', email: 'budi@example.com', phone: '081234567890' }
      );
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 'order-1',
          method: 'QRIS',
          status: 'PENDING',
          qrCode: 'https://qr.midtrans.com/ABC123',
        }),
      });
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'WAITING_PAYMENT' },
      });
    });

    it('falls back to mock QRIS payload when server key is not configured', async () => {
      configHolder.midtrans.serverKey = '';
      try {
        prisma.order.findFirst.mockResolvedValue(makeOrder('WAITING_PAYMENT'));

        const res = await app.inject({
          method: 'POST',
          url: '/api/payments/create',
          headers: { authorization: `Bearer ${app.jwt.sign({ id: USER_ID })}` },
          payload: { orderId: 'order-1' },
        });

        expect(res.statusCode).toBe(201);
        expect(res.json().data.qrCode).toContain('ORD-001');
        expect(createMidtransQRIS).not.toHaveBeenCalled();
      } finally {
        configHolder.midtrans.serverKey = SERVER_KEY;
      }
    });

    it('returns 404 when order does not exist or is not owned by user', async () => {
      prisma.order.findFirst.mockResolvedValue(null);

      const res = await app.inject({
        method: 'POST',
        url: '/api/payments/create',
        headers: { authorization: `Bearer ${app.jwt.sign({ id: USER_ID })}` },
        payload: { orderId: 'order-999' },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('NOT_FOUND');
      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });

    it('returns 400 INVALID_STATUS when order is not awaiting payment', async () => {
      prisma.order.findFirst.mockResolvedValue(makeOrder('SHIPPED'));

      const res = await app.inject({
        method: 'POST',
        url: '/api/payments/create',
        headers: { authorization: `Bearer ${app.jwt.sign({ id: USER_ID })}` },
        payload: { orderId: 'order-1' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('INVALID_STATUS');
    });

    it('returns 500 PAYMENT_ERROR when Midtrans charge fails', async () => {
      prisma.order.findFirst.mockResolvedValue(makeOrder('PENDING'));
      vi.mocked(createMidtransQRIS).mockRejectedValue(new Error('Midtrans unavailable'));

      const res = await app.inject({
        method: 'POST',
        url: '/api/payments/create',
        headers: { authorization: `Bearer ${app.jwt.sign({ id: USER_ID })}` },
        payload: { orderId: 'order-1' },
      });

      expect(res.statusCode).toBe(500);
      expect(res.json().error.code).toBe('PAYMENT_ERROR');
      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });

    it('returns 401 when no token provided', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/payments/create',
        payload: { orderId: 'order-1' },
      });

      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe('UNAUTHORIZED');
    });
  });

  // ==================== TC-041: QRIS SUCCESS ====================
  describe('TC-041: POST /api/payments/webhook (settlement)', () => {
    it('confirms order as PAID and stamps paidAt', async () => {
      prisma.transaction.findFirst.mockResolvedValue({ id: 'tx-1', orderId: 'order-1' });

      const body = signedWebhook({ transaction_status: 'settlement' });
      const res = await app.inject({ method: 'POST', url: '/api/payments/webhook', payload: body });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ status: 'ok' });
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-1' },
        data: { status: 'SUCCESS', callbackData: body },
      });
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: 'PAID', paidAt: expect.any(Date) },
      });
    });

    it('confirms order on capture with fraud_status accept', async () => {
      prisma.transaction.findFirst.mockResolvedValue({ id: 'tx-1', orderId: 'order-1' });

      const res = await app.inject({
        method: 'POST',
        url: '/api/payments/webhook',
        payload: signedWebhook({ transaction_status: 'capture', fraud_status: 'accept' }),
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.transaction.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'SUCCESS' }) })
      );
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'PAID' }) })
      );
    });

    it('keeps PENDING on capture with fraud_status challenge', async () => {
      prisma.transaction.findFirst.mockResolvedValue({ id: 'tx-1', orderId: 'order-1' });

      const res = await app.inject({
        method: 'POST',
        url: '/api/payments/webhook',
        payload: signedWebhook({ transaction_status: 'capture', fraud_status: 'challenge' }),
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.transaction.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING' }) })
      );
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'WAITING_PAYMENT' } })
      );
    });
  });

  // ==================== TC-042: QRIS EXPIRED ====================
  describe('TC-042: POST /api/payments/webhook (expire)', () => {
    it('marks transaction FAILED and does not confirm the order', async () => {
      prisma.transaction.findFirst.mockResolvedValue({ id: 'tx-1', orderId: 'order-1' });

      const res = await app.inject({
        method: 'POST',
        url: '/api/payments/webhook',
        payload: signedWebhook({ transaction_status: 'expire' }),
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-1' },
        data: { status: 'FAILED', callbackData: expect.any(Object) },
      });
      const orderData = prisma.order.update.mock.calls[0][0].data;
      expect(orderData.status).toBe('WAITING_PAYMENT');
      expect(orderData.paidAt).toBeUndefined();
    });

    it.each(['deny', 'cancel'])('marks transaction FAILED on webhook %s', async (status) => {
      prisma.transaction.findFirst.mockResolvedValue({ id: 'tx-1', orderId: 'order-1' });

      const res = await app.inject({
        method: 'POST',
        url: '/api/payments/webhook',
        payload: signedWebhook({ transaction_status: status }),
      });

      expect(res.statusCode).toBe(200);
      expect(prisma.transaction.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) })
      );
      const orderData = prisma.order.update.mock.calls[0][0].data;
      expect(orderData.status).toBe('WAITING_PAYMENT');
    });

    it('rejects webhook with invalid signature (401 INVALID_SIGNATURE)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/payments/webhook',
        payload: signedWebhook({ transaction_status: 'expire', signature_key: 'deadbeef' }),
      });

      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe('INVALID_SIGNATURE');
      expect(prisma.transaction.findFirst).not.toHaveBeenCalled();
    });

    it('fails closed when server key is not configured (401)', async () => {
      configHolder.midtrans.serverKey = '';
      try {
        const res = await app.inject({
          method: 'POST',
          url: '/api/payments/webhook',
          payload: signedWebhook({ transaction_status: 'expire' }),
        });

        expect(res.statusCode).toBe(401);
        expect(res.json().error.code).toBe('INVALID_SIGNATURE');
        expect(prisma.transaction.update).not.toHaveBeenCalled();
      } finally {
        configHolder.midtrans.serverKey = SERVER_KEY;
      }
    });

    it('returns 404 when webhook references unknown order', async () => {
      prisma.transaction.findFirst.mockResolvedValue(null);

      const res = await app.inject({
        method: 'POST',
        url: '/api/payments/webhook',
        payload: signedWebhook({ transaction_status: 'expire' }),
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('NOT_FOUND');
    });
  });

  // ==================== TC-043: WEBHOOK IDEMPOTENT ====================
  describe('TC-043: webhook idempotency', () => {
    it('duplicate settlement webhooks keep state SUCCESS/PAID without corruption', async () => {
      prisma.transaction.findFirst.mockResolvedValue({ id: 'tx-1', orderId: 'order-1' });

      const body = signedWebhook({ transaction_status: 'settlement' });
      const first = await app.inject({ method: 'POST', url: '/api/payments/webhook', payload: body });
      const second = await app.inject({ method: 'POST', url: '/api/payments/webhook', payload: body });

      expect(first.statusCode).toBe(200);
      expect(second.statusCode).toBe(200);
      expect(first.json()).toEqual({ status: 'ok' });
      expect(second.json()).toEqual({ status: 'ok' });

      expect(prisma.$transaction).toHaveBeenCalledTimes(2);

      const statuses = prisma.transaction.update.mock.calls.map(
        (c) => (c[0] as { data: { status: string } }).data.status
      );
      expect(statuses).toEqual(['SUCCESS', 'SUCCESS']);

      const orderCalls = prisma.order.update.mock.calls.map(
        (c) => (c[0] as { data: { status: string } }).data
      );
      expect(orderCalls.every((d) => d.status === 'PAID')).toBe(true);
    });
  });

  // ==================== GET /status/:orderId ====================
  describe('GET /api/payments/status/:orderId', () => {
    it('returns transaction status with order summary', async () => {
      prisma.transaction.findFirst.mockResolvedValue({
        id: 'tx-1',
        status: 'PENDING',
        amount: 250000,
        order: { id: 'order-1', orderNumber: 'ORD-001', status: 'WAITING_PAYMENT' },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/payments/status/order-1',
        headers: { authorization: `Bearer ${app.jwt.sign({ id: USER_ID })}` },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.status).toBe('PENDING');
      expect(data.amount).toBe(250000);
      expect(data.order.orderNumber).toBe('ORD-001');
    });

    it('returns 404 when no transaction exists for the order', async () => {
      prisma.transaction.findFirst.mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/api/payments/status/order-999',
        headers: { authorization: `Bearer ${app.jwt.sign({ id: USER_ID })}` },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('NOT_FOUND');
    });
  });

  // ==================== GET /admin/all ====================
  describe('GET /api/payments/admin/all', () => {
    it('rejects non-admin user (403 FORBIDDEN)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/payments/admin/all',
        headers: { authorization: `Bearer ${app.jwt.sign({ id: USER_ID })}` },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe('FORBIDDEN');
    });

    it('lists transactions with pagination for admin', async () => {
      prisma.transaction.findMany.mockResolvedValue([
        { id: 'tx-1', status: 'SUCCESS', order: { orderNumber: 'ORD-001', totalAmount: 250000 } },
      ]);
      prisma.transaction.count.mockResolvedValue(1);

      const res = await app.inject({
        method: 'GET',
        url: '/api/payments/admin/all?page=1&limit=20',
        headers: { authorization: `Bearer ${app.jwt.sign({ id: USER_ID, role: 'ADMIN' })}` },
      });

      expect(res.statusCode).toBe(200);
      const data = res.json().data;
      expect(data.transactions).toHaveLength(1);
      expect(data.pagination).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    });
  });
});
