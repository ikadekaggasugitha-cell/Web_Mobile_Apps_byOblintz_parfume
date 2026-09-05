CREATE TYPE "public"."admin_role" AS ENUM('ADMIN', 'SUPER_ADMIN');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('PENDING', 'WAITING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('ACTIVE', 'INACTIVE', 'DRAFT', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."promo_code_status" AS ENUM('ACTIVE', 'INACTIVE', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."promo_type" AS ENUM('PERCENTAGE', 'FIXED', 'FREE_SHIPPING');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."subscription_frequency" AS ENUM('MONTHLY', 'QUARTERLY');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('USER', 'ADMIN', 'SUPER_ADMIN');--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"excerpt" text,
	"content" text NOT NULL,
	"image_url" varchar(500),
	"author" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'DRAFT' NOT NULL,
	"meta_title" varchar(255),
	"meta_desc" text,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "banners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"subtitle" varchar(500),
	"image_url" varchar(500) NOT NULL,
	"link" varchar(500),
	"position" varchar(50) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"category" varchar(100),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "collection_items_collection_id_product_id_unique" UNIQUE("collection_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"address" varchar NOT NULL,
	"city" varchar(100) NOT NULL,
	"province" varchar(100) NOT NULL,
	"postal_code" varchar(10) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" "admin_role" DEFAULT 'ADMIN' NOT NULL,
	"permissions" jsonb,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid,
	"action" varchar(100) NOT NULL,
	"module" varchar(100) NOT NULL,
	"record_id" uuid,
	"old_data" jsonb,
	"new_data" jsonb,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20),
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"avatar" varchar(500),
	"role" "user_role" DEFAULT 'USER' NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"image" varchar(500),
	"parent_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"compare_price" numeric(10, 2),
	"stock" integer DEFAULT 0 NOT NULL,
	"sku" varchar(100),
	"weight" numeric(8, 2),
	"category_id" uuid,
	"notes" jsonb,
	"occasions" text[],
	"status" "product_status" DEFAULT 'ACTIVE' NOT NULL,
	"images" jsonb,
	"meta_title" varchar(255),
	"meta_desc" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug"),
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "gift_wrappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"wrapping_type" varchar(50) NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gift_wrappings_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"gift_wrap" boolean DEFAULT false NOT NULL,
	"gift_wrap_price" numeric(10, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"order_number" varchar(50) NOT NULL,
	"status" "order_status" DEFAULT 'PENDING' NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"shipping_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"discount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"promo_code_id" uuid,
	"shipping_address" jsonb,
	"notes" text,
	"gift_message" text,
	"estimated_delivery" timestamp,
	"shipped_at" timestamp,
	"delivered_at" timestamp,
	"paid_at" timestamp,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"payment_id" varchar(255),
	"amount" numeric(10, 2) NOT NULL,
	"fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"method" varchar(50),
	"qr_code" text,
	"callback_data" jsonb,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255),
	"type" "promo_type" NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"min_order" numeric(10, 2),
	"max_discount" numeric(10, 2),
	"usage_limit" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"status" "promo_code_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "promo_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"order_id" uuid,
	"rating" integer NOT NULL,
	"comment" text,
	"images" jsonb,
	"status" "review_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wishlists_user_id_product_id_unique" UNIQUE("user_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"frequency" "subscription_frequency" NOT NULL,
	"next_delivery" timestamp NOT NULL,
	"last_delivery" timestamp,
	"status" "subscription_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"product_id" uuid,
	"session_id" varchar(100) NOT NULL,
	"answers" jsonb NOT NULL,
	"recommendations" text[],
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "articles_status_created_at_idx" ON "articles" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "banners_is_active_sort_order_idx" ON "banners" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE INDEX "faqs_is_active_sort_order_idx" ON "faqs" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE INDEX "addresses_user_id_idx" ON "addresses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_admin_user_id_created_at_idx" ON "audit_logs" USING btree ("admin_user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_module_action_idx" ON "audit_logs" USING btree ("module","action");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "categories_parent_id_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "products_category_id_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "products_category_id_status_idx" ON "products" USING btree ("category_id","status");--> statement-breakpoint
CREATE INDEX "products_status_created_at_idx" ON "products" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_product_id_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "orders_user_id_idx" ON "orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_user_id_status_idx" ON "orders" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "orders_user_id_created_at_idx" ON "orders" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_status_created_at_idx" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "transactions_order_id_idx" ON "transactions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "transactions_payment_id_idx" ON "transactions" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "promo_codes_status_idx" ON "promo_codes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "promo_codes_start_date_end_date_idx" ON "promo_codes" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "reviews_product_id_idx" ON "reviews" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "reviews_user_id_idx" ON "reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reviews_product_id_status_idx" ON "reviews" USING btree ("product_id","status");--> statement-breakpoint
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "quiz_results_user_id_idx" ON "quiz_results" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "quiz_results_product_id_idx" ON "quiz_results" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "quiz_results_session_id_idx" ON "quiz_results" USING btree ("session_id");