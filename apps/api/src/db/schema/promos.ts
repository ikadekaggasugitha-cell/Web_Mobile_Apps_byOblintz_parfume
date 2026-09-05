import { pgTable, uuid, varchar, decimal, integer, timestamp, index } from 'drizzle-orm/pg-core'
import { promoCodeStatusEnum, promoTypeEnum } from './enums'

export const promoCodes = pgTable(
  'promo_codes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: varchar('code', { length: 50 }).notNull().unique(),
    name: varchar('name', { length: 255 }),
    type: promoTypeEnum('type').notNull(),
    value: decimal('value', { precision: 10, scale: 2 }).notNull(),
    minOrder: decimal('min_order', { precision: 10, scale: 2 }),
    maxDiscount: decimal('max_discount', { precision: 10, scale: 2 }),
    usageLimit: integer('usage_limit'),
    usedCount: integer('used_count').default(0).notNull(),
    startDate: timestamp('start_date'),
    endDate: timestamp('end_date'),
    status: promoCodeStatusEnum('status').default('ACTIVE').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('promo_codes_status_idx').on(t.status),
    index('promo_codes_start_date_end_date_idx').on(t.startDate, t.endDate),
  ],
)
