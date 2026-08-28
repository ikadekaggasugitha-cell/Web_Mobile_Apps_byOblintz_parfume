# Business Requirement Document (BRD)

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Business Requirement Document |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |
| Status | Approved |

---

## 1. Executive Summary

OBLINTZ adalah platform e-commerce parfum premium yang menyediakan pengalaman belanja online yang intuitif dan personalisasi tinggi. Platform ini bertujuan untuk menjadi referensi utama parfum premium di Indonesia dengan UI/UX yang superior dibandingkan kompetitor.

---

## 2. Business Problem

### 2.1 Current Challenges

1. **Kompleksitas UI/UX**: Kompetitor existing memiliki antarmuka yang rumit dan membingungkan pengguna
2. **Kurangnya Personalisasi**: Tidak ada fitur yang membantu pengguna menemukan parfum sesuai preferensi
3. **Loyalitas Rendah**: Tidak ada mekanisme subscription untuk membangun loyalitas pelanggan
4. **Pengalaman Gift Giving**: Fitur gift wrapping dan personalisasi hadiah sangat terbatas

### 2.2 Market Opportunity

- Pasar parfum Indonesia tumbuh 10-15% per tahun
- Segmen premium memiliki margin lebih tinggi
- Digitalisasi belanja online meningkat pesat
- Generasi muda lebih membeli parfum secara online

---

## 3. Business Objectives

| # | Objective | Success Metric |
|---|-----------|----------------|
| 1 | Membangun platform e-commerce parfum premium | Platform launch dalam 13 minggu |
| 2 | Memberikan UI/UX superior | User satisfaction > 4.5/5 |
| 3 | Meningkatkan customer engagement | Conversion rate > 2% |
| 4 | Membangun loyalitas pelanggan | Customer retention > 40% |
| 5 | Menjadi referensi utama parfum premium | 10,000+ monthly active users dalam 6 bulan |

---

## 4. Target Users

### 4.1 User Segments

| Segment | Description | Needs |
|---------|-------------|-------|
| Premium Buyers | Budget > Rp 500rb | Kualitas, eksklusivitas, pengalaman |
| Mid-range Buyers | Budget Rp 200-500rb | Value for money, variasi pilihan |
| Gift Buyers | Mencari hadiah | Gift wrapping, personalisasi |
| Subscribers | Ingin delivery berkala | Kemudahan, diskon, fleksibilitas |

### 4.2 User Personas

**Persona 1: Rina (28 tahun, Marketing Manager)**
- Budget tinggi untuk parfum
- Ingin rekomendasi personal
- Suka berbagi review

**Persona 2: Budi (35 tahun, Entrepreneur)**
- Membeli parfum untuk hadiah
- Butuh gift wrapping
- Ingin pengalaman premium

**Persona 3: Sari (22 tahun, Mahasiswa)**
- Budget terbatas tapi ingin parfum bagus
- Suka ikut quiz rekomendasi
- Tertarik subscription

---

## 5. Business Rules

### 5.1 Transaction Rules

| Rule | Description |
|------|-------------|
| BR-001 | Minimal order Rp 100.000 untuk free shipping |
| BR-002 | Maksimal 10 item per checkout |
| BR-003 | Promo code tidak dapat digabung |
| BR-004 | Pembayaran harus selesai dalam 5 menit untuk QRIS |

### 5.2 Subscription Rules

| Rule | Description |
|------|-------------|
| BR-005 | Subscription hanya untuk produk dengan stok > 50 unit |
| BR-006 | Discount 10% untuk subscriber |
| BR-007 | Dapat di-cancel kapan saja tanpa penalty |
| BR-008 | Pause maksimal 3 bulan |

### 5.3 Review Rules

| Rule | Description |
|------|-------------|
| BR-009 | Review hanya dapat ditulis oleh verified purchaser |
| BR-010 | Rating 1-5 bintang |
| BR-011 | Review memerlukan moderasi admin |

### 5.4 User Rules

| Rule | Description |
|------|-------------|
| BR-012 | Wishlist maksimal 100 item |
| BR-013 | Collection maksimal 20 koleksi |
| BR-014 | Collection maksimal 50 item per koleksi |

---

## 6. Scope

### 6.1 In Scope

| Module | Features |
|--------|----------|
| Product Catalog | Search, filter, detail, comparison |
| Quiz/Wizard | Pencarian parfum berdasarkan preferensi |
| User System | Registration, profile, addresses |
| Shopping Cart | Real-time cart, promo code |
| Checkout | Multi-step, guest checkout |
| Payment | QRIS (Midtrans) |
| Order Management | Tracking, history |
| Reviews | Rating, text, photo |
| Wishlist | Save favorites |
| Collection | Custom collections |
| Subscription | Recurring orders |
| Gift Wrapping | Personalisasi hadiah |
| CMS Admin | Full management |
| Mobile App | iOS & Android |

### 6.2 Out of Scope

- Marketplace third-party seller
- Auction/lelang parfum
- AR/VR virtual try-on
- Multi-language support
- Multi-currency support
- Offline store integration

---

## 7. Constraints

| Constraint | Description |
|------------|-------------|
| Timeline | MVP harus launch dalam 6 minggu |
| Budget | Development budget terbatas |
| Resources | Tim kecil (2-3 developer) |
| Infrastructure | VPS (bukan cloud) |
| Payment | Hanya QRIS untuk fase awal |

---

## 8. Dependencies

| Dependency | Type | Impact |
|------------|------|--------|
| Midtrans API | External | Payment processing |
| SendGrid API | External | Email delivery |
| VPS Provider | External | Hosting |
| Domain Provider | External | DNS management |

---

## 9. Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Conversion Rate | > 2% | Orders / Visitors |
| Average Order Value | > Rp 300.000 | Total Revenue / Orders |
| Customer Retention | > 40% | Repeat Customers / Total Customers |
| Subscription Rate | > 10% | Subscribers / Total Customers |
| NPS Score | > 50 | Customer Survey |
| Page Load Time | < 2 detik | Performance monitoring |
| Uptime | 99.9% | Monitoring tools |

---

## 10. Assumptions

1. Brand OBLINTZ sudah memiliki produk parfum yang siap dijual
2. Target market Indonesia dengan potensi ekspansi regional
3. Budget tersedia untuk pengembangan web dan mobile app
4. Tim development tersedia (2-3 developer)
5. Payment gateway Midtrans tersedia untuk integrasi
6. VPS provider (Hostinger/Rumahweb) dapat mendukung kebutuhan

---

## 11. Risks

| # | Risk | Impact | Probability | Mitigation |
|---|------|--------|-------------|------------|
| 1 | Payment gateway integration delays | High | Medium | Early integration, backup provider |
| 2 | Performance issues | High | Medium | Load testing, optimization |
| 3 | Security breach | Critical | Low | Security audit, best practices |
| 4 | Scope creep | Medium | High | Strict requirement management |
| 5 | Timeline delays | High | Medium | Agile methodology, MVP focus |

---

## 12. Approvals

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| Business Analyst | | | |
| Technical Lead | | | |

---

**Version**: 1.0
**Last Updated**: 28 August 2026
