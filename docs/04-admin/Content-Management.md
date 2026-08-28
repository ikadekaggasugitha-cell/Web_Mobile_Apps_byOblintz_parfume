# Content Management

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Feature Specification |
| Feature | Content Management |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Manajemen konten untuk admin panel OBLINTZ.

---

## 2. Features

### 2.1 Banner Management

| Feature | Description |
|---------|-------------|
| List Banners | Tampilkan semua banner |
| Create Banner | Tambah banner baru |
| Edit Banner | Ubah banner |
| Delete Banner | Hapus banner |
| Schedule | Atur jadwal tampil |

### 2.2 Article Management

| Feature | Description |
|---------|-------------|
| List Articles | Tampilkan semua artikel |
| Create Article | Tulis artikel baru |
| Edit Article | Ubah artikel |
| Delete Article | Hapus artikel |
| Publish/Draft | Atur status publikasi |

### 2.3 FAQ Management

| Feature | Description |
|---------|-------------|
| List FAQ | Tampilkan semua FAQ |
| Create FAQ | Tambah FAQ baru |
| Edit FAQ | Ubah FAQ |
| Delete FAQ | Hapus FAQ |

---

## 3. API Endpoints

### Banners

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /admin/banners | List banners |
| POST | /admin/banners | Create banner |
| PUT | /admin/banners/:id | Update banner |
| DELETE | /admin/banners/:id | Delete banner |

### Articles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /admin/articles | List articles |
| POST | /admin/articles | Create article |
| PUT | /admin/articles/:id | Update article |
| DELETE | /admin/articles/:id | Delete article |

### FAQ

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /admin/faq | List FAQ |
| POST | /admin/faq | Create FAQ |
| PUT | /admin/faq/:id | Update FAQ |
| DELETE | /admin/faq/:id | Delete FAQ |

---

**Version**: 1.0
**Last Updated**: 28 August 2026
