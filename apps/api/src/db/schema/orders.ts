import { pgTable, uuid, varchar, text, decimal, integer, boolean, jsonb, timestamp, index } from 'drizzle-orm/pg-core'
import { orderStatusEnum, paymentStatusEnum } from './enums'

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
    status: orderStatusEnum('status').default('PENDING').notNull(),
    subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
    shippingFee: decimal('shipping_fee', { precision: 10, scale: 2 }).default('0').notNull(),
    discount: decimal('discount', { precision: 10, scale: 2 }).default('0').notNull(),
    totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
    promoCodeId: uuid('promo_code_id'),
    shippingAddress: jsonb('shipping_address'),
    notes: text('notes'),
    giftMessage: text('gift_message'),
    estimatedDelivery: timestamp('estimated_delivery'),
    shippedAt: timestamp('shipped_at'),
    deliveredAt: timestamp('delivered_at'),
    paidAt: timestamp('paid_at'),
    cancelledAt: timestamp('cancelled_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('orders_user_id_idx').on(t.userId),
    index('orders_status_idx').on(t.status),
    index('orders_user_id_status_idx').on(t.userId, t.status),
    index('orders_user_id_created_at_idx').on(t.userId, t.createdAt),
    index('orders_status_created_at_idx').on(t.status, t.createdAt),
  ],
)

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id').notNull(),
    productId: uuid('product_id').notNull(),
    quantity: integer('quantity').notNull(),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    giftWrap: boolean('gift_wrap').default(false).notNull(),
    giftWrapPrice: decimal('gift_wrap_price', { precision: 10, scale: 2 }).default('0').notNull(),
  },
  (t) => [
    index('order_items_order_id_idx').on(t.orderId),
    index('order_items_product_id_idx').on(t.productId),
  ],
)

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id').notNull().unique(),
    paymentId: varchar('payment_id', { length: 255 }),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    fee: decimal('fee', { precision: 10, scale: 2 }).default('0').notNull(),
    status: paymentStatusEnum('status').default('PENDING').notNull(),
    method: varchar('method', { length: 50 }),
    qrCode: text('qr_code'),
    callbackData: jsonb('callback_data'),
    paidAt: timestamp('paid_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('transactions_order_id_idx').on(t.orderId),
    index('transactions_payment_id_idx').on(t.paymentId),
  ],
)

export const giftWrappings = pgTable('gift_wrappings', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().unique(),
  wrappingType: varchar('wrapping_type', { length: 50 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  message: text('message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
