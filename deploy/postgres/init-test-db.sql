-- Runs once on first Postgres container init (empty data dir).
-- Creates the dedicated integration-test database used by
-- apps/api/tests/integration/setup.ts (DATABASE_URL_TEST).
CREATE DATABASE oblintz_test OWNER oblintz;
