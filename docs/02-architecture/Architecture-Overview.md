# Architecture Overview

## Document Information

| Field | Value |
|-------|-------|
| Document Type | System Architecture |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Executive Summary

Arsitektur OBLINTZ dirancang sebagai monolith application yang di-deploy pada VPS dengan pertimbangan performa, skalabilitas, dan maintenance yang mudah. Arsitektur ini menggunakan Next.js untuk frontend dan Fastify untuk backend API.

---

## 2. Architecture Principles

| Principle | Description |
|-----------|-------------|
| Simplicity | Arsitektur sesederhana mungkin tanpa mengorbankan fungsionalitas |
| Performance | Dioptimalkan untuk kecepatan dan responsivitas |
| Scalability | Dapat di-scale horizontal jika diperlukan |
| Security | Keamanan data dan transaksi prioritas utama |
| Maintainability | Kode dan infrastruktur mudah dirawat |

---

## 3. High-Level Architecture

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

---

## 4. Component Architecture

### 4.1 Frontend (Web App)

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        NEXT.JS APP                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │    Pages    │  │  Components │  │    Hooks    │            │
│  │             │  │             │  │             │            │
│  │  - Home     │  │  - Layout   │  │  - useAuth  │            │
│  │  - Products │  │  - Header   │  │  - useCart  │            │
│  │  - Quiz     │  │  - Footer   │  │  - useQuiz  │            │
│  │  - Checkout │  │  - Product  │  │  - useApi   │            │
│  │  - Account  │  │  - Cart     │  │             │            │
│  │             │  │  - Quiz     │  │             │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Stores    │  │    Libs     │  │    Types    │            │
│  │             │  │             │  │             │            │
│  │  - auth     │  │  - api      │  │  - product  │            │
│  │  - cart     │  │  - utils    │  │  - order    │            │
│  │  - quiz     │  │  - validate │  │  - user     │            │
│  │             │  │             │  │             │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Backend (API)

```
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND ARCHITECTURE                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       FASTIFY SERVER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    MIDDLEWARE LAYER                      │   │
│  │  - CORS        - Rate Limiting    - Authentication      │   │
│  │  - Logging     - Validation       - Error Handler       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    ROUTES LAYER                         │   │
│  │  /auth/*    /products/*    /orders/*    /payments/*      │   │
│  │  /quiz/*    /cart/*        /reviews/*   /subscriptions/* │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   SERVICES LAYER                        │   │
│  │  AuthService    ProductService    OrderService          │   │
│  │  QuizService    CartService       PaymentService        │   │
│  │  ReviewService  UserService       EmailService          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    DATA LAYER                           │   │
│  │  Prisma ORM    Redis Client    File Storage             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Data Flow

### 5.1 User Request Flow

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

### 5.2 Payment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    PAYMENT FLOW                                  │
└─────────────────────────────────────────────────────────────────┘

User Checkout
     │
     ▼
┌─────────────────┐
│   Frontend      │
│   (Next.js)     │
└────────┬────────┘
         │
         │ POST /payments/qris
         ▼
┌─────────────────┐
│   API           │
│   (Fastify)     │
└────────┬────────┘
         │
         │ Generate QRIS
         ▼
┌─────────────────┐
│   Midtrans      │
│   API           │
└────────┬────────┘
         │
         │ QR Code
         ▼
┌─────────────────┐
│   User          │
│   Scan QR       │
└────────┬────────┘
         │
         │ Payment
         ▼
┌─────────────────┐
│   E-Wallet/     │
│   Mobile Banking│
└────────┬────────┘
         │
         │ Webhook
         ▼
┌─────────────────┐
│   API           │
│   (Webhook)     │
└────────┬────────┘
         │
         │ Update Order
         ▼
┌─────────────────┐
│   Database      │
│   (PostgreSQL)  │
└─────────────────┘
```

---

## 6. Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT ARCHITECTURE                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    VPS (Hostinger/Rumahweb)                     │
│                    Ubuntu 22.04 LTS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    NGINX                                │   │
│  │                    (Port 80/443)                        │   │
│  │  - SSL Termination                                      │   │
│  │  - Reverse Proxy                                        │   │
│  │  - Static Files                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    PM2                                  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │   API       │  │   Web       │  │   Admin     │    │   │
│  │  │   (2 inst)  │  │   (2 inst)  │  │   (1 inst)  │    │   │
│  │  │   Port 5000 │  │   Port 3000 │  │   Port 3001 │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    SERVICES                             │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │ PostgreSQL  │  │    Redis    │  │   Let's     │    │   │
│  │  │   Port 5432 │  │   Port 6379 │  │   Encrypt   │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Security Architecture

### 7.1 Security Layers

| Layer | Protection |
|-------|------------|
| Network | DDoS protection, IP filtering, Firewall |
| Application | HTTPS, CORS, CSP, XSS prevention |
| Authentication | JWT, bcrypt, MFA (optional) |
| Authorization | Role-based access control (RBAC) |
| Data | Encryption at rest, Secure backup |
| Monitoring | Audit logs, Anomaly detection |

### 7.2 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                           │
└─────────────────────────────────────────────────────────────────┘

User Login
     │
     │ POST /auth/login
     ▼
┌─────────────────┐
│   Validate      │
│   Credentials   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Success│ │Failed │
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
┌─────────┐ ┌─────────┐
│Generate │ │ Return  │
│  JWT    │ │  Error  │
└────┬────┘ └─────────┘
     │
     ▼
┌─────────┐
│  Store  │
│  Token  │
└────┬────┘
     │
     ▼
┌─────────┐
│  User   │
│Dashboard│
└─────────┘
```

---

## 8. Scalability Considerations

### 8.1 Current Architecture (VPS)

| Aspect | Capability |
|--------|------------|
| Concurrent Users | 1,000-5,000 |
| Requests/Second | 100-500 |
| Database Connections | 50-100 |
| Storage | 40 GB |

### 8.2 Scaling Options

| Option | When to Use |
|--------|-------------|
| Vertical Scaling | Increase VPS specs (CPU, RAM) |
| Horizontal Scaling | Add more VPS instances |
| Database Scaling | Add read replicas |
| CDN | Offload static assets |
| Caching | Increase Redis usage |

### 8.3 Migration Path

| Phase | Architecture | Capacity |
|-------|--------------|----------|
| Phase 1 | Single VPS | 1,000 users |
| Phase 2 | VPS + CDN | 5,000 users |
| Phase 3 | Multiple VPS | 10,000+ users |

---

## 9. Technology Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Frontend Framework | Next.js | SSR/SSG, performance, SEO |
| Backend Framework | Fastify | 2x faster than Express |
| Database | PostgreSQL | ACID, JSONB, reliability |
| Cache | Redis | Performance, data structures |
| ORM | Prisma | Type-safe, DX |
| Hosting | VPS | Cost-effective, control |

---

**Version**: 1.0
**Last Updated**: 28 August 2026
