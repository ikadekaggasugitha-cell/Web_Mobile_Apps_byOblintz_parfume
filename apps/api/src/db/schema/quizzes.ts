import { pgTable, uuid, varchar, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core'

export const quizResults = pgTable(
  'quiz_results',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id'),
    productId: uuid('product_id'),
    sessionId: varchar('session_id', { length: 100 }).notNull(),
    answers: jsonb('answers').notNull(),
    recommendations: text('recommendations').array(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('quiz_results_user_id_idx').on(t.userId),
    index('quiz_results_product_id_idx').on(t.productId),
    index('quiz_results_session_id_idx').on(t.sessionId),
  ],
)
