# Wishlist & Collection

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Feature Specification |
| Feature | Wishlist & Collection |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Wishlist dan Collection memungkinkan pengguna menyimpan dan mengelola parfum favorit.

---

## 2. Features

### 2.1 Wishlist

| Feature | Description |
|---------|-------------|
| Add to Wishlist | Simpan produk favorit |
| Remove from Wishlist | Hapus dari wishlist |
| Move to Collection | Pindahkan ke koleksi |
| Wishlist Limit | Maksimal 100 item |

### 2.2 Collection

| Feature | Description |
|---------|-------------|
| Create Collection | Buat koleksi baru |
| Add to Collection | Tambah produk ke koleksi |
| Remove from Collection | Hapus dari koleksi |
| Share Collection | Bagikan koleksi |
| Public/Private | Atur visibilitas |
| Collection Limit | Maksimal 20 koleksi |
| Items Limit | Maksimal 50 item per koleksi |

---

## 3. User Flow

```
Product Page
   │
   ├──► Add to Wishlist
   │
   └──► Add to Collection
          │
          ├──► Existing Collection
          │
          └──► New Collection
```

---

## 4. API Endpoints

### Wishlist

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /wishlist | List wishlist | Yes |
| POST | /wishlist | Add to wishlist | Yes |
| DELETE | /wishlist/:productId | Remove from wishlist | Yes |

### Collection

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /collections | List collections | Yes |
| POST | /collections | Create collection | Yes |
| PUT | /collections/:id | Update collection | Yes |
| DELETE | /collections/:id | Delete collection | Yes |
| POST | /collections/:id/items | Add item to collection | Yes |
| DELETE | /collections/:id/items/:productId | Remove item | Yes |

---

## 5. Business Rules

| Rule | Description |
|------|-------------|
| Wishlist Limit | Maksimal 100 item |
| Collection Limit | Maksimal 20 koleksi |
| Items Limit | Maksimal 50 item per koleksi |

---

**Version**: 1.0
**Last Updated**: 28 August 2026
