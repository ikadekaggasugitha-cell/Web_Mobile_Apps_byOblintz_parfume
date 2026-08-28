# API Design

## Document Information

| Field | Value |
|-------|-------|
| Document Type | API Design |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

RESTful API untuk OBLINTZ platform.

---

## 2. Base URL

```
Production: https://api.oblintz.com/v1
Staging: https://api-staging.oblintz.com/v1
```

---

## 3. Authentication

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

---

## 4. Products

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /products | List produk | No |
| GET | /products/:slug | Detail produk | No |
| GET | /products/search | Search produk | No |
| GET | /products/:slug/related | Produk terkait | No |
| GET | /categories | List kategori | No |
| GET | /categories/:slug | Produk per kategori | No |

### 4.1 Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| sort | string | popular, newest, price_asc, price_desc |
| category | string | Category slug |
| min_price | number | Minimum price |
| max_price | number | Maximum price |
| occasion | string | Occasion filter |
| search | string | Search query |

---

## 5. Quiz

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /quiz/start | Mulai quiz | No |
| POST | /quiz/answer | Submit jawaban | No |
| GET | /quiz/result/:sessionId | Hasil rekomendasi | No |
| POST | /quiz/save | Simpan quiz | Yes |

---

## 6. Cart & Checkout

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /cart | Lihat keranjang | Yes |
| POST | /cart/items | Tambah item | Yes |
| PUT | /cart/items/:id | Update jumlah | Yes |
| DELETE | /cart/items/:id | Hapus item | Yes |
| DELETE | /cart | Clear cart | Yes |
| POST | /cart/apply-promo | Apply promo | Yes |
| DELETE | /cart/promo | Hapus promo | Yes |

---

## 7. Payment (QRIS)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /payments/qris | Generate QRIS | Yes |
| GET | /payments/:id/status | Cek status | Yes |
| POST | /payments/webhook | Callback Midtrans | No |
| POST | /payments/:id/resend | Kirim ulang QR | Yes |

---

## 8. Orders

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /orders/checkout | Buat order | Yes |
| GET | /orders | List pesanan | Yes |
| GET | /orders/:id | Detail pesanan | Yes |
| POST | /orders/:id/cancel | Batalkan pesanan | Yes |
| GET | /orders/:id/tracking | Tracking | Yes |

---

## 9. Subscriptions

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /subscriptions | List subscription | Yes |
| POST | /subscriptions | Buat subscription | Yes |
| PUT | /subscriptions/:id | Update | Yes |
| DELETE | /subscriptions/:id | Batalkan | Yes |
| POST | /subscriptions/:id/pause | Jeda | Yes |
| POST | /subscriptions/:id/resume | Lanjutkan | Yes |

---

## 10. Reviews

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /products/:slug/reviews | List review | No |
| POST | /products/:slug/reviews | Buat review | Yes |
| PUT | /reviews/:id | Update review | Yes |
| DELETE | /reviews/:id | Hapus review | Yes |

---

## 11. Wishlist & Collection

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /wishlist | List wishlist | Yes |
| POST | /wishlist | Tambah ke wishlist | Yes |
| DELETE | /wishlist/:productId | Hapus dari wishlist | Yes |
| GET | /collections | List koleksi | Yes |
| POST | /collections | Buat koleksi | Yes |
| PUT | /collections/:id | Update koleksi | Yes |
| DELETE | /collections/:id | Hapus koleksi | Yes |
| POST | /collections/:id/items | Tambah item | Yes |
| DELETE | /collections/:id/items/:productId | Hapus item | Yes |

---

## 12. User Profile

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /users/me | Lihat profil | Yes |
| PUT | /users/me | Update profil | Yes |
| PUT | /users/me/password | Ubah password | Yes |
| GET | /users/me/addresses | List alamat | Yes |
| POST | /users/me/addresses | Tambah alamat | Yes |
| PUT | /users/me/addresses/:id | Update alamat | Yes |
| DELETE | /users/me/addresses/:id | Hapus alamat | Yes |

---

## 13. Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  }
}
```

### 13.1 Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Invalid input |
| UNAUTHORIZED | 401 | Not authenticated |
| FORBIDDEN | 403 | Not authorized |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource conflict |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

---

**Version**: 1.0
**Last Updated**: 28 August 2026
