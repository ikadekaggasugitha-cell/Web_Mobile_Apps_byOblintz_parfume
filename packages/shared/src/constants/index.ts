export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    ME: '/api/auth/me',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
    OTP_SEND: '/api/auth/otp/send',
    OTP_VERIFY: '/api/auth/otp/verify',
  },
  PRODUCTS: {
    LIST: '/api/products',
    DETAIL: (slug: string) => `/api/products/${slug}`,
    SEARCH: '/api/products/search',
    RELATED: (slug: string) => `/api/products/${slug}/related`,
  },
  CATEGORIES: {
    LIST: '/api/categories',
    DETAIL: (slug: string) => `/api/categories/${slug}`,
  },
  CART: {
    GET: '/api/cart',
    ADD: '/api/cart/items',
    UPDATE: (id: string) => `/api/cart/items/${id}`,
    REMOVE: (id: string) => `/api/cart/items/${id}`,
    CLEAR: '/api/cart',
    APPLY_PROMO: '/api/cart/apply-promo',
  },
  ORDERS: {
    CHECKOUT: '/api/orders/checkout',
    LIST: '/api/orders',
    DETAIL: (id: string) => `/api/orders/${id}`,
    CANCEL: (id: string) => `/api/orders/${id}/cancel`,
    TRACKING: (id: string) => `/api/orders/${id}/tracking`,
  },
  PAYMENTS: {
    QRIS: '/api/payments/qris',
    STATUS: (id: string) => `/api/payments/${id}/status`,
    WEBHOOK: '/api/payments/webhook',
    RESEND: (id: string) => `/api/payments/${id}/resend`,
  },
  USERS: {
    ME: '/api/users/me',
    ADDRESSES: '/api/users/me/addresses',
    ADDRESS: (id: string) => `/api/users/me/addresses/${id}`,
  },
  REVIEWS: {
    LIST: (productSlug: string) => `/api/products/${productSlug}/reviews`,
    CREATE: (productSlug: string) => `/api/products/${productSlug}/reviews`,
    UPDATE: (id: string) => `/api/reviews/${id}`,
    DELETE: (id: string) => `/api/reviews/${id}`,
  },
  WISHLIST: {
    LIST: '/api/wishlist',
    ADD: '/api/wishlist',
    REMOVE: (productId: string) => `/api/wishlist/${productId}`,
  },
  COLLECTIONS: {
    LIST: '/api/collections',
    CREATE: '/api/collections',
    UPDATE: (id: string) => `/api/collections/${id}`,
    DELETE: (id: string) => `/api/collections/${id}`,
    ADD_ITEM: (id: string) => `/api/collections/${id}/items`,
    REMOVE_ITEM: (id: string, productId: string) => `/api/collections/${id}/items/${productId}`,
  },
  SUBSCRIPTIONS: {
    LIST: '/api/subscriptions',
    CREATE: '/api/subscriptions',
    UPDATE: (id: string) => `/api/subscriptions/${id}`,
    DELETE: (id: string) => `/api/subscriptions/${id}`,
    PAUSE: (id: string) => `/api/subscriptions/${id}/pause`,
    RESUME: (id: string) => `/api/subscriptions/${id}/resume`,
  },
  QUIZ: {
    START: '/api/quiz/start',
    ANSWER: '/api/quiz/answer',
    RESULT: (sessionId: string) => `/api/quiz/result/${sessionId}`,
    SAVE: '/api/quiz/save',
  },
} as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Menunggu Pembayaran',
  PAID: 'Dibayar',
  PROCESSING: 'Diproses',
  SHIPPED: 'Dikirim',
  DELIVERED: 'Terkirim',
  CANCELLED: 'Dibatalkan',
  REFUNDED: 'Dikembalikan',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Menunggu',
  PAID: 'Lunas',
  FAILED: 'Gagal',
  EXPIRED: 'Kadaluarsa',
  REFUNDED: 'Dikembalikan',
};

export const PRODUCT_STATUSES = ['ACTIVE', 'INACTIVE', 'DRAFT', 'ARCHIVED'] as const;

export const ORDER_STATUSES = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'] as const;
