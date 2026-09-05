/-- AlterTable
ALTER TABLE "users" ADD COLUMN     "banned" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "faqs" (
    "id" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" VARCHAR(100),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "faqs_is_active_sort_order_idx" ON "faqs"("is_active", "sort_order");
