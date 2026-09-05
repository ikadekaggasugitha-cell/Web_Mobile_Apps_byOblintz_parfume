import 'dotenv/config';
import { db } from '../src/db';
import { sql } from 'drizzle-orm';

const tables = [
  'audit_logs',
  'quiz_results',
  'subscriptions',
  'collection_items',
  'collections',
  'wishlists',
  'reviews',
  'transactions',
  'order_items',
  'orders',
  'promo_codes',
  'addresses',
  'products',
  'categories',
  'users',
  'faqs',
  'articles',
  'banners',
];

async function main() {
  console.log('Starting cleanup...');

  for (const table of tables) {
    await db.execute(sql.raw(`DELETE FROM "${table}"`));
    console.log(`  Cleared: ${table}`);
  }

  console.log('Cleanup completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
