# OBLINTZ Perfume E-Commerce Platform - BLUEPRINT

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Complete Blueprint |
| Project Name | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |
| Status | Final |
| Author | Documentation Architect |

---

## Executive Summary

OBLINTZ adalah platform e-commerce parfum premium yang mengintegrasikan brand showcase dengan pengalaman belanja online yang intuitif. Platform ini dirancang untuk memberikan pengalaman personalisasi tinggi melalui fitur quiz parfum, subscription, dan gift wrapping, dengan UI/UX yang lebih sederhana dibandingkan kompetitor.

---

## Business Context

### Business Problem

- Pasar parfum premium membutuhkan platform yang membantu konsumen menemukan parfum sesuai preferensi
- Kompetitor existing memiliki UI/UX yang kompleks dan membingungkan
- Kurangnya fitur personalisasi seperti quiz parfum dan subscription

### Business Objectives

1. Membangun platform e-commerce parfum premium dengan UI/UX superior
2. Meningkatkan customer engagement melalui fitur personalisasi
3. Membangun loyalitas pelanggan melalui subscription model
4. Menjadi referensi utama parfum premium di Indonesia

### Target Audience

- **Premium Buyers**: Budget > Rp 500rb, mencari parfum premium
- **Mid-range Buyers**: Budget Rp 200-500rb, mencari value
- **Gift Buyers**: Mencari hadiah parfum
- **Subscribers**: Ingin parfum delivered secara berkala

### Brand

- **Brand Name**: OBLINTZ

---

## Scope

### In Scope

| Module | Description |
|--------|-------------|
| Product Catalog | Katalog parfum dengan filtering, search, detail produk |
| Quiz/Wizard | Pencarian parfum berdasarkan preferensi |
| User Authentication | Registration, login, profile management |
| Shopping Cart | Keranjang belanja real-time |
| Checkout | Multi-step checkout |
| Payment (QRIS) | Integrasi Midtrans QRIS |
| Order Management | Tracking status pesanan |
| Review & Rating | Ulasan dan penilaian produk |
| Wishlist | Daftar keinginan personal |
| Collection | Koleksi parfum personal |
| Subscription | Recurring order |
| Gift Wrapping | Gift wrapping dan personalisasi |
| CMS Admin | Backend management |
| Mobile App | Aplikasi iOS dan Android |

### Out of Scope

- Marketplace third-party seller
- Auction/lelang parfum
- AR/VR virtual try-on (fase lanjutan)
- Multi-language support (fase lanjutan)
- Multi-currency support (fase lanjutan)

---

## Tech Stack Final

### Frontend

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js | 14.x |
| UI Library | React | 18.x |
| Styling | Tailwind CSS | 3.x |
| UI Components | Shadcn/UI | Latest |
| State Management | Zustand | 4.x |
| Form Handling | React Hook Form | 7.x |
| Validation | Zod | 3.x |
| HTTP Client | Axios | 1.x |

### Backend

| Layer | Technology | Version |
|-------|------------|---------|
| Runtime | Node.js | 20 LTS |
| Framework | Fastify | 4.x |
| ORM | Prisma | 5.x |
| Validation | Zod | 3.x |
| Authentication | JWT | - |
| Password Hashing | bcrypt | - |

### Database & Cache

| Technology | Version | Purpose |
|------------|---------|---------|
| PostgreSQL | 15.x | Primary database |
| Redis | 7.x | Cache, session, real-time |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| Ubuntu 22.04 LTS | Operating system |
| Nginx | Reverse proxy, SSL, static files |
| PM2 | Process manager, clustering |
| Let's Encrypt | SSL certificate |

### External Services

| Service | Provider | Purpose |
|---------|----------|---------|
| Payment | Midtrans | QRIS payment |
| Email | SendGrid | Transactional email |
| Storage | Local VPS | File storage |

### Development Tools

