import { pgEnum } from 'drizzle-orm/pg-core'

export const userRoleEnum = pgEnum('user_role', ['USER', 'ADMIN', 'SUPER_ADMIN'])
export const productStatusEnum = pgEnum('product_status', ['ACTIVE', 'INACTIVE', 'DRAFT', 'ARCHIVED'])
export const orderStatusEnum = pgEnum('order_status', [
  'PENDING',
  'WAITING_PAYMENT',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
])
export const paymentStatusEnum = pgEnum('payment_status', ['PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED'])
export const subscriptionStatusEnum = pgEnum('subscription_status', ['ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED'])
export const subscriptionFrequencyEnum = pgEnum('subscription_frequency', ['MONTHLY', 'QUARTERLY'])
export const reviewStatusEnum = pgEnum('review_status', ['PENDING', 'APPROVED', 'REJECTED'])
export const promoTypeEnum = pgEnum('promo_type', ['PERCENTAGE', 'FIXED', 'FREE_SHIPPING'])
export const promoCodeStatusEnum = pgEnum('promo_code_status', ['ACTIVE', 'INACTIVE', 'EXPIRED'])
export const stockMovementTypeEnum = pgEnum('stock_movement_type', ['ORDER', 'CANCEL', 'RESTOCK', 'ADJUSTMENT', 'RETURN'])
