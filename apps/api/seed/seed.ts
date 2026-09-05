import 'dotenv/config';
import { db } from '../src/db';
import { users, categories, products } from '../src/db/schema';
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

  // Create test user
  const userPasswordHash = await bcrypt.hash('user123', 12);
  const existingUser = await db
    .select()
    .from(users)
    .where(sql`${users.email} = 'user@oblintz.com'`)
    .limit(1);

  if (existingUser[0]) {
    console.log('Test user already exists:', existingUser[0].email);
  } else {
    const [user] = await db.insert(users).values({
      email: 'user@oblintz.com',
      passwordHash: userPasswordHash,
      name: 'Test User',
      phone: '081234567890',
    }).returning();
    console.log('Test user created:', user.email);
  }

  // Create categories
  const categoryData = [
    { name: 'Floral', slug: 'floral', description: 'Parfum dengan aroma bunga', sortOrder: 1 },
    { name: 'Woody', slug: 'woody', description: 'Parfum dengan aroma kayu', sortOrder: 2 },
    { name: 'Citrus', slug: 'citrus', description: 'Parfum dengan aroma jeruk', sortOrder: 3 },
    { name: 'Oriental', slug: 'oriental', description: 'Parfum dengan aroma oriental', sortOrder: 4 },
  ];

  const createdCategories = [];
  for (const cat of categoryData) {
    const existing = await db
      .select()
      .from(categories)
      .where(sql`${categories.slug} = ${cat.slug}`)
      .limit(1);

    if (existing[0]) {
      console.log('Category already exists:', cat.name);
      createdCategories.push(existing[0]);
    } else {
      const [created] = await db.insert(categories).values(cat).returning();
      console.log('Category created:', created.name);
      createdCategories.push(created);
    }
  }

  // Create sample products
  const productData = [
    {
      name: 'Midnight Rose',
      slug: 'midnight-rose',
      description: 'Parfum floral elegan dengan sentuhan mawar malam',
      price: 850000,
      comparePrice: 1000000,
      stock: 50,
      sku: 'MR-001',
      weight: '0.15',
      categoryId: createdCategories[0].id,
      notes: {
        top: ['Bergamot', 'Pink Pepper'],
        middle: ['Rose', 'Peony'],
        base: ['Musk', 'Sandalwood'],
      },
      occasions: ['Formal', 'Date Night'],
      status: 'ACTIVE' as const,
      images: [{ url: '/images/products/midnight-rose.jpg', alt: 'Midnight Rose', isPrimary: true }],
    },
    {
      name: 'Sandalwood Essence',
      slug: 'sandalwood-essence',
      description: 'Parfum woody hangat dengan dominasi sandalwood',
      price: 950000,
      stock: 35,
      sku: 'SE-001',
      weight: '0.15',
      categoryId: createdCategories[1].id,
      notes: {
        top: ['Cardamom', 'Bergamot'],
        middle: ['Sandalwood', 'Cedar'],
        base: ['Vetiver', 'Amber'],
      },
      occasions: ['Daily', 'Formal'],
      status: 'ACTIVE' as const,
      images: [{ url: '/images/products/sandalwood-essence.jpg', alt: 'Sandalwood Essence', isPrimary: true }],
    },
    {
      name: 'Citrus Burst',
      slug: 'citrus-burst',
      description: 'Parfum citrus segar untuk aktivitas sehari-hari',
      price: 650000,
      stock: 75,
      sku: 'CB-001',
      weight: '0.12',
      categoryId: createdCategories[2].id,
      notes: {
        top: ['Lemon', 'Orange', 'Grapefruit'],
        middle: ['Ginger', 'Mint'],
        base: ['White Musk'],
      },
      occasions: ['Daily', 'Casual'],
      status: 'ACTIVE' as const,
      images: [{ url: '/images/products/citrus-burst.jpg', alt: 'Citrus Burst', isPrimary: true }],
    },
  ];

  for (const prod of productData) {
    const existing = await db
      .select()
      .from(products)
      .where(sql`${products.slug} = ${prod.slug}`)
      .limit(1);

    if (existing[0]) {
      console.log('Product already exists:', prod.name);
    } else {
      const [created] = await db.insert(products).values(prod).returning();
      console.log('Product created:', created.name);
    }
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
