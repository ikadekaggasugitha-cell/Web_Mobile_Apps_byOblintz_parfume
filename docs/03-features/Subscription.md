# Subscription

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Feature Specification |
| Feature | Subscription |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Subscription memungkinkan pelanggan melakukan recurring order untuk parfum favorit.

---

## 2. Features

| Feature | Description |
|---------|-------------|
| Frequency | Monthly, Quarterly |
| Discount | 10% untuk subscriber |
| Pause/Resume | Dapat di-pause kapan saja |
| Cancel | Dapat di-cancel tanpa penalty |
| Change Product | Dapat ganti produk |
| Flexible Schedule | Atur tanggal delivery |

---

## 3. User Flow

```
Product Page
   │
   │ Subscribe Instead
   ▼
┌─────────────┐
│  Choose     │
│  Frequency  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Set        │
│  Schedule   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Confirm    │
│  Subscription│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Active     │
│  Subscription│
└──────┬──────┘
       │
       │ (Recurring)
       ▼
┌─────────────┐
│  Auto       │
│  Order      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Delivery   │
└─────────────┘
```

---

## 4. API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /subscriptions | List subscriptions | Yes |
| POST | /subscriptions | Create subscription | Yes |
| PUT | /subscriptions/:id | Update subscription | Yes |
| DELETE | /subscriptions/:id | Cancel subscription | Yes |
| POST | /subscriptions/:id/pause | Pause subscription | Yes |
| POST | /subscriptions/:id/resume | Resume subscription | Yes |

---

## 5. Business Rules

| Rule | Description |
|------|-------------|
| Minimum Stock | Hanya untuk produk dengan stok > 50 |
| Discount | 10% untuk semua subscriber |
| Cancellation | Tanpa penalty kapan saja |
| Pause | Maksimal 3 bulan |
| Reschedule | Minimal 3 hari sebelum delivery |

---

**Version**: 1.0
**Last Updated**: 28 August 2026
