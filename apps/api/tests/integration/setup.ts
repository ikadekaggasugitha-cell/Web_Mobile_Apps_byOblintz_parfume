// Integration test bootstrap.
// Point the database at the dedicated test database BEFORE any module imports
// the database client (db/index reads DATABASE_URL at instantiation).
if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}
if (process.env.REDIS_URL_TEST) {
  process.env.REDIS_URL = process.env.REDIS_URL_TEST;
}
