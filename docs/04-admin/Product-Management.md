# Product Management

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Feature Specification |
| Feature | Product Management |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Manajemen produk untuk admin panel OBLINTZ.

---

## 2. Features

| Feature | Description |
|---------|-------------|
| List Products | Tampilkan semua produk dengan filter |
| Create Product | Tambah produk baru |
| Edit Product | Ubah data produk |
| Delete Product | Hapus produk |
| Bulk Upload | Upload produk via CSV/Excel |
| Multi Image | Upload multiple foto |
| Inventory | Kelola stok produk |

---

## 3. Product Fields

| Field | Type | Required |
|-------|------|----------|
| Name | String | Yes |
| Slug | String | Auto |
| Description | Text | Yes |
| Price | Decimal | Yes |
| Compare Price | Decimal | No |
| Stock | Integer | Yes |
| SKU | String | Yes |
| Category | UUID | Yes |
| Notes | JSON | Yes |
| Occasions | Array | No |
| Status | Enum | Yes |
| Images | Array | Yes |

---

## 4. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /admin/products | List products |
| POST | /admin/products | Create product |
| PUT | /admin/products/:id | Update product |
| DELETE | /admin/products/:id | Delete product |
| POST | /admin/products/bulk | Bulk upload |
| PUT | /admin/products/:id/stock | Update stock |

---

## 5. Bulk Upload Format

```csv
name,description,price,stock,sku,category,notes,top,middle,base
Product Name,Description,500000,100,SKU-001,floral,Rose,Jasmine,Sandalwood
```

---

**Version**: 1.0
**Last Updated**: 28 August 2026
