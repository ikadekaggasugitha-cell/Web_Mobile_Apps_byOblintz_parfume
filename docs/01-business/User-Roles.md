# User Roles

## Document Information

| Field | Value |
|-------|-------|
| Document Type | User Roles & Permissions |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. User Roles Overview

### 1.1 Customer Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| Guest | Belum login/registered | Read-only |
| Registered User | User yang sudah register | Basic |
| Premium User | User dengan status premium | Enhanced |

### 1.2 Admin Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| Super Admin | Akses penuh ke semua fitur | Full |
| Admin | Akses ke produk, order, user | Limited |
| Content Manager | Akses ke konten dan banner | Content |
| Marketing | Akses ke promo dan campaign | Marketing |
| Customer Service | Akses ke order dan user support | Support |
| Finance | Akses ke laporan dan refund | Finance |

---

## 2. Customer Roles & Permissions

### 2.1 Guest

| Permission | Access |
|------------|--------|
| View products | Yes |
| Search products | Yes |
| View product details | Yes |
| Take quiz | Yes |
| View cart | Yes |
| Add to cart | Yes |
| Checkout | Yes (guest checkout) |
| View reviews | Yes |
| Register | Yes |
| Login | Yes |

### 2.2 Registered User

| Permission | Access |
|------------|--------|
| All Guest permissions | Yes |
| Manage profile | Yes |
| Manage addresses | Yes |
| View order history | Yes |
| Track orders | Yes |
| Create wishlist | Yes |
| Create collections | Yes |
| Write reviews | Yes |
| Create subscriptions | Yes |
| Apply gift wrapping | Yes |
| Use promo codes | Yes |

### 2.3 Premium User

| Permission | Access |
|------------|--------|
| All Registered User permissions | Yes |
| Exclusive products | Yes |
| Early access | Yes |
| Free shipping | Yes |
| Priority support | Yes |
| Higher discount | Yes |

---

## 3. Admin Roles & Permissions

### 3.1 Super Admin

| Module | Permissions |
|--------|-------------|
| Dashboard | Full access |
| Products | CRUD + Bulk operations |
| Orders | CRUD + Refund approval |
| Users | CRUD + Role management |
| Reviews | Moderate + Delete |
| Content | Full access |
| Marketing | Full access |
| Reports | Full access |
| Settings | Full access |
| Admin Users | CRUD + Role assignment |

### 3.2 Admin

| Module | Permissions |
|--------|-------------|
| Dashboard | View |
| Products | CRUD |
| Orders | View + Update status |
| Users | View + Edit |
| Reviews | View + Moderate |
| Content | View |
| Marketing | View |
| Reports | View |

### 3.3 Content Manager

| Module | Permissions |
|--------|-------------|
| Dashboard | View |
| Products | View |
| Content | CRUD (Banner, Articles, FAQ) |
| Reviews | View + Moderate |

### 3.4 Marketing

| Module | Permissions |
|--------|-------------|
| Dashboard | View |
| Products | View |
| Orders | View |
| Users | View |
| Marketing | CRUD (Promos, Campaigns) |
| Reports | View |

### 3.5 Customer Service

| Module | Permissions |
|--------|-------------|
| Dashboard | View |
| Orders | View + Update status + Notes |
| Users | View + Support |
| Reviews | View + Reply |

### 3.6 Finance

| Module | Permissions |
|--------|-------------|
| Dashboard | View |
| Orders | View |
| Reports | Full access |
| Refunds | Approve |

---

## 4. Permission Matrix

| Feature | Guest | User | Premium | Super Admin | Admin | Content | Marketing | CS | Finance |
|---------|-------|------|---------|-------------|-------|---------|-----------|-----|---------|
| View Products | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Take Quiz | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Checkout | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | - | - |
| Manage Profile | - | ✓ | ✓ | ✓ | ✓ | - | - | - | - |
| View Orders | - | ✓ | ✓ | ✓ | ✓ | - | ✓ | ✓ | ✓ |
| Write Reviews | - | ✓ | ✓ | ✓ | ✓ | - | - | - | - |
| Manage Products | - | - | - | ✓ | ✓ | - | - | - | - |
| Manage Orders | - | - | - | ✓ | ✓ | - | - | ✓ | - |
| Manage Users | - | - | - | ✓ | ✓ | - | ✓ | - | - |
| Manage Content | - | - | - | ✓ | - | ✓ | - | - | - |
| Manage Marketing | - | - | - | ✓ | - | - | ✓ | - | - |
| View Reports | - | - | - | ✓ | ✓ | - | ✓ | - | ✓ |
| Manage Settings | - | - | - | ✓ | - | - | - | - | - |
| Approve Refunds | - | - | - | ✓ | - | - | - | - | ✓ |

---

## 5. Role Management Rules

| Rule | Description |
|------|-------------|
| Role Assignment | Hanya Super Admin yang dapat assign role |
| Self-Assignment | Admin tidak dapat assign role ke diri sendiri |
| Role Hierarchy | Super Admin > Admin > Other roles |
| Role Removal | Hanya Super Admin yang dapat remove role |
| Audit | Semua perubahan role tercatat di audit log |

---

**Version**: 1.0
**Last Updated**: 28 August 2026
