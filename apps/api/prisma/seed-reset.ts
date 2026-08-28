// @ts-nocheck
// typecheck this file separately as it uses Top-level await
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting cleanup...');

  // Delete all data in reverse order of dependencies
  await prisma.auditLog.deleteMany();
  await prisma.adminUser.deleteMany();
  await prisma.giftWrapping.deleteMany();
  await prisma.quizResult.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.collectionItem.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.review.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.promoCode.deleteMany();
  await prisma.address.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  console.log('Cleanup completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
