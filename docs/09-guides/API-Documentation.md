# API Documentation

## Document Information

| Field | Value |
|-------|-------|
| Document Type | API Documentation |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

RESTful API documentation untuk OBLINTZ.

---

## 2. Base URL

```
Production: https://api.oblintz.com/v1
Staging: https://api-staging.oblintz.com/v1
```

---

## 3. Authentication

### 3.1 Register

```
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

### 3.2 Login

```
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

---

## 4. Products

### 4.1 List Products

```
GET /products?page=1&limit=12&sort=popular&category=floral
```

### 4.2 Product Detail

```
GET /products/:slug
```

### 4.3 Search

```
GET /products/search?q=parfum
```

---

## 5. Cart

### 5.1 Get Cart

```
GET /cart
Authorization: Bearer <token>
```

### 5.2 Add Item

```
POST /cart/items
Authorization: Bearer <token>

{
  "productId": "uuid",
  "quantity": 1
}
```

---

## 6. Orders

### 6.1 Checkout

```
POST /orders/checkout
Authorization: Bearer <token>

{
  "addressId": "uuid",
  "paymentMethod": "qris",
  "giftWrap": false,
  "promoCode": "DISCOUNT10"
}
```

---

## 7. Payments

### 7.1 Generate QRIS

```
POST /payments/qris
Authorization: Bearer <token>

{
  "orderId": "uuid"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "qrCode": "000201010211...",
    "expiryTime": "2026-08-28T10:05:00Z"
  }
}
```

---

## 8. Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data"
  }
}
```

---

## 9. Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Server Error |

---

**Version**: 1.0
**Last Updated**: 28 August 2026
