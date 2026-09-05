import { pgTable, uuid, varchar, text, boolean, integer, timestamp, index } from 'drizzle-orm/pg-core'

export const banners = pgTable(
  'banners',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    subtitle: varchar('subtitle', { length: 500 }),
    imageUrl: varchar('image_url', { length: 500 }).notNull(),
    link: varchar('link', { length: 500 }),
    position: varchar('position', { length: 50 }).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    startDate: timestamp('start_date'),
    endDate: timestamp('end_date'),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('banners_is_active_sort_order_idx').on(t.isActive, t.sortOrder)],
)

export const articles = pgTable(
  'articles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    excerpt: text('excerpt'),
    content: text('content').notNull(),
    imageUrl: varchar('image_url', { length: 500 }),
    author: varchar('author', { length: 255 }).notNull(),
    status: varchar('status', { length: 20 }).default('DRAFT').notNull(),
    metaTitle: varchar('meta_title', { length: 255 }),
    metaDesc: text('meta_desc'),
    publishedAt: timestamp('published_at'),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [index('articles_status_created_at_idx').on(t.status, t.createdAt)],
)

export const faqs = pgTable(
  'faqs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    question: text('question').notNull(),
    answer: text('answer').notNull(),
    category: varchar('category', { length: 100 }),
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [index('faqs_is_active_sort_order_idx').on(t.isActive, t.sortOrder)],
)
