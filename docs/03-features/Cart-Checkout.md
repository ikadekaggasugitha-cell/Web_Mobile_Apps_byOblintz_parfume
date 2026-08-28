# Cart & Checkout

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Feature Specification |
| Feature | Cart & Checkout |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Shopping Cart dan Checkout adalah fitur utama untuk proses pembelian.

---

## 2. Features

### 2.1 Shopping Cart

| Feature | Description |
|---------|-------------|
| Add Item | Tambah produk ke cart |
| Update Quantity | Ubah jumlah item |
| Remove Item | Hapus item dari cart |
| Clear Cart | Kosongkan seluruh cart |
| Real-time Sync | Sync antar device |
| Gift Wrapping | Opsi gift wrapping per item |
| Promo Code | Apply kode promo |

### 2.2 Checkout

| Feature | Description |
|---------|-------------|
| Multi-step | 3 langkah: Shipping, Payment, Confirmation |
| Guest Checkout | Checkout tanpa register |
| Multiple Address | Pilih dari alamat tersimpan |
| Payment Method | Pilih metode pembayaran |
| Order Review | Review sebelum submit |

---

## 3. User Flow

```
Product Detail
   │
   │ Add to Cart
   ▼
┌─────────────┐
│    Cart     │
│  - Items    │
│  - Qty      │
│  - Gift Wrap│
│  - Promo    │
│  - Total    │
└──────┬──────┘
       │
       │ Checkout
       ▼
┌─────────────┐
│  Shipping   │
│  - Address  │
│  - Notes    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Payment    │
│  - QRIS     │
│  - Method   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Confirmation│
│  - Review   │
│  - Submit   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Order     │
│  Created    │
└─────────────┘
```

---

## 4. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /cart | Get cart |
| POST | /cart/items | Add item |
| PUT | /cart/items/:id | Update quantity |
| DELETE | /cart/items/:id | Remove item |
| DELETE | /cart | Clear cart |
| POST | /cart/apply-promo | Apply promo code |
| DELETE | /cart/promo | Remove promo |
| POST | /orders/checkout | Create order |

---

## 5. Business Rules

| Rule | Description |
|------|-------------|
| Minimum Order | Rp 100.000 untuk free shipping |
| Maximum Items | 10 item per checkout |
| Promo Code | Tidak dapat digabung |
| Guest Checkout | Bisa tanpa register |

---

**Version**: 1.0
**Last Updated**: 28 August 2026
