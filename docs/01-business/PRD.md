# Product Requirement Document (PRD)

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Product Requirement Document |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |
| Status | Approved |

---

## 1. Product Overview

### 1.1 Product Name
OBLINTZ Perfume E-Commerce Platform

### 1.2 Product Description
Platform e-commerce parfum premium dengan fitur personalisasi, subscription, dan UI/UX yang superior.

### 1.3 Product Goals
1. Menjual parfum premium secara online
2. Memberikan pengalaman personalisasi
3. Membangun loyalitas pelanggan

### 1.4 Target Launch
- MVP: 6 minggu
- Full Feature: 13 minggu

---

## 2. Target Users

### 2.1 User Segments

| Segment | Description | Budget |
|---------|-------------|--------|
| Premium Buyers | Mencari parfum premium | > Rp 500rb |
| Mid-range Buyers | Mencari value | Rp 200-500rb |
| Gift Buyers | Mencari hadiah | Variasi |
| Subscribers | Delivery berkala | Variasi |

---

## 3. Functional Requirements

### 3.1 Product Catalog

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001 | Tampilkan produk dengan grid/list view | High |
| FR-002 | Filter: brand, harga, ukuran, notes, occasion | High |
| FR-003 | Search dengan autocomplete | High |
| FR-004 | Detail produk: foto, deskripsi, notes, harga | High |
| FR-005 | Zoom foto produk | Medium |
| FR-006 | Compare produk (maksimal 3) | Medium |
| FR-007 | Rekomendasi berdasarkan history | Low |

### 3.2 Quiz/Wizard

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-010 | Quiz 5-7 langkah | High |
| FR-011 | Input: mood, occasion, notes preference | High |
| FR-012 | Input: budget range | High |
| FR-013 | Output: rekomendasi parfum | High |
| FR-014 | Save quiz history | Medium |
| FR-015 | Share hasil quiz | Low |

### 3.3 User Authentication

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-020 | Email/phone registration + OTP | High |
| FR-021 | Social login (Google, Apple) | Medium |
| FR-022 | Profile management | High |
| FR-023 | Multiple shipping addresses | High |
| FR-024 | Order history | High |
| FR-025 | Wishlist & collection | High |

### 3.4 Cart & Checkout

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-030 | Real-time cart sync | High |
| FR-031 | Multi-step checkout | High |
| FR-032 | Guest checkout | Medium |
| FR-033 | Multiple payment methods | High |
| FR-034 | Promo code | High |
| FR-035 | Gift wrapping | High |

### 3.5 Payment (QRIS)

| ID | Requirement | Priority |
|----|-------------|----------|
| QRIS-001 | Generate dynamic QRIS | High |
| QRIS-002 | QR expires in 5 minutes | High |
| QRIS-003 | Auto-refresh if expired | High |
| QRIS-004 | Webhook callback | High |
| QRIS-005 | Real-time status update | High |

### 3.6 Subscription

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-040 | Opsi bulanan/kuartalan | High |
| FR-041 | Flexible scheduling | High |
| FR-042 | Pause/cancel | High |
| FR-043 | Discount untuk subscriber | Medium |
| FR-044 | Reminder sebelum delivery | Medium |
| FR-045 | Change products | Medium |

### 3.7 Review & Rating

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-050 | Rating 1-5 + text review | High |
| FR-051 | Photo upload | Medium |
| FR-052 | Verified purchase badge | High |
| FR-053 | Helpful vote | Low |
| FR-054 | Review moderation | High |

### 3.8 Wishlist & Collection

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-060 | Tambah ke wishlist | High |
| FR-061 | Buat collection | High |
| FR-062 | Add to collection | High |
| FR-063 | Share collection | Low |

---

## 4. Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-001 | Page load time | < 2 detik |
| NFR-002 | API response time | < 500ms |
| NFR-003 | Concurrent users | 10,000+ |
| NFR-004 | Uptime | 99.9% |
| NFR-005 | Mobile responsive | Yes |
| NFR-006 | Accessibility | WCAG 2.1 AA |
| NFR-007 | Browser support | Chrome, Safari, Firefox, Edge |

---

## 5. Business Rules

| ID | Rule |
|----|------|
| BR-001 | Minimal order Rp 100.000 untuk free shipping |
| BR-002 | Maksimal 10 item per checkout |
| BR-003 | Subscription hanya untuk stok > 50 unit |
| BR-004 | Review hanya untuk verified purchaser |
| BR-005 | Promo code tidak dapat digabung |
| BR-006 | Wishlist maksimal 100 item |
| BR-007 | Collection maksimal 20 koleksi |
| BR-008 | Subscription dapat di-cancel kapan saja |

---

## 6. User Stories

### 6.1 Guest User

| ID | Story |
|----|-------|
| US-001 | Sebagai guest, saya ingin melihat produk tanpa login |
| US-002 | Sebagai guest, saya ingin search produk |
| US-003 | Sebagai guest, saya ingin melihat detail produk |
| US-004 | Sebagai guest, saya ingin melakukan quiz |
| US-005 | Sebagai guest, saya ingin checkout sebagai guest |

### 6.2 Registered User

| ID | Story |
|----|-------|
| US-010 | Sebagai user, saya ingin register dengan email/phone |
| US-011 | Sebagai user, saya ingin login |
| US-012 | Sebagai user, saya ingin menambah item ke cart |
| US-013 | Sebagai user, saya ingin checkout |
| US-014 | Sebagai user, saya ingin membayar dengan QRIS |
| US-015 | Sebagai user, saya ingin melihat order history |
| US-016 | Sebagai user, saya ingin menambah wishlist |
| US-017 | Sebagai user, saya ingin membuat collection |
| US-018 | Sebagai user, saya ingin menulis review |
| US-019 | Sebagai user, saya ingin subscribe produk |
| US-020 | Sebagai user, saya ingin gift wrapping |

### 6.3 Admin

| ID | Story |
|----|-------|
| US-030 | Sebagai admin, saya ingin melihat dashboard |
| US-031 | Sebagai admin, saya ingin mengelola produk |
| US-032 | Sebagai admin, saya ingin mengelola orders |
| US-033 | Sebagai admin, saya ingin mengelola users |
| US-034 | Sebagai admin, saya ingin mereview reviews |
| US-035 | Sebagai admin, saya ingin mengelola konten |

---

## 7. Acceptance Criteria

### 7.1 Product Catalog

- [ ] Produk ditampilkan dalam grid/list view
- [ ] Filter berfungsi dengan benar
- [ ] Search menghasilkan hasil yang relevan
- [ ] Detail produk lengkap

### 7.2 Quiz

- [ ] Quiz dapat diselesaikan
- [ ] Rekomendasi sesuai jawaban
- [ ] Hasil quiz dapat disimpan

### 7.3 Checkout

- [ ] Cart berfungsi dengan benar
- [ ] Checkout berlangsung lancar
- [ ] QRIS payment berhasil
- [ ] Order terbuat setelah pembayaran

---

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| Conversion Rate | > 2% |
| Average Order Value | > Rp 300.000 |
| Customer Retention | > 40% |
| Subscription Rate | > 10% |
| NPS Score | > 50 |

---

**Version**: 1.0
**Last Updated**: 28 August 2026
