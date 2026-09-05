export interface DashboardData {
  stats: {
    totalOrders: number;
    ordersThisMonth: number;
    totalProducts: number;
    totalUsers: number;
    totalSubscriptions: number;
    revenueThisMonth: number;
    grossRevenueThisMonth: number;
    discountThisMonth: number;
    netRevenueThisMonth: number;
    shippingThisMonth: number;
    avgOrderValue: number;
  };
  recentOrders: {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    user: { name: string };
  }[];
  topProducts: {
    name: string;
    price: number;
    totalSold: number;
    orderCount: number;
  }[];
}

export interface SalesData {
  period: string;
  summary: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    totalGross: number;
    totalDiscount: number;
    totalNet: number;
  };
  chart: {
    date: string;
    count: number;
    revenue: number;
    gross: number;
    discount: number;
    net: number;
  }[];
}

export interface FunnelData {
  totalOrders: number;
  funnel: {
    status: string;
    label: string;
    count: number;
    amount: number;
    percentage: number;
  }[];
}

export interface ProductReportData {
  stats: {
    totalProducts: number;
    activeProducts: number;
    lowStock: number;
    outOfStock: number;
  };
  topProducts: {
    productId: string;
    name: string;
    revenue: number;
    qty: number;
    orderCount: number;
  }[];
  byCategory: {
    categoryId: string | null;
    name: string;
    revenue: number;
    qty: number;
  }[];
}

export interface InventoryReportData {
  recap: {
    activeProducts: number;
    lowStock: number;
    outOfStock: number;
    inventoryValue: number;
  };
  byType: {
    type: string;
    count: number;
    netQty: number;
  }[];
  series: {
    date: string;
    masuk: number;
    keluar: number;
  }[];
}

export interface CustomerReportData {
  stats: {
    totalUsers: number;
    newUsersInRange: number;
    usersWithOrders: number;
    conversionRate: number;
    newCustomers: number;
    returningCustomers: number;
    activeBuyers: number;
  };
  subscriptionsByStatus: Record<string, number>;
  topCustomers: {
    userId: string;
    name: string;
    email: string;
    spend: number;
    orderCount: number;
  }[];
}

export interface PaymentReportData {
  summary: {
    totalPaid: number;
    totalFee: number;
    netReceived: number;
  };
  byMethod: {
    method: string;
    count: number;
    amount: number;
    fee: number;
    net: number;
  }[];
  byStatus: {
    status: string;
    count: number;
    amount: number;
  }[];
}

export interface PromoReportData {
  summary: {
    totalPromosUsed: number;
    totalOrdersWithPromo: number;
    totalDiscountGiven: number;
    revenueFromPromo: number;
  };
  promos: {
    promoCodeId: string | null;
    code: string;
    name: string | null;
    type: string;
    usedCount: number;
    usageLimit: number | null;
    ordersCount: number;
    totalDiscount: number;
    revenue: number;
  }[];
}

export type Period = 'daily' | 'weekly' | 'monthly';
