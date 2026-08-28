# Tech Stack

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Technology Stack |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Dokumen ini mendefinisikan teknologi yang digunakan dalam OBLINTZ platform.

---

## 2. Frontend

### 2.1 Customer Web App

| Technology | Version | Purpose | Justification |
|------------|---------|---------|---------------|
| Next.js | 14.x | React framework | SSR/SSG, SEO, Performance |
| React | 18.x | UI library | Component-based, ecosystem |
| Tailwind CSS | 3.x | Styling | Utility-first, rapid development |
| Shadcn/UI | Latest | UI components | High-quality, customizable |
| Zustand | 4.x | State management | Lightweight, simple |
| React Hook Form | 7.x | Form handling | Performance, validation |
| Zod | 3.x | Validation | Type-safe, shared with backend |
| Axios | 1.x | HTTP client | Interceptors, error handling |

### 2.2 CMS Admin Panel

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.x | React framework |
| TanStack Table | Latest | Data tables |
| Recharts | Latest | Charts |

---

## 3. Backend

### 3.1 API Server

| Technology | Version | Purpose | Justification |
|------------|---------|---------|---------------|
| Node.js | 20 LTS | Runtime | Stable, LTS support |
| Fastify | 4.x | Web framework | 2x faster than Express |
| Prisma | 5.x | ORM | Type-safe, migrations |
| Zod | 3.x | Validation | Shared with frontend |
| JWT | - | Authentication | Stateless, scalable |
| bcrypt | - | Password hashing | Industry standard |

### 3.2 Database & Cache

| Technology | Version | Purpose | Justification |
|------------|---------|---------|---------------|
| PostgreSQL | 15.x | Primary database | ACID, JSONB, reliability |
| Redis | 7.x | Cache, session | Performance, data structures |

---

## 4. Infrastructure

| Technology | Purpose | Justification |
|------------|---------|---------------|
| Ubuntu 22.04 LTS | Operating system | Stable, LTS support |
| Nginx | Reverse proxy | Performance, features |
| PM2 | Process manager | Clustering, auto-restart |
| Let's Encrypt | SSL certificate | Free, auto-renewal |

---

## 5. External Services

| Service | Provider | Purpose | Cost |
|---------|----------|---------|------|
| Payment | Midtrans | QRIS payment | 0.7% per transaction |
| Email | SendGrid | Transactional email | Free tier available |
| Storage | Local VPS | File storage | Included |

---

## 6. Development Tools

| Tool | Purpose |
|------|---------|
| Git | Version control |
| GitHub Actions | CI/CD |
| TypeScript | Type safety |
| ESLint | Linting |
| Prettier | Code formatting |

---

## 7. Why These Choices?

| Choice | Reason |
|--------|--------|
| Next.js over CRA | SSR/SSG, better SEO, performance |
| Fastify over Express | 2x faster, better TypeScript |
| Prisma over TypeORM | Better DX, type-safe |
| PostgreSQL over MongoDB | Relational data fits better |
| Redis over Memcached | More features, data structures |
| VPS over Cloud | Cost-effective, full control |

---

## 8. Version Pinning

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "fastify": "^4.25.0",
    "@prisma/client": "^5.8.0",
    "zod": "^3.22.0",
    "axios": "^1.6.0",
    "zustand": "^4.4.0"
  }
}
```

---

**Version**: 1.0
**Last Updated**: 28 August 2026
