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
