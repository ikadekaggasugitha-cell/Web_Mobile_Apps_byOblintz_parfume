# Order Management

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Feature Specification |
| Feature | Order Management |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Manajemen pesanan untuk admin panel OBLINTZ.

---

## 2. Features

| Feature | Description |
|---------|-------------|
| List Orders | Tampilkan semua pesanan dengan filter |
| Order Detail | Lihat detail pesanan |
| Update Status | Ubah status pesanan |
| Bulk Update | Update status beberapa pesanan |
| Order Notes | Tambah catatan internal |
| Print Invoice | Cetak invoice |
| Print Shipping Label | Cetak label pengiriman |
| Process Refund | Proses refund |

---

## 3. Order Status

| Status | Description |
|--------|-------------|
| PENDING | Menunggu pembayaran |
| PAID | Pembayaran diterima |
| PROCESSING | Sedang diproses |
| SHIPPED | Telah dikirim |
| DELIVERED | Telah diterima |
| COMPLETED | Selesai |
| CANCELLED | Dibatalkan |
| REFUNDED | Direfund |

---

## 4. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /admin/orders | List orders |
| GET | /admin/orders/:id | Order detail |
| PUT | /admin/orders/:id/status | Update status |
| POST | /admin/orders/bulk-update | Bulk update |
| POST | /admin/orders/:id/refund | Process refund |

---

## 5. Filters

| Filter | Options |
|--------|---------|
| Status | All, Pending, Paid, Processing, etc. |
| Date Range | Start - End date |
| Payment Method | QRIS, etc. |
| Search | Order number, customer name |

---

**Version**: 1.0
**Last Updated**: 28 August 2026
