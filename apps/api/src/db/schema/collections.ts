import { pgTable, uuid, varchar, text, boolean, integer, timestamp, unique } from 'drizzle-orm/pg-core'

export const collections = pgTable('collections', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  isPublic: boolean('is_public').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const collectionItems = pgTable(
  'collection_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    collectionId: uuid('collection_id').notNull(),
    productId: uuid('product_id').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (t) => [unique('collection_items_collection_id_product_id_unique').on(t.collectionId, t.productId)],
)
