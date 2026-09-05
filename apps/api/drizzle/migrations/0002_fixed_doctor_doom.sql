ALTER TABLE "articles" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "banners" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "faqs" ADD COLUMN "deleted_at" timestamp;