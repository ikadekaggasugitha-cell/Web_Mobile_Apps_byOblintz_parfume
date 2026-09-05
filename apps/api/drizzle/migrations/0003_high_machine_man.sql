DROP TABLE IF EXISTS "admin_users" CASCADE;--> statement-breakpoint
-- The admin role enum was named `admin_role` under Drizzle and `AdminRole`
-- under the legacy Prisma schema; drop whichever exists so this migration is
-- safe on both fresh Drizzle databases and Prisma-migrated ones.
DROP TYPE IF EXISTS "public"."admin_role";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."AdminRole";
