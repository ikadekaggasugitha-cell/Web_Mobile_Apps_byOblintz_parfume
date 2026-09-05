CREATE TYPE "public"."stock_movement_type" AS ENUM('ORDER', 'CANCEL', 'RESTOCK', 'ADJUSTMENT', 'RETURN');--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"type" "stock_movement_type" NOT NULL,
	"quantity" integer NOT NULL,
	"reference_id" uuid,
	"reference_type" varchar(50),
	"note" text,
	"admin_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "stock_movements_product_id_idx" ON "stock_movements" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "stock_movements_type_idx" ON "stock_movements" USING btree ("type");--> statement-breakpoint
CREATE INDEX "stock_movements_created_at_idx" ON "stock_movements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "stock_movements_product_id_created_at_idx" ON "stock_movements" USING btree ("product_id","created_at");