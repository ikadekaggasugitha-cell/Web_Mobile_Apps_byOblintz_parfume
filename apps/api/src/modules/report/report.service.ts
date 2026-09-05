import { db } from '../../db';
import {
  orders,
  orderItems,
  products,
  categories,
  stockMovements,
  transactions,
  promoCodes,
  users,
  subscriptions,
} from '../../db/schema';
import { eq, and, inArray, gte, lte, sql, count, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

/**
 * Order statuses that count as realised revenue. A payment has cleared, so the
 * order contributes to sales figures. Matches the historic behaviour of the
 * reports module (status-based, not transaction-based).
 */
export const PAID_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;

type Period = 'daily' | 'weekly' | 'monthly';

function truncUnit(period: Period): 'day' | 'week' | 'month' {
  if (period === 'monthly') return 'month';
  if (period === 'weekly') return 'week';
  return 'day';
}

/**
 * All date bucketing is done in WIB (Asia/Jakarta). Timestamp columns hold UTC
 * wall-clock values, so we reinterpret each as UTC and convert to Jakarta local
 * time before truncating. Without this a sale at 05:00 WIB would fall on the
 * previous day.
 */
function wibLocal(col: PgColumn): SQL {
  return sql`(${col} AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')`;
}

function wibBucket(col: PgColumn, period: Period): SQL {
  return sql`date_trunc('${sql.raw(truncUnit(period))}', ${wibLocal(col)})`;
}

function bucketLabel(bucket: SQL, period: Period): SQL<string> {
  // Format the label in SQL to avoid a JS Date round-trip: the bucket is already
  // a WIB wall-clock value, and passing it through `new Date().toISOString()`
  // would re-apply a timezone offset and shift the date by a day.
  const fmt = period === 'monthly' ? 'YYYY-MM' : 'YYYY-MM-DD';
  return sql<string>`to_char(${bucket}, '${sql.raw(fmt)}')`;
}

export async function getDashboardStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const paid = inArray(orders.status, PAID_STATUSES as any);

  const [
    totalOrdersResult,
    ordersThisMonthResult,
    totalProductsResult,
    totalUsersResult,
    totalSubscriptionsResult,
    revenueThisMonthResult,
    revenueTotalsResult,
    recentOrdersList,
    topProductsResult,
  ] = await Promise.all([
    db.select({ count: count() }).from(orders),
    db.select({ count: count() }).from(orders).where(gte(orders.createdAt, startOfMonth)),
    db.select({ count: count() }).from(products).where(eq(products.status, 'ACTIVE')),
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(subscriptions).where(eq(subscriptions.status, 'ACTIVE')),
    db
      .select({ total: sql<string>`coalesce(sum(${orders.totalAmount}), 0)::numeric` })
      .from(orders)
      .where(and(paid, gte(orders.createdAt, startOfMonth))),
    // Gross (product value), discount, net, shipping and order count over all paid orders this month.
    db
      .select({
        gross: sql<string>`coalesce(sum(${orders.subtotal}), 0)::numeric`,
        discount: sql<string>`coalesce(sum(${orders.discount}), 0)::numeric`,
        shipping: sql<string>`coalesce(sum(${orders.shippingFee}), 0)::numeric`,
        total: sql<string>`coalesce(sum(${orders.totalAmount}), 0)::numeric`,
        orderCount: count(),
      })
      .from(orders)
      .where(and(paid, gte(orders.createdAt, startOfMonth))),
    db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        totalAmount: orders.totalAmount,
        createdAt: orders.createdAt,
        user: { name: users.name, email: users.email },
      })
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .orderBy(sql`${orders.createdAt} DESC`)
      .limit(10),
    db
      .select({
        productId: orderItems.productId,
        count: count(),
        totalQty: sql<string>`sum(${orderItems.quantity})`,
      })
      .from(orderItems)
      .groupBy(orderItems.productId)
      .orderBy(sql`count(*) DESC`)
      .limit(5),
  ]);

  const topProductIds = topProductsResult.map((tp) => tp.productId);
  const topProductDetails = topProductIds.length
    ? await db
        .select({ id: products.id, name: products.name, price: products.price })
        .from(products)
        .where(inArray(products.id, topProductIds))
    : [];
  const topProductMap = new Map(topProductDetails.map((p) => [p.id, p]));

  const totals = revenueTotalsResult[0];
  const gross = Number(totals?.gross || 0);
  const discount = Number(totals?.discount || 0);
  const orderCount = Number(totals?.orderCount || 0);
  const totalAmount = Number(totals?.total || 0);

  return {
    stats: {
      totalOrders: totalOrdersResult[0]?.count || 0,
      ordersThisMonth: ordersThisMonthResult[0]?.count || 0,
      totalProducts: totalProductsResult[0]?.count || 0,
      totalUsers: totalUsersResult[0]?.count || 0,
      totalSubscriptions: totalSubscriptionsResult[0]?.count || 0,
      revenueThisMonth: Number(revenueThisMonthResult[0]?.total || 0),
      grossRevenueThisMonth: gross,
      discountThisMonth: discount,
      netRevenueThisMonth: gross - discount,
      shippingThisMonth: Number(totals?.shipping || 0),
      avgOrderValue: orderCount > 0 ? totalAmount / orderCount : 0,
    },
    recentOrders: recentOrdersList,
    topProducts: topProductsResult.map((tp) => ({
      ...topProductMap.get(tp.productId),
      orderCount: tp.count,
      totalSold: Number(tp.totalQty || 0),
    })),
  };
}

/**
 * Order lifecycle in the sequence a business reads it: acquisition → payment →
 * fulfilment, with the two failure states last. Drives a stable, ordered funnel.
 */
const STATUS_ORDER = [
  'PENDING',
  'WAITING_PAYMENT',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
] as const;

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Menunggu',
  WAITING_PAYMENT: 'Menunggu Bayar',
  PAID: 'Dibayar',
  PROCESSING: 'Diproses',
  SHIPPED: 'Dikirim',
  DELIVERED: 'Selesai',
  CANCELLED: 'Dibatalkan',
  REFUNDED: 'Dana Kembali',
};

export async function getStatusFunnel(start: Date, end: Date) {
  const rows = await db
    .select({
      status: orders.status,
      count: count(),
      amount: sql<string>`coalesce(sum(${orders.totalAmount}), 0)::numeric`,
    })
    .from(orders)
    .where(and(gte(orders.createdAt, start), lte(orders.createdAt, end)))
    .groupBy(orders.status);

  const byStatus = new Map(rows.map((r) => [r.status, r]));
  const totalOrders = rows.reduce((s, r) => s + Number(r.count), 0);

  const funnel = STATUS_ORDER.map((status) => {
    const row = byStatus.get(status);
    const count = Number(row?.count || 0);
    return {
      status,
      label: STATUS_LABELS[status],
      count,
      amount: Number(row?.amount || 0),
      percentage: totalOrders > 0 ? (count / totalOrders) * 100 : 0,
    };
  });

  return { totalOrders, funnel };
}

export async function getSalesReport(period: Period, start: Date, end: Date) {
  // The truncation unit is inlined (not bound as a parameter): if SELECT and
  // GROUP BY render different placeholders for the same value, Postgres treats the
  // bucket expressions as distinct and rejects created_at as ungrouped.
  const bucket = wibBucket(orders.createdAt, period);
  const label = bucketLabel(bucket, period);
  const paid = inArray(orders.status, PAID_STATUSES as any);

  const rows = await db
    .select({
      date: label,
      orders: count(),
      revenue: sql<string>`coalesce(sum(${orders.totalAmount}), 0)::numeric`,
      gross: sql<string>`coalesce(sum(${orders.subtotal}), 0)::numeric`,
      discount: sql<string>`coalesce(sum(${orders.discount}), 0)::numeric`,
    })
    .from(orders)
    .where(and(paid, gte(orders.createdAt, start), lte(orders.createdAt, end)))
    .groupBy(bucket)
    .orderBy(bucket);

  const chart = rows.map((r) => {
    const gross = Number(r.gross);
    const discount = Number(r.discount);
    return {
      date: r.date,
      count: Number(r.orders),
      revenue: Number(r.revenue),
      gross,
      discount,
      net: gross - discount,
    };
  });

  const totalRevenue = chart.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = chart.reduce((s, d) => s + d.count, 0);
  const totalGross = chart.reduce((s, d) => s + d.gross, 0);
  const totalDiscount = chart.reduce((s, d) => s + d.discount, 0);

  return {
    period,
    summary: {
      totalRevenue,
      totalOrders,
      avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      totalGross,
      totalDiscount,
      totalNet: totalGross - totalDiscount,
    },
    chart,
  };
}

// Revenue at the line-item level: unit price captured on the order times quantity.
const lineRevenue = sql`sum(${orderItems.price} * ${orderItems.quantity})`;

export async function getProductReport(start: Date, end: Date) {
  const paid = inArray(orders.status, PAID_STATUSES as any);
  const inRange = and(paid, gte(orders.createdAt, start), lte(orders.createdAt, end));

  const [statsRows, topByRevenue, byCategoryRows] = await Promise.all([
    db
      .select({
        total: count(),
        active: sql<string>`count(*) filter (where ${products.status} = 'ACTIVE')`,
        lowStock: sql<string>`count(*) filter (where ${products.status} = 'ACTIVE' and ${products.stock} between 1 and 5)`,
        outOfStock: sql<string>`count(*) filter (where ${products.stock} = 0)`,
      })
      .from(products),
    db
      .select({
        productId: orderItems.productId,
        name: products.name,
        revenue: sql<string>`coalesce(${lineRevenue}, 0)::numeric`,
        qty: sql<string>`coalesce(sum(${orderItems.quantity}), 0)`,
        orderCount: sql<string>`count(distinct ${orderItems.orderId})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(inRange)
      .groupBy(orderItems.productId, products.name)
      .orderBy(sql`${lineRevenue} desc nulls last`)
      .limit(10),
    db
      .select({
        categoryId: products.categoryId,
        name: sql<string>`coalesce(${categories.name}, 'Tanpa Kategori')`,
        revenue: sql<string>`coalesce(${lineRevenue}, 0)::numeric`,
        qty: sql<string>`coalesce(sum(${orderItems.quantity}), 0)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .leftJoin(products, eq(orderItems.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(inRange)
      .groupBy(products.categoryId, categories.name)
      .orderBy(sql`${lineRevenue} desc nulls last`),
  ]);

  const s = statsRows[0];
  return {
    stats: {
      totalProducts: Number(s?.total || 0),
      activeProducts: Number(s?.active || 0),
      lowStock: Number(s?.lowStock || 0),
      outOfStock: Number(s?.outOfStock || 0),
    },
    topProducts: topByRevenue.map((p) => ({
      productId: p.productId,
      name: p.name ?? 'Produk dihapus',
      revenue: Number(p.revenue),
      qty: Number(p.qty),
      orderCount: Number(p.orderCount),
    })),
    byCategory: byCategoryRows.map((c) => ({
      categoryId: c.categoryId,
      name: c.name,
      revenue: Number(c.revenue),
      qty: Number(c.qty),
    })),
  };
}

export async function getInventoryReport(start: Date, end: Date) {
  const movementRange = and(
    gte(stockMovements.createdAt, start),
    lte(stockMovements.createdAt, end),
  );
  const bucket = wibBucket(stockMovements.createdAt, 'daily');
  const label = bucketLabel(bucket, 'daily');

  const [recapRows, byTypeRows, seriesRows] = await Promise.all([
    db
      .select({
        active: sql<string>`count(*) filter (where ${products.status} = 'ACTIVE')`,
        lowStock: sql<string>`count(*) filter (where ${products.status} = 'ACTIVE' and ${products.stock} between 1 and 5)`,
        outOfStock: sql<string>`count(*) filter (where ${products.stock} = 0)`,
        inventoryValue: sql<string>`coalesce(sum(${products.stock} * ${products.price}), 0)::numeric`,
      })
      .from(products),
    db
      .select({
        type: stockMovements.type,
        count: count(),
        netQty: sql<string>`coalesce(sum(${stockMovements.quantity}), 0)`,
      })
      .from(stockMovements)
      .where(movementRange)
      .groupBy(stockMovements.type),
    db
      .select({
        date: label,
        masuk: sql<string>`coalesce(sum(${stockMovements.quantity}) filter (where ${stockMovements.quantity} > 0), 0)`,
        keluar: sql<string>`coalesce(-sum(${stockMovements.quantity}) filter (where ${stockMovements.quantity} < 0), 0)`,
      })
      .from(stockMovements)
      .where(movementRange)
      .groupBy(bucket)
      .orderBy(bucket),
  ]);

  const recap = recapRows[0];
  return {
    recap: {
      activeProducts: Number(recap?.active || 0),
      lowStock: Number(recap?.lowStock || 0),
      outOfStock: Number(recap?.outOfStock || 0),
      inventoryValue: Number(recap?.inventoryValue || 0),
    },
    byType: byTypeRows.map((r) => ({
      type: r.type,
      count: Number(r.count),
      netQty: Number(r.netQty),
    })),
    series: seriesRows.map((r) => ({
      date: r.date,
      masuk: Number(r.masuk),
      keluar: Number(r.keluar),
    })),
  };
}

export async function getCustomerReport(start: Date, end: Date) {
  const paid = inArray(orders.status, PAID_STATUSES as any);
  const inRange = and(paid, gte(orders.createdAt, start), lte(orders.createdAt, end));

  const [totalUsersRows, newUsersRows, withOrdersRows, subsRows, nvrRows, topCustomers] =
    await Promise.all([
      db.select({ count: count() }).from(users),
      db
        .select({ count: count() })
        .from(users)
        .where(and(gte(users.createdAt, start), lte(users.createdAt, end))),
      db.select({ count: sql<string>`count(distinct ${orders.userId})` }).from(orders).where(paid),
      db
        .select({ status: subscriptions.status, count: count() })
        .from(subscriptions)
        .groupBy(subscriptions.status),
      // New vs returning within the window: a customer is "new" if their first
      // paid order ever falls inside the window, "returning" if they bought in the
      // window but had already ordered before it. Dates are passed as ISO strings
      // cast to `timestamp` — postgres-js cannot bind a raw Date in db.execute, and
      // created_at stores UTC wall-clock so the cast compares correctly.
      db.execute(sql`
        select
          count(*) filter (where first_order >= ${start.toISOString()}::timestamp) as new_customers,
          count(*) filter (where first_order < ${start.toISOString()}::timestamp) as returning_customers
        from (
          select
            user_id,
            min(created_at) as first_order,
            bool_or(created_at >= ${start.toISOString()}::timestamp and created_at <= ${end.toISOString()}::timestamp) as active_in_range
          from ${orders}
          where status in ('PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED')
          group by user_id
        ) t
        where active_in_range
      `),
      db
        .select({
          userId: orders.userId,
          name: users.name,
          email: users.email,
          spend: sql<string>`coalesce(sum(${orders.totalAmount}), 0)::numeric`,
          orderCount: count(),
        })
        .from(orders)
        .innerJoin(users, eq(orders.userId, users.id))
        .where(inRange)
        .groupBy(orders.userId, users.name, users.email)
        .orderBy(sql`sum(${orders.totalAmount}) desc`)
        .limit(10),
    ]);

  const totalUsers = Number(totalUsersRows[0]?.count || 0);
  const usersWithOrders = Number(withOrdersRows[0]?.count || 0);
  const nvr = (nvrRows as unknown as { new_customers: number; returning_customers: number }[])[0];
  const newCustomers = Number(nvr?.new_customers || 0);
  const returningCustomers = Number(nvr?.returning_customers || 0);

  const subscriptionsByStatus: Record<string, number> = {};
  for (const s of subsRows) subscriptionsByStatus[s.status] = Number(s.count);

  return {
    stats: {
      totalUsers,
      newUsersInRange: Number(newUsersRows[0]?.count || 0),
      usersWithOrders,
      conversionRate: totalUsers > 0 ? (usersWithOrders / totalUsers) * 100 : 0,
      newCustomers,
      returningCustomers,
      activeBuyers: newCustomers + returningCustomers,
    },
    subscriptionsByStatus,
    topCustomers: topCustomers.map((c) => ({
      userId: c.userId,
      name: c.name,
      email: c.email,
      spend: Number(c.spend),
      orderCount: Number(c.orderCount),
    })),
  };
}

export async function getPaymentReport(start: Date, end: Date) {
  const inRange = and(gte(transactions.createdAt, start), lte(transactions.createdAt, end));

  const [byMethodRows, byStatusRows] = await Promise.all([
    db
      .select({
        method: sql<string>`coalesce(${transactions.method}, 'Lainnya')`,
        count: count(),
        amount: sql<string>`coalesce(sum(${transactions.amount}), 0)::numeric`,
        fee: sql<string>`coalesce(sum(${transactions.fee}), 0)::numeric`,
      })
      .from(transactions)
      .where(and(eq(transactions.status, 'PAID'), inRange))
      .groupBy(sql`coalesce(${transactions.method}, 'Lainnya')`)
      .orderBy(sql`sum(${transactions.amount}) desc`),
    db
      .select({
        status: transactions.status,
        count: count(),
        amount: sql<string>`coalesce(sum(${transactions.amount}), 0)::numeric`,
      })
      .from(transactions)
      .where(inRange)
      .groupBy(transactions.status),
  ]);

  const byMethod = byMethodRows.map((r) => ({
    method: r.method,
    count: Number(r.count),
    amount: Number(r.amount),
    fee: Number(r.fee),
    net: Number(r.amount) - Number(r.fee),
  }));

  const totalPaid = byMethod.reduce((s, r) => s + r.amount, 0);
  const totalFee = byMethod.reduce((s, r) => s + r.fee, 0);

  return {
    summary: {
      totalPaid,
      totalFee,
      netReceived: totalPaid - totalFee,
    },
    byMethod,
    byStatus: byStatusRows.map((r) => ({
      status: r.status,
      count: Number(r.count),
      amount: Number(r.amount),
    })),
  };
}

export async function getPromoReport(start: Date, end: Date) {
  const inRange = and(
    inArray(orders.status, PAID_STATUSES as any),
    gte(orders.createdAt, start),
    lte(orders.createdAt, end),
  );

  const rows = await db
    .select({
      promoCodeId: orders.promoCodeId,
      code: promoCodes.code,
      name: promoCodes.name,
      type: promoCodes.type,
      usedCount: promoCodes.usedCount,
      usageLimit: promoCodes.usageLimit,
      ordersCount: count(),
      totalDiscount: sql<string>`coalesce(sum(${orders.discount}), 0)::numeric`,
      revenue: sql<string>`coalesce(sum(${orders.totalAmount}), 0)::numeric`,
    })
    .from(orders)
    .innerJoin(promoCodes, eq(orders.promoCodeId, promoCodes.id))
    .where(inRange)
    .groupBy(
      orders.promoCodeId,
      promoCodes.code,
      promoCodes.name,
      promoCodes.type,
      promoCodes.usedCount,
      promoCodes.usageLimit,
    )
    .orderBy(sql`sum(${orders.discount}) desc`);

  const promos = rows.map((r) => ({
    promoCodeId: r.promoCodeId,
    code: r.code,
    name: r.name,
    type: r.type,
    usedCount: Number(r.usedCount || 0),
    usageLimit: r.usageLimit === null ? null : Number(r.usageLimit),
    ordersCount: Number(r.ordersCount),
    totalDiscount: Number(r.totalDiscount),
    revenue: Number(r.revenue),
  }));

  return {
    summary: {
      totalPromosUsed: promos.length,
      totalOrdersWithPromo: promos.reduce((s, p) => s + p.ordersCount, 0),
      totalDiscountGiven: promos.reduce((s, p) => s + p.totalDiscount, 0),
      revenueFromPromo: promos.reduce((s, p) => s + p.revenue, 0),
    },
    promos,
  };
}
