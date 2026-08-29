// Integration test bootstrap.
// Point Prisma at the dedicated test database BEFORE any module imports the
// Prisma client (config/database reads DATABASE_URL at instantiation).
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}
if (process.env.REDIS_URL_TEST) {
  process.env.REDIS_URL = process.env.REDIS_URL_TEST;
}