| Tool | Purpose |
|------|---------|
| Git | Version control |
| GitHub Actions | CI/CD |
| TypeScript | Type safety |
| ESLint | Linting |
| Prettier | Code formatting |

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET                                │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NGINX REVERSE PROXY                        │
│                   (Port 80/443 → SSL Termination)               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  - SSL/TLS (Let's Encrypt)                              │   │
│  │  - Rate Limiting                                        │   │
│  │  - Gzip Compression                                     │   │
│  │  - Static File Serving                                  │   │
│  │  - Security Headers                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────┬─────────────────────────────────────┬───────────────┘
            │                                     │
            ▼                                     ▼
┌───────────────────────────┐     ┌───────────────────────────────┐
│      FRONTEND (Web)       │     │        CMS ADMIN              │
│      Next.js (Port 3000)  │     │      Next.js (Port 3001)      │
│  ┌─────────────────────┐  │     │  ┌─────────────────────┐      │
│  │  - SSR/SSG Pages    │  │     │  │  - Dashboard        │      │
│  │  - React Components │  │     │  │  - CRUD Operations  │      │
│  │  - Client-side State│  │     │  │  - Data Tables      │      │
│  │  - API Calls        │  │     │  │  - Charts/Reports   │      │
│  └─────────────────────┘  │     │  └─────────────────────┘      │
└─────────────┬─────────────┘     └───────────────┬───────────────┘
              │                                   │
              │           ┌───────────────┐       │
              └──────────►│   API LAYER   │◄──────┘
                          │ (Port 5000)   │
                          │  Fastify.js   │
                          └───────┬───────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ▼                   ▼                   ▼
┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
│    PostgreSQL     │  │       Redis       │  │   Local Storage   │
│   (Port 5432)     │  │   (Port 6379)     │  │   (/uploads)      │
│                   │  │                   │  │                   │
│  - User Data      │  │  - Session        │  │  - Product Images │
│  - Products       │  │  - Cart           │  │  - User Avatars   │
│  - Orders         │  │  - Cache          │  │  - Banners        │
│  - Reviews        │  │  - Rate Limiting  │  │                   │
│  - Subscriptions  │  │  - Pub/Sub        │  │                   │
└───────────────────┘  └───────────────────┘  └───────────────────┘
              │
              │         ┌───────────────────┐
              └────────►│  EXTERNAL SERVICES │
                        │                   │
                        │  - Midtrans       │
                        │  - SendGrid       │
                        └───────────────────┘
```

### Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER REQUEST FLOW                             │
└─────────────────────────────────────────────────────────────────┘

User (Browser/Mobile)
     │
     │ HTTPS Request
     ▼
┌─────────────┐
│   Nginx     │ ← SSL Termination, Rate Limiting
└──────┬──────┘
       │
       ├─────────────────────────┬──────────────────────┐
       │                         │                      │
       ▼                         ▼                      ▼
┌─────────────┐          ┌─────────────┐        ┌─────────────┐
│ Static Files│          │   Web App   │        │   API       │
│ (Images, JS)│          │  (Next.js)  │        │ (Fastify)   │
└─────────────┘          └──────┬──────┘        └──────┬──────┘
                                │                      │
                                │   API Calls          │
                                └──────────┬───────────┘
                                           │
                                           ▼
                                   ┌──────────────┐
                                   │   Database   │
                                   │ (PostgreSQL) │
                                   └──────────────┘
```

---

## Database Schema

### Entity Relationship Diagram (Simplified)

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

### Core Tables

| Table | Description |
|-------|-------------|
| users | Data pengguna |
| products | Data produk parfum |
| categories | Kategori produk |
| orders | Pesanan |
| order_items | Item pesanan |
| transactions | Transaksi pembayaran |
| reviews | Ulasan produk |
| wishlists | Wishlist pengguna |
| collections | Koleksi pengguna |
| subscriptions | Subscription |
| quiz_results | Hasil quiz |
| gift_wrappings | Gift wrapping |
| addresses | Alamat pengguna |
| promo_codes | Kode promo |
| admin_users | Admin CMS |
| audit_logs | Log audit |
| banners | Banner CMS |
| articles | Artikel CMS |

---

## API Design

### API Base URL

```
Production: https://api.oblintz.com/v1
Staging: https://api-staging.oblintz.com/v1
```

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /auth/register | Registrasi | No |
| POST | /auth/login | Login | No |
| POST | /auth/logout | Logout | Yes |
| POST | /auth/refresh | Refresh token | Yes |
| POST | /auth/forgot-password | Request reset | No |
| POST | /auth/reset-password | Reset password | No |
| POST | /auth/otp/send | Kirim OTP | No |
| POST | /auth/otp/verify | Verifikasi OTP | No |

### Products

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /products | List produk | No |
| GET | /products/:slug | Detail produk | No |
| GET | /products/search | Search produk | No |
| GET | /products/:slug/related | Produk terkait | No |
| GET | /categories | List kategori | No |
| GET | /categories/:slug | Produk per kategori | No |

### Quiz

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /quiz/start | Mulai quiz | No |
| POST | /quiz/answer | Submit jawaban | No |
| GET | /quiz/result/:sessionId | Hasil rekomendasi | No |
| POST | /quiz/save | Simpan quiz | Yes |

### Cart & Checkout

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /cart | Lihat keranjang | Yes |
| POST | /cart/items | Tambah item | Yes |
| PUT | /cart/items/:id | Update jumlah | Yes |
| DELETE | /cart/items/:id | Hapus item | Yes |
| POST | /cart/apply-promo | Apply promo | Yes |
| POST | /orders/checkout | Checkout | Yes |

### Payment (QRIS)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /payments/qris | Generate QRIS | Yes |
| GET | /payments/:id/status | Cek status | Yes |
| POST | /payments/webhook | Callback Midtrans | No |
| POST | /payments/:id/resend | Kirim ulang QR | Yes |

### Orders

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /orders | List pesanan | Yes |
| GET | /orders/:id | Detail pesanan | Yes |
| POST | /orders/:id/cancel | Batalkan pesanan | Yes |
| GET | /orders/:id/tracking | Tracking | Yes |

### Subscriptions

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /subscriptions | List subscription | Yes |
| POST | /subscriptions | Buat subscription | Yes |
| PUT | /subscriptions/:id | Update | Yes |
| DELETE | /subscriptions/:id | Batalkan | Yes |
| POST | /subscriptions/:id/pause | Jeda | Yes |
| POST | /subscriptions/:id/resume | Lanjutkan | Yes |

### Reviews

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /products/:slug/reviews | List review | No |
| POST | /products/:slug/reviews | Buat review | Yes |
| PUT | /reviews/:id | Update review | Yes |
| DELETE | /reviews/:id | Hapus review | Yes |

### Wishlist & Collection

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /wishlist | List wishlist | Yes |
| POST | /wishlist | Tambah ke wishlist | Yes |
| DELETE | /wishlist/:productId | Hapus dari wishlist | Yes |
| GET | /collections | List koleksi | Yes |
| POST | /collections | Buat koleksi | Yes |
| PUT | /collections/:id | Update koleksi | Yes |
| DELETE | /collections/:id | Hapus koleksi | Yes |

---

## Feature Details

### Quiz/Wizard

**Purpose**: Membantu pengguna menemukan parfum yang sesuai preferensi.

**Flow**:
1. Mulai quiz
2. Jawab 5-7 pertanyaan (mood, occasion, notes preference, budget)
3. Dapatkan rekomendasi parfum
4. Simpan hasil quiz untuk referensi future

**Questions**:
- Mood: Romantic, Fresh, Elegant, Bold, Mysterious
- Occasion: Daily, Formal, Party, Date Night, Special Event
- Notes: Floral, Citrus, Woody, Oriental, Fresh, Gourmand
- Budget: < 200rb, 200-500rb, 500rb - 1jt, > 1jt

### Subscription

**Purpose**: Recurring order untuk parfum favorit.

**Options**:
- Frequency: Monthly, Quarterly
- Discount: 10% untuk subscriber
- Flexibility: Pause/cancel kapan saja

### Gift Wrapping

**Purpose**: Personalisasi hadiah parfum.

**Features**:
- Multiple wrapping options
- Personalisasi pesan
- Tersedia untuk produk tertentu

---

## Payment Integration (Midtrans QRIS)

### Payment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    QRIS PAYMENT FLOW                             │
└─────────────────────────────────────────────────────────────────┘

User Checkout
     │
     ▼
┌─────────────────┐
│ Select Payment  │
│    Method       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Select QRIS     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generate QRIS   │
│    Code         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Display QR Code │
│ + Timer (5 min) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ User Scan QR    │
│ via E-Wallet/   │
│ Mobile Banking  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Payment Process │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Success│ │ Failed│
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
┌─────────┐ ┌─────────┐
│ Update  │ │ Show    │
│ Order   │ │ Error   │
│ Status  │ │ Message │
└─────────┘ └─────────┘
```

### Configuration

```env
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxx
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxx
MIDTRANS_MERCHANT_ID=xxxxx
MIDTRANS_IS_PRODUCTION=true
MIDTRANS_WEBHOOK_URL=https://api.oblintz.com/payments/webhook
```

---

## CMS Admin Features

### Dashboard

- Overview penjualan (harian, mingguan, bulanan)
- Total orders, revenue, new customers
- Top selling products
- Recent orders dengan status
- Stock alert

### Product Management

- CRUD produk
- Bulk upload (CSV/Excel)
- Multi-image upload
- Product variants
- Category management
- SEO metadata

### Order Management

- Order list dengan filtering
- Order detail view
- Order status update
- Bulk status update
- Print invoice & shipping label
- Refund processing

### User Management

- User list dengan search
- User detail view
- Role management
- Ban/unban user

### Content Management

- Banner management
- Article/blog management
- FAQ management
- Static pages
- Image/media library

### Marketing Tools

- Promo code management
- Discount rules
- Flash sale scheduling
- Campaign management

### Reports & Analytics

- Sales reports
- Revenue reports
- Product performance
- Customer analytics
- Inventory reports

---

## Deployment

### Infrastructure

| Component | Specification |
|-----------|---------------|
| Provider | Hostinger/Rumahweb VPS |
| OS | Ubuntu 22.04 LTS |
| CPU | 4 vCPU |
| RAM | 4 GB |
| Storage | 40 GB SSD |
| Bandwidth | Unmetered |

### Services

| Service | Port | Purpose |
|---------|------|---------|
| Nginx | 80/443 | Reverse proxy, SSL |
| PM2 | - | Process manager |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache |

### SSL

- Provider: Let's Encrypt (free)
- Auto-renewal: Yes

---

## Monitoring

### Stack

| Component | Purpose |
|-----------|---------|
| Prometheus | Metrics collection |
| Grafana | Visualization |
| Uptime Kuma | Uptime monitoring |

### Metrics

**System Metrics**:
- CPU usage
- Memory usage
- Disk usage
- Network traffic

**Application Metrics**:
- Request rate
- Response time (p50, p95, p99)
- Error rate
- Active connections

**Business Metrics**:
- Orders per minute
- Revenue per hour
- Conversion rate
- Active users

### Alerting

- Email alerts
- Telegram bot (optional)
- WhatsApp (optional)

---

## CI/CD

### Pipeline

```
Push to main/develop
     │
     ▼
┌─────────────┐
│    Test     │ ← Lint, Type Check, Unit Tests
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Build    │ ← Build API, Web, Admin
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Deploy    │ ← Deploy ke VPS
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Verify    │ ← Health Check, Smoke Tests
└─────────────┘
```

### Environments

| Environment | Branch | URL |
|-------------|--------|-----|
| Staging | develop | staging.oblintz.com |
| Production | main | oblintz.com |

---

## Cost Estimation

### Monthly Costs

| Item | Cost (Rp) |
|------|-----------|
| VPS | 300,000 |
| Domain | 15,000 |
| Storage | 50,000 |
| **Total Fixed** | **~365,000** |

### Variable Costs

| Item | Cost |
|------|------|
| Midtrans Fee | 0.7% per transaction |
| SendGrid | Free tier (100 emails/day) |

---

## Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1 (MVP) | 4-6 weeks | Core features (Catalog, Cart, Checkout, Payment) |
| Phase 2 | 3-4 weeks | Quiz, Reviews, Wishlist, Collection |
| Phase 3 | 2-3 weeks | Subscription, Gift Wrapping, CMS Full |
| **Total** | **12-13 weeks** | **Full Platform** |

### Phase 1: MVP (Week 1-6)

- [ ] Week 1: Setup VPS, Database, Auth
- [ ] Week 2: Product Catalog, Search, Filter
- [ ] Week 3: Shopping Cart, Checkout
- [ ] Week 4: Midtrans QRIS Integration
- [ ] Week 5: Order Management
- [ ] Week 6: Basic Admin Panel

### Phase 2: Features (Week 7-10)

- [ ] Week 7-8: Quiz/Wizard
- [ ] Week 9: Review & Rating
- [ ] Week 10: Wishlist & Collection

### Phase 3: Advanced (Week 11-13)

- [ ] Week 11-12: Subscription
- [ ] Week 12: Gift Wrapping
- [ ] Week 13: CMS Full Features

---

## Risks

| # | Risk | Impact | Probability | Mitigation |
|---|------|--------|-------------|------------|
| 1 | Payment gateway integration delays | High | Medium | Early integration, backup provider |
| 2 | Performance issues with high traffic | High | Medium | Load testing, auto-scaling |
| 3 | Security breach | Critical | Low | Security audit, penetration testing |
| 4 | Scope creep | Medium | High | Strict requirement management |
| 5 | Mobile app rejection | Medium | Low | Follow guidelines, early submission |
| 6 | Inventory sync issues | High | Medium | Real-time sync, fallback mechanism |
| 7 | VPS downtime | High | Low | Backup server, monitoring |

---

## Recommendations

### Immediate Actions

1. Finalize VPS provider (Hostinger/Rumahweb)
2. Register domain name
3. Create Midtrans merchant account
4. Create SendGrid account
5. Setup GitHub repository

### Phase 1 Focus

1. Core e-commerce functionality
2. QRIS payment integration
3. Basic admin panel
4. Performance optimization

### Future Enhancements

1. AI-powered scent recommendation
2. AR virtual try-on
3. Mobile app (React Native)
4. Multi-language support
5. Marketplace integration

---

## Glossary

| Term | Definition |
|------|------------|
| Notes | Komponen aroma dalam parfum (top, middle, base notes) |
| Sillage | Jejak aroma yang tertinggal setelah parfum diaplikasikan |
| Projection | Seberapa jauh aroma parfum tercium |
| Longevity | Ketahanan aroma parfum pada kulit |
| EDP | Eau de Parfum (konsentrasi 15-20%) |
| EDT | Eau de Toilette (konsentrasi 5-15%) |
| EDC | Eau de Cologne (konsentrasi 2-5%) |
| QRIS | Quick Response Code Indonesian Standard |
| SSR | Server-Side Rendering |
| SSG | Static Site Generation |
| ISR | Incremental Static Regeneration |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 28 Aug 2026 | Documentation Architect | Initial blueprint |

---

## Appendix

### A. Environment Variables

```env
# Application
NODE_ENV=production
APP_NAME=OBLINTZ
APP_URL=https://oblintz.com
API_URL=https://api.oblintz.com
ADMIN_URL=https://admin.oblintz.com

# Database
DATABASE_URL=postgresql://oblintz_user:secure_password@localhost:5432/oblintz

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=your-super-secret-access-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# Midtrans
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxx
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxx
MIDTRANS_IS_PRODUCTION=true

# SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@oblintz.com

# Storage
STORAGE_TYPE=local
UPLOAD_PATH=/var/www/oblintz/uploads
```

### B. Database Commands

```bash
# Connect to database
psql -U oblintz -d oblintz

# Run migrations
npx prisma migrate deploy

# Reset database
npx prisma migrate reset

# Generate Prisma client
npx prisma generate

# Open Prisma Studio
npx prisma studio
```

### C. PM2 Commands

```bash
# Start all apps
pm2 start ecosystem.config.js

# List running apps
pm2 list

# View logs
pm2 logs

# Restart app
pm2 restart oblintz-api

# Stop app
pm2 stop oblintz-api

# Delete app
pm2 delete oblintz-api

# Save current process list
pm2 save

# Restore saved process list
pm2 resurrect
```

---

**Status**: Final - Ready for Development

**Next Steps**:
1. Setup development environment
2. Create GitHub repository
3. Start Phase 1 development
