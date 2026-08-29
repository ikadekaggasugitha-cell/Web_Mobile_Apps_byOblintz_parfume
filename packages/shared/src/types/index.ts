export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED';

export type OrderStatus = 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED';

export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED';

export type SubscriptionFrequency = 'MONTHLY' | 'QUARTERLY';

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type PromoType = 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING';

export interface User {
  id: string;
  email: string;
  phone?: string;
  name: string;
  avatar?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  comparePrice?: number;
  stock: number;
  sku?: string;
  weight?: number;
  categoryId?: string;
  notes?: {
    top: string[];
    middle: string[];
    base: string[];
  };
  occasions: string[];
  status: ProductStatus;
  images?: Array<{ url: string; alt: string; isPrimary: boolean }>;
  metaTitle?: string;
  metaDesc?: string;
  createdAt: Date;
  updatedAt: Date;
  category?: Category;
  reviews?: Review[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string;
  sortOrder: number;
  createdAt: Date;
  products?: Product[];
}

export interface Order {
  id: string;
  userId: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  shippingFee: number;
  discount: number;
  totalAmount: number;
  shippingAddress?: any;
  notes?: string;
  giftMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  items?: OrderItem[];
  transaction?: Transaction;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  giftWrap: boolean;
  product?: Product;
}

export interface Transaction {
  id: string;
  orderId: string;
  paymentId?: string;
  amount: number;
  fee: number;
  status: PaymentStatus;
  method?: string;
  qrCode?: string;
  callbackData?: any;
  paidAt?: Date;
  createdAt: Date;
}

export interface Review {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  comment?: string;
  images?: any;
  status: ReviewStatus;
  createdAt: Date;
  user?: User;
}

export interface Address {
  id: string;
  userId: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface CartItem {
  productId: string;
  quantity: number;
  giftWrap: boolean;
  product?: Product;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number | null;
  images: string[];
  category?: { name: string };
  _count?: { reviews: number };
}

export interface CartData {
  items: CartItem[];
  summary: {
    subtotal: number;
    totalItems: number;
  };
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
}

export interface Subscription {
  id: string;
  frequency: SubscriptionFrequency;
  status: SubscriptionStatus;
  nextDelivery?: string;
  lastDelivery?: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string };
  product: {
    id: string;
    name: string;
    price: number;
    images: string[];
    category: { name: string };
  };
}

export interface AdminSubscription {
  id: string;
  frequency: SubscriptionFrequency;
  status: SubscriptionStatus;
  nextDelivery: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
  product: { id: string; name: string; price: number };
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  user: { name: string; email: string };
  items: { product: { name: string }; quantity: number }[];
}

export interface DashboardStats {
  stats: {
    totalOrders: number;
    ordersThisMonth: number;
    totalProducts: number;
    totalUsers: number;
    totalSubscriptions: number;
    revenueThisMonth: number;
  };
  recentOrders: any[];
  topProducts: {
    name: string;
    price: number;
    totalSold: number;
    orderCount: number;
  }[];
}

export type BadgeVariant = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger' | 'info';
