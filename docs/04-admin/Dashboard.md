# Dashboard

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Feature Specification |
| Feature | Admin Dashboard |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Dashboard admin untuk overview bisnis OBLINTZ.

---

## 2. Metrics

### 2.1 Stats Cards

| Metric | Description |
|--------|-------------|
| Total Sales | Penjualan hari ini |
| Total Orders | Pesanan hari ini |
| New Customers | Pelanggan baru hari ini |
| Revenue | Pendapatan hari ini |

### 2.2 Charts

| Chart | Description |
|-------|-------------|
| Sales Trend | Grafik penjualan 7/30 hari |
| Orders Trend | Grafik pesanan 7/30 hari |
| Top Products | Produk terlaris |
| Revenue by Category | Pendapatan per kategori |

### 2.3 Lists

| List | Description |
|------|-------------|
| Recent Orders | 10 pesanan terbaru |
| Stock Alerts | Produk dengan stok rendah |
| Pending Reviews | Review yang belum di-moderate |

---

## 3. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /admin/dashboard | Get dashboard data |
| GET | /admin/dashboard/stats | Get stats |
| GET | /admin/dashboard/charts | Get chart data |

---

**Version**: 1.0
**Last Updated**: 28 August 2026
