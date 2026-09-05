import { pgTable, uuid, integer, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core'
import { reviewStatusEnum } from './enums'

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    productId: uuid('product_id').notNull(),
    orderId: uuid('order_id'),
    rating: integer('rating').notNull(),
    comment: text('comment'),
    images: jsonb('images'),
    status: reviewStatusEnum('status').default('PENDING').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('reviews_product_id_idx').on(t.productId),
    index('reviews_user_id_idx').on(t.userId),
    index('reviews_product_id_status_idx').on(t.productId, t.status),
  ],
)
