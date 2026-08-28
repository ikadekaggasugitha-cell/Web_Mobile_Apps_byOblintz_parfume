# User Management

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Feature Specification |
| Feature | User Management |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Manajemen pengguna untuk admin panel OBLINTZ.

---

## 2. Features

| Feature | Description |
|---------|-------------|
| List Users | Tampilkan semua pengguna |
| User Detail | Lihat detail pengguna |
| Edit User | Ubah data pengguna |
| Ban/Unban | Blokir pengguna |
| Role Management | Atur role pengguna |
| Activity Log | Lihat aktivitas pengguna |

---

## 3. User Roles

| Role | Description |
|------|-------------|
| USER | Pengguna biasa |
| PREMIUM_USER | Pengguna premium |
| ADMIN | Administrator |
| SUPER_ADMIN | Super administrator |

---

## 4. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /admin/users | List users |
| GET | /admin/users/:id | User detail |
| PUT | /admin/users/:id | Update user |
| PUT | /admin/users/:id/role | Update role |
| PUT | /admin/users/:id/ban | Ban user |

---

## 5. User Data

| Field | Description |
|-------|-------------|
| ID | User ID |
| Email | Email address |
| Phone | Phone number |
| Name | Full name |
| Role | User role |
| Created At | Registration date |
| Last Login | Last login date |
| Orders Count | Total orders |
| Total Spent | Total spending |

---

**Version**: 1.0
**Last Updated**: 28 August 2026
