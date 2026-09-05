import { pgTable, uuid, varchar, text, integer, timestamp, index } from 'drizzle-orm/pg-core'
import { stockMovementTypeEnum } from './enums'

export const stockMovements = pgTable(
  'stock_movements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id').notNull(),
    type: stockMovementTypeEnum('type').notNull(),
    quantity: integer('quantity').notNull(),
    referenceId: uuid('reference_id'),
    referenceType: varchar('reference_type', { length: 50 }),
    note: text('note'),
    adminUserId: uuid('admin_user_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('stock_movements_product_id_idx').on(t.productId),
    index('stock_movements_type_idx').on(t.type),
    index('stock_movements_created_at_idx').on(t.createdAt),
    index('stock_movements_product_id_created_at_idx').on(t.productId, t.createdAt),
  ],
)
