# Database Schema

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Database Schema |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Schema database untuk OBLINTZ menggunakan PostgreSQL dengan Prisma ORM.

---

## 2. Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE SCHEMA                          │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    users     │       │   products   │       │  categories  │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (UUID)    │       │ id (UUID)    │       │ id (UUID)    │
│ email        │       │ name         │       │ name         │
│ phone        │       │ slug         │       │ slug         │
│ password_hash│       │ description  │       │ description  │
│ name         │       │ price        │       │ parent_id    │
│ avatar       │       │ compare_price│       │ sort_order   │
│ role         │       │ stock        │       └──────────────┘
│ created_at   │       │ category_id  │
│ updated_at   │       │ notes        │
└──────┬───────┘       │ occasions    │
       │               │ status       │
       │               │ images       │
       │               └──────┬───────┘
       │                      │
       ├──────────────────────┤
       │                      │
       ▼                      ▼
┌──────────────┐       ┌──────────────┐
│   orders     │       │   reviews    │
├──────────────┤       ├──────────────┤
│ id (UUID)    │       │ id (UUID)    │
│ user_id      │       │ user_id      │
│ order_number │       │ product_id   │
│ status       │       │ rating       │
│ total_amount │       │ comment      │
│ created_at   │       │ status       │
└──────┬───────┘       └──────────────┘
       │
       ├───┐
       │   │
       ▼   ▼
┌──────────────┐       ┌──────────────┐
│ order_items  │       │ transactions │
├──────────────┤       ├──────────────┤
│ id (UUID)    │       │ id (UUID)    │
│ order_id     │       │ order_id     │
│ product_id   │       │ amount       │
│ quantity     │       │ status       │
│ price        │       │ method       │
└──────────────┘       │ qr_code      │
                       └──────────────┘
```

---

## 3. Core Tables

### 3.1 Users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    avatar VARCHAR(500),
    role VARCHAR(20) DEFAULT 'USER',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3.2 Products

```sql
CREATE TABLE products (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    slug VARCHAR(255) UNIQUE,
    description TEXT,
    price DECIMAL(10,2),
    compare_price DECIMAL(10,2),
    stock INTEGER DEFAULT 0,
    sku VARCHAR(100) UNIQUE,
    weight DECIMAL(8,2),
    category_id UUID,
    notes JSONB,  -- { top: [], middle: [], base: [] }
    occasions TEXT[],
    status VARCHAR(20) DEFAULT 'ACTIVE',
    images JSONB,
    meta_title VARCHAR(255),
    meta_desc TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3.3 Categories

```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    slug VARCHAR(255) UNIQUE,
    description TEXT,
    image VARCHAR(500),
    parent_id UUID,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 3.4 Orders

```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    user_id UUID,
    order_number VARCHAR(50) UNIQUE,
    status VARCHAR(20) DEFAULT 'PENDING',
    subtotal DECIMAL(10,2),
    shipping_fee DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2),
    shipping_address JSONB,
    notes TEXT,
    gift_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3.5 Order Items

```sql
CREATE TABLE order_items (
    id UUID PRIMARY KEY,
    order_id UUID,
    product_id UUID,
    quantity INTEGER,
    price DECIMAL(10,2),
    gift_wrap BOOLEAN DEFAULT FALSE
);
```

### 3.6 Transactions

```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    order_id UUID,
    payment_id VARCHAR(255),
    amount DECIMAL(10,2),
    fee DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'PENDING',
    method VARCHAR(50),
    qr_code TEXT,
    callback_data JSONB,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 3.7 Reviews

```sql
CREATE TABLE reviews (
    id UUID PRIMARY KEY,
    user_id UUID,
    product_id UUID,
    order_id UUID,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    images JSONB,
    status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 3.8 Wishlists

```sql
CREATE TABLE wishlists (
    id UUID PRIMARY KEY,
    user_id UUID,
    product_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);
```

### 3.9 Collections

```sql
CREATE TABLE collections (
    id UUID PRIMARY KEY,
    user_id UUID,
    name VARCHAR(255),
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE collection_items (
    id UUID PRIMARY KEY,
    collection_id UUID,
    product_id UUID,
    sort_order INTEGER DEFAULT 0,
    UNIQUE(collection_id, product_id)
);
```

### 3.10 Subscriptions

```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY,
    user_id UUID,
    product_id UUID,
    frequency VARCHAR(20),
    next_delivery DATE,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3.11 Quiz Results

```sql
CREATE TABLE quiz_results (
    id UUID PRIMARY KEY,
    user_id UUID,
    session_id VARCHAR(100),
    answers JSONB,
    recommendations UUID[],
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 3.12 Gift Wrappings

```sql
CREATE TABLE gift_wrappings (
    id UUID PRIMARY KEY,
    order_id UUID UNIQUE,
    wrapping_type VARCHAR(50),
    message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 3.13 Addresses

```sql
CREATE TABLE addresses (
    id UUID PRIMARY KEY,
    user_id UUID,
    name VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(10),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 3.14 Promo Codes

```sql
CREATE TABLE promo_codes (
    id UUID PRIMARY KEY,
    code VARCHAR(50) UNIQUE,
    type VARCHAR(20),
    value DECIMAL(10,2),
    min_order DECIMAL(10,2),
    max_discount DECIMAL(10,2),
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 3.15 Admin Users

```sql
CREATE TABLE admin_users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    role VARCHAR(50),
    permissions JSONB,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 3.16 Audit Logs

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    admin_user_id UUID,
    action VARCHAR(100),
    module VARCHAR(100),
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 4. Indexes

```sql
-- Products
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_slug ON products(slug);

-- Orders
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_number ON orders(order_number);

-- Reviews
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);

-- Transactions
CREATE INDEX idx_transactions_order_id ON transactions(order_id);
CREATE INDEX idx_transactions_payment_id ON transactions(payment_id);

-- Subscriptions
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Quiz Results
CREATE INDEX idx_quiz_results_user_id ON quiz_results(user_id);
CREATE INDEX idx_quiz_results_session ON quiz_results(session_id);
```

---

**Version**: 1.0
**Last Updated**: 28 August 2026
