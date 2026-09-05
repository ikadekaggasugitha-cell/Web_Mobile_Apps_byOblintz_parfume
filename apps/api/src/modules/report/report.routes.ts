import { FastifyInstance } from 'fastify';
import { requireAdmin } from '../../middleware/auth';
import {
  getDashboardStats,
  getSalesReport,
  getStatusFunnel,
  getProductReport,
  getInventoryReport,
  getCustomerReport,
  getPaymentReport,
  getPromoReport,
} from './report.service';

type Period = 'daily' | 'weekly' | 'monthly';

function parseRange(query: unknown) {
  const { startDate, endDate } = (query ?? {}) as { startDate?: string; endDate?: string };
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();
  return { start, end };
}

export async function reportRoutes(app: FastifyInstance) {
  app.get('/dashboard', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const data = await getDashboardStats();
    return reply.status(200).send({ success: true, data });
  });

  app.get('/sales', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { period = 'daily', startDate, endDate } = request.query as {
      period?: Period;
      startDate?: string;
      endDate?: string;
    };

    const normalizedPeriod: Period = ['daily', 'weekly', 'monthly'].includes(period)
      ? period
      : 'daily';
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const data = await getSalesReport(normalizedPeriod, start, end);
    return reply.status(200).send({ success: true, data });
  });

  app.get('/sales/status-funnel', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { start, end } = parseRange(request.query);
    const data = await getStatusFunnel(start, end);
    return reply.status(200).send({ success: true, data });
  });

  app.get('/products', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { start, end } = parseRange(request.query);
    const data = await getProductReport(start, end);
    return reply.status(200).send({ success: true, data });
  });

  app.get('/inventory', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { start, end } = parseRange(request.query);
    const data = await getInventoryReport(start, end);
    return reply.status(200).send({ success: true, data });
  });

  app.get('/customers', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { start, end } = parseRange(request.query);
    const data = await getCustomerReport(start, end);
    return reply.status(200).send({ success: true, data });
  });

  app.get('/payments', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { start, end } = parseRange(request.query);
    const data = await getPaymentReport(start, end);
    return reply.status(200).send({ success: true, data });
  });

  app.get('/promos', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    const { start, end } = parseRange(request.query);
    const data = await getPromoReport(start, end);
    return reply.status(200).send({ success: true, data });
  });
}
