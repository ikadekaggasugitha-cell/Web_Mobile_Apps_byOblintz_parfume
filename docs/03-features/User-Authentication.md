# User Authentication

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Feature Specification |
| Feature | User Authentication |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Sistem autentikasi pengguna untuk OBLINTZ platform.

---

## 2. Features

### 2.1 Registration

| Feature | Description |
|---------|-------------|
| Email Registration | Register dengan email |
| Phone Registration | Register dengan nomor HP |
| OTP Verification | Verifikasi via OTP |
| Social Login | Google, Apple (optional) |

### 2.2 Login

| Feature | Description |
|---------|-------------|
| Email/Phone Login | Login dengan email atau HP |
| Password | Password authentication |
| Remember Me | Persist login |
| Forgot Password | Reset password via email |

### 2.3 Profile Management

| Feature | Description |
|---------|-------------|
| Edit Profile | Ubah nama, avatar |
| Change Password | Ubah password |
| Manage Addresses | Tambah, edit, hapus alamat |
| Order History | Lihat riwayat pesanan |

---

## 3. User Flow

### 3.1 Registration

```
Register Page
   │
   │ Enter Email/Phone
   ▼
┌─────────────┐
│  Verify OTP │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Complete   │
│  Profile    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Account    │
│  Created    │
└─────────────┘
```

### 3.2 Login

```
Login Page
   │
   │ Enter Credentials
   ▼
┌─────────────┐
│  Validate   │
└──────┬──────┘
       │
    ┌──┴──┐
    │     │
    ▼     ▼
 Success  Failed
    │       │
    ▼       ▼
Dashboard  Error
```

---

## 4. API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /auth/register | Register | No |
| POST | /auth/login | Login | No |
| POST | /auth/logout | Logout | Yes |
| POST | /auth/refresh | Refresh token | Yes |
| POST | /auth/forgot-password | Request reset | No |
| POST | /auth/reset-password | Reset password | No |
| POST | /auth/otp/send | Send OTP | No |
| POST | /auth/otp/verify | Verify OTP | No |

---

## 5. Security

| Feature | Implementation |
|---------|----------------|
| Password Hashing | bcrypt |
| JWT Tokens | Access (15min) + Refresh (7d) |
| Rate Limiting | 5 login attempts per minute |
| OTP Expiry | 5 minutes |

---

## 6. Business Rules

| Rule | Description |
|------|-------------|
| Password | Minimal 8 karakter, huruf + angka |
| Email | Harus unik |
| Phone | Harus unik (jika digunakan) |

---

**Version**: 1.0
**Last Updated**: 28 August 2026
