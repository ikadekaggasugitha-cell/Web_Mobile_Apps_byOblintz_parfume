# Gift Wrapping

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Feature Specification |
| Feature | Gift Wrapping |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Gift Wrapping memungkinkan pelanggan membungkus parfum sebagai hadiah dengan personalisasi.

---

## 2. Features

| Feature | Description |
|---------|-------------|
| Multiple Options | Berbagai pilihan bungkus |
| Personal Message | Pesan hingga 200 karakter |
| Gift Card | Kartu hadiah digital |
| Additional Cost | Biaya tambahan per item |

---

## 3. User Flow

```
Product Page
   │
   │ Add to Cart
   ▼
┌─────────────┐
│    Cart     │
└──────┬──────┘
       │
       │ Select Gift Wrap
       ▼
┌─────────────┐
│  Gift Wrap  │
│  Options    │
│  - Style    │
│  - Message  │
│  - Cost     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Checkout   │
│  (Included) │
└─────────────┘
```

---

## 4. API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /gift-wrapping/options | Get available options | No |
| POST | /cart/items/:id/gift-wrap | Add gift wrap to item | Yes |
| DELETE | /cart/items/:id/gift-wrap | Remove gift wrap | Yes |

---

## 5. Business Rules

| Rule | Description |
|------|-------------|
| Availability | Hanya untuk produk tertentu |
| Message | Maksimal 200 karakter |
| Cost | Biaya tambahan per item |
| Single Wrap | Satu item hanya satu gift wrap |

---

**Version**: 1.0
**Last Updated**: 28 August 2026
