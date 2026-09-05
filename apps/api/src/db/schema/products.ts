import { pgTable, uuid, varchar, text, decimal, integer, jsonb, timestamp, index } from 'drizzle-orm/pg-core'
import { productStatusEnum } from './enums'

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    description: text('description'),
    image: varchar('image', { length: 500 }),
    parentId: uuid('parent_id'),
    sortOrder: integer('sort_order').default(0).notNull(),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('categories_parent_id_idx').on(t.parentId)],
)

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    description: text('description'),
    price: decimal('price', { precision: 10, scale: 2 }).notNull(),
    comparePrice: decimal('compare_price', { precision: 10, scale: 2 }),
    stock: integer('stock').default(0).notNull(),
    sku: varchar('sku', { length: 100 }).unique(),
    weight: decimal('weight', { precision: 8, scale: 2 }),
    categoryId: uuid('category_id'),
    notes: jsonb('notes'),
    occasions: text('occasions').array(),
    status: productStatusEnum('status').default('ACTIVE').notNull(),
    images: jsonb('images'),
    metaTitle: varchar('meta_title', { length: 255 }),
    metaDesc: text('meta_desc'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    index('products_category_id_idx').on(t.categoryId),
    index('products_status_idx').on(t.status),
    index('products_category_id_status_idx').on(t.categoryId, t.status),
    index('products_status_created_at_idx').on(t.status, t.createdAt),
  ],
)
