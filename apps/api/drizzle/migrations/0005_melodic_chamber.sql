CREATE TABLE "promo_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"promo_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "promo_redemptions_user_promo_unique" UNIQUE("user_id","promo_id")
);
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_stock_nonneg" CHECK ("products"."stock" >= 0);