import { pgTable, uuid, timestamp, unique } from 'drizzle-orm/pg-core'

export const wishlists = pgTable(
  'wishlists',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    productId: uuid('product_id').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [unique('wishlists_user_id_product_id_unique').on(t.userId, t.productId)],
)
