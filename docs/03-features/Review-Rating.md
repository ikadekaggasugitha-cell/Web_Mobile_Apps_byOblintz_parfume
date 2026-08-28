# Review & Rating

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Feature Specification |
| Feature | Review & Rating |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Sistem review dan rating untuk produk parfum.

---

## 2. Features

| Feature | Description |
|---------|-------------|
| Rating | 1-5 bintang |
| Text Review | Ulasan tertulis |
| Photo Review | Upload foto (maks 5) |
| Verified Badge | Badge untuk pembeli terverifikasi |
| Helpful Vote | Vote review berguna |
| Moderation | Review perlu moderasi admin |

---

## 3. User Flow

```
Product Detail
   │
   ▼
View Reviews
   │
   ├──► Read Reviews
   │
   ├──► Sort Reviews
   │    - Newest
   │    - Oldest
   │    - Highest
   │    - Lowest
   │
   │ Write Review ( Verified Purchase)
   ▼
┌─────────────┐
│  Review     │
│  Form       │
│  - Rating   │
│  - Comment  │
│  - Photos   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Submitted  │
│  (Pending   │
│   Approval) │
└─────────────┘
```

---

## 4. API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /products/:slug/reviews | List reviews | No |
| POST | /products/:slug/reviews | Create review | Yes |
| PUT | /reviews/:id | Update review | Yes |
| DELETE | /reviews/:id | Delete review | Yes |

---

## 5. Business Rules

| Rule | Description |
|------|-------------|
| Verified Purchase | Hanya pembeli terverifikasi |
| One Review | Satu review per user per produk |
| Moderation | Perlu approval admin |
| Photo Limit | Maksimal 5 foto |

---

**Version**: 1.0
**Last Updated**: 28 August 2026
