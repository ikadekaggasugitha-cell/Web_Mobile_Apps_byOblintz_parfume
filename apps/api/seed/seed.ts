import 'dotenv/config';
import { db } from '../src/db';
import { users } from '../src/db/schema';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function main() {
  console.log('Seeding database...');

  // Create admin user. Admins live in the `users` table with an elevated role —
  // that's what /api/auth/login authenticates against and requireAdmin checks.
  const adminPasswordHash = await bcrypt.hash('admin123', 12);
  const existingAdmin = await db
    .select()
    .from(users)
    .where(sql`${users.email} = 'admin@oblintz.com'`)
    .limit(1);

  if (existingAdmin[0]) {
    console.log('Admin user already exists:', existingAdmin[0].email);
  } else {
    const [admin] = await db.insert(users).values({
      email: 'admin@oblintz.com',
      passwordHash: adminPasswordHash,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
    }).returning();
    console.log('Admin user created:', admin.email);
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
