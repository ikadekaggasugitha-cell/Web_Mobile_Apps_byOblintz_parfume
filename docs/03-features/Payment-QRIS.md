# Payment - QRIS

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Feature Specification |
| Feature | QRIS Payment |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Integrasi pembayaran QRIS (Quick Response Code Indonesian Standard) menggunakan Midtrans.

---

## 2. Features

### 2.1 QRIS Generation

| Feature | Description |
|---------|-------------|
| Dynamic QR | QR code unik per transaksi |
| Amount | Jumlah yang harus dibayar |
| Expiry | 5 menit |
| Auto-refresh | Generate ulang jika expired |

### 2.2 Payment Processing

| Feature | Description |
|---------|-------------|
| Webhook | Callback dari Midtrans |
| Real-time Status | Update status secara real-time |
| Polling Fallback | Jika webhook gagal |

---

## 3. Payment Flow

```
User Checkout
     │
     ▼
Select Payment Method
     │
     ▼
Select QRIS
     │
     ▼
Generate QR Code
     │
     ▼
Display QR + Timer
     │
     ▼
User Scan QR
     │
     │ (E-Wallet / Mobile Banking)
     ▼
Payment Processing
     │
     ├──────► Success
     │           │
     │           ▼
     │       Update Order Status
     │           │
     │           ▼
     │       Order Confirmed
     │
     └──────► Failed
                 │
                 ▼
             Show Error
                 │
                 ▼
             Retry / Cancel
```

---

## 4. API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /payments/qris | Generate QRIS | Yes |
| GET | /payments/:id/status | Check status | Yes |
| POST | /payments/webhook | Midtrans callback | No |
| POST | /payments/:id/resend | Resend QR | Yes |

---

## 5. Configuration

```env
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxx
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxx
MIDTRANS_MERCHANT_ID=xxxxx
MIDTRANS_IS_PRODUCTION=true
MIDTRANS_WEBHOOK_URL=https://api.oblintz.com/payments/webhook
```

---

## 6. Error Handling

| Error | Handling |
|-------|----------|
| QRIS Expired | Show "QR expired" + refresh button |
| Payment Failed | Show error + retry option |
| Network Error | Retry mechanism |
| Duplicate Payment | Reject + refund |
| Webhook Delay | Polling fallback |

---

**Version**: 1.0
**Last Updated**: 28 August 2026
