import { pgTable, uuid, timestamp, unique } from 'drizzle-orm/pg-core'

export const promoRedemptions = pgTable(
  'promo_redemptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    promoId: uuid('promo_id').notNull(),
    orderId: uuid('order_id').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    unique('promo_redemptions_user_promo_unique').on(t.userId, t.promoId),
  ],
)
