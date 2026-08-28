# Marketing Tools

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Feature Specification |
| Feature | Marketing Tools |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Tools marketing untuk admin panel OBLINTZ.

---

## 2. Features

### 2.1 Promo Code Management

| Feature | Description |
|---------|-------------|
| List Promo Codes | Tampilkan semua promo |
| Create Promo | Tambah promo baru |
| Edit Promo | Ubah promo |
| Delete Promo | Hapus promo |
| Usage Stats | Statistik penggunaan |

### 2.2 Discount Rules

| Type | Description |
|------|-------------|
| Percentage | Diskon persentase (10%, 20%) |
| Fixed | Diskon nominal (Rp 50.000) |
| BOGO | Buy One Get One |

---

## 3. Promo Code Fields

| Field | Type | Description |
|-------|------|-------------|
| Code | String | Kode promo (unik) |
| Type | Enum | percentage, fixed, bogo |
| Value | Decimal | Nilai diskon |
| Min Order | Decimal | Minimal order |
| Max Discount | Decimal | Maksimal diskon |
| Usage Limit | Integer | Batas penggunaan |
| Start Date | Date | Tanggal mulai |
| End Date | Date | Tanggal berakhir |
| Status | Enum | active, inactive, expired |

---

## 4. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /admin/promos | List promo codes |
| POST | /admin/promos | Create promo |
| PUT | /admin/promos/:id | Update promo |
| DELETE | /admin/promos/:id | Delete promo |

---

**Version**: 1.0
**Last Updated**: 28 August 2026
