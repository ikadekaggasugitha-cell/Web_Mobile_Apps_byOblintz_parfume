import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@oblintz.com' },
    update: {},
    create: {
      email: 'admin@oblintz.com',
      passwordHash: adminPasswordHash,
      name: 'Super Admin',
      role: 'SUPER_ADMIN' as any, // AdminRole enum
      permissions: {
        products: ['create', 'read', 'update', 'delete'],
        orders: ['read', 'update'],
        users: ['read', 'update'],
        settings: ['read', 'update'],
      },
    },
  });
  console.log('Admin user created:', admin.email);

  // Create test user
  const userPasswordHash = await bcrypt.hash('user123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'user@oblintz.com' },
    update: {},
    create: {
      email: 'user@oblintz.com',
      passwordHash: userPasswordHash,
      name: 'Test User',
      phone: '081234567890',
    },
  });
  console.log('Test user created:', user.email);

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'floral' },
      update: {},
      create: {
        name: 'Floral',
        slug: 'floral',
        description: 'Parfum dengan aroma bunga',
        sortOrder: 1,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'woody' },
      update: {},
      create: {
        name: 'Woody',
        slug: 'woody',
        description: 'Parfum dengan aroma kayu',
        sortOrder: 2,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'citrus' },
      update: {},
      create: {
        name: 'Citrus',
        slug: 'citrus',
        description: 'Parfum dengan aroma jeruk',
        sortOrder: 3,
      },
    }),
    prisma.category.upsert({
      where: { slug: 'oriental' },
      update: {},
      create: {
        name: 'Oriental',
        slug: 'oriental',
        description: 'Parfum dengan aroma oriental',
        sortOrder: 4,
      },
    }),
  ]);
  console.log('Categories created:', categories.length);

  // Create sample products
  const products = await Promise.all([
    prisma.product.upsert({
      where: { slug: 'midnight-rose' },
      update: {},
      create: {
        name: 'Midnight Rose',
        slug: 'midnight-rose',
        description: 'Parfum floral elegan dengan sentuhan mawar malam',
        price: 850000,
        comparePrice: 1000000,
        stock: 50,
        sku: 'MR-001',
        weight: 0.15,
        categoryId: categories[0].id,
        notes: {
          top: ['Bergamot', 'Pink Pepper'],
          middle: ['Rose', 'Peony'],
          base: ['Musk', 'Sandalwood'],
        },
        occasions: ['Formal', 'Date Night'],
        status: 'ACTIVE',
        images: [{ url: '/images/products/midnight-rose.jpg', alt: 'Midnight Rose', isPrimary: true }],
      },
    }),
    prisma.product.upsert({
      where: { slug: 'sandalwood-essence' },
      update: {},
      create: {
        name: 'Sandalwood Essence',
        slug: 'sandalwood-essence',
        description: 'Parfum woody hangat dengan dominasi sandalwood',
        price: 950000,
        stock: 35,
        sku: 'SE-001',
        weight: 0.15,
        categoryId: categories[1].id,
        notes: {
          top: ['Cardamom', 'Bergamot'],
          middle: ['Sandalwood', 'Cedar'],
          base: ['Vetiver', 'Amber'],
        },
        occasions: ['Daily', 'Formal'],
        status: 'ACTIVE',
        images: [{ url: '/images/products/sandalwood-essence.jpg', alt: 'Sandalwood Essence', isPrimary: true }],
      },
    }),
    prisma.product.upsert({
      where: { slug: 'citrus-burst' },
      update: {},
      create: {
        name: 'Citrus Burst',
        slug: 'citrus-burst',
        description: 'Parfum citrus segar untuk aktivitas sehari-hari',
        price: 650000,
        stock: 75,
        sku: 'CB-001',
        weight: 0.12,
        categoryId: categories[2].id,
        notes: {
          top: ['Lemon', 'Orange', 'Grapefruit'],
          middle: ['Ginger', 'Mint'],
          base: ['White Musk'],
        },
        occasions: ['Daily', 'Casual'],
        status: 'ACTIVE',
        images: [{ url: '/images/products/citrus-burst.jpg', alt: 'Citrus Burst', isPrimary: true }],
      },
    }),
  ]);
  console.log('Products created:', products.length);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
