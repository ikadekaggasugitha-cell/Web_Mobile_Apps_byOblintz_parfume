-- Migration: Add composite indexes for performance
-- Created: 2026-08-29
-- Description: Adds missing composite indexes to improve query performance

-- Products: composite indexes for filtered lists and sorting
CREATE INDEX IF NOT EXISTS idx_products_category_status ON products(category_id, status);
CREATE INDEX IF NOT EXISTS idx_products_status_created ON products(status, created_at DESC);

-- Orders: composite indexes for filtered order lists
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);

-- OrderItems: indexes for joins
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Reviews: composite index for approved reviews per product
CREATE INDEX IF NOT EXISTS idx_reviews_product_status ON reviews(product_id, status);

-- Addresses: index for user address lookups
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);

-- Banners: composite index for active banners by sort order
CREATE INDEX IF NOT EXISTS idx_banners_active_sort ON banners(is_active, sort_order);

-- Articles: composite index for published articles
CREATE INDEX IF NOT EXISTS idx_articles_status_created ON articles(status, created_at DESC);

-- PromoCodes: indexes for status and date range queries
CREATE INDEX IF NOT EXISTS idx_promo_codes_status ON promo_codes(status);
CREATE INDEX IF NOT EXISTS idx_promo_codes_dates ON promo_codes(start_date, end_date);

-- AuditLogs: indexes for admin activity queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_created ON audit_logs(admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module_action ON audit_logs(module, action);
