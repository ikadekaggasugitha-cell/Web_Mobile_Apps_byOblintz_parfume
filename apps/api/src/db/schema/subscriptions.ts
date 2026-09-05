import { pgTable, uuid, timestamp, index } from 'drizzle-orm/pg-core'
import { subscriptionFrequencyEnum, subscriptionStatusEnum } from './enums'

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    productId: uuid('product_id').notNull(),
    frequency: subscriptionFrequencyEnum('frequency').notNull(),
    nextDelivery: timestamp('next_delivery').notNull(),
    lastDelivery: timestamp('last_delivery'),
    status: subscriptionStatusEnum('status').default('ACTIVE').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('subscriptions_user_id_idx').on(t.userId),
    index('subscriptions_status_idx').on(t.status),
  ],
)
