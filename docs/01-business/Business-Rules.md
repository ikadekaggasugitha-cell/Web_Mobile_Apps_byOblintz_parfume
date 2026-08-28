# Business Rules

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Business Rules |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Transaction Rules

### 1.1 Order Rules

| ID | Rule | Description |
|----|------|-------------|
| BR-001 | Minimum Order | Minimal order Rp 100.000 untuk free shipping |
| BR-002 | Maximum Items | Maksimal 10 item per checkout |
| BR-003 | Guest Checkout | Guest dapat checkout tanpa register |
| BR-004 | Order Expiry | Order otomatis dibatalkan jika tidak dibayar dalam 1 jam |

### 1.2 Payment Rules

| ID | Rule | Description |
|----|------|-------------|
| BR-005 | QRIS Expiry | QRIS code berlaku selama 5 menit |
| BR-006 | Promo Code | Promo code tidak dapat digabung |
| BR-007 | Single Payment | Satu order hanya dapat menggunakan satu metode pembayaran |
| BR-008 | Payment Confirmation | Pembayaran dikonfirmasi otomatis via webhook |

---

## 2. Subscription Rules

| ID | Rule | Description |
|----|------|-------------|
| BR-009 | Minimum Stock | Subscription hanya untuk produk dengan stok > 50 unit |
| BR-010 | Discount | Discount 10% untuk subscriber |
| BR-011 | Cancellation | Dapat di-cancel kapan saja tanpa penalty |
| BR-012 | Pause | Dapat di-pause maksimal 3 bulan |
| BR-013 | Reschedule | Jadwal dapat diubah minimal 3 hari sebelum delivery |

---

## 3. Review Rules

| ID | Rule | Description |
|----|------|-------------|
| BR-014 | Verified Purchase | Review hanya dapat ditulis oleh verified purchaser |
| BR-015 | One Review | Satu user hanya dapat menulis satu review per produk |
| BR-016 | Moderation | Review memerlukan moderasi admin sebelum tampil |
| BR-017 | Rating Range | Rating 1-5 bintang |
| BR-018 | Photo Review | Foto review maksimal 5 foto |

---

## 4. User Rules

| ID | Rule | Description |
|----|------|-------------|
| BR-019 | Wishlist Limit | Wishlist maksimal 100 item |
| BR-020 | Collection Limit | Collection maksimal 20 koleksi |
| BR-021 | Collection Items | Collection maksimal 50 item per koleksi |
| BR-022 | Address Limit | Maksimal 10 alamat tersimpan |
| BR-023 | Password | Minimal 8 karakter, harus mengandung huruf dan angka |

---

## 5. Gift Wrapping Rules

| ID | Rule | Description |
|----|------|-------------|
| BR-024 | Availability | Gift wrapping hanya untuk produk tertentu |
| BR-025 | Message Length | Pesan gift wrapping maksimal 200 karakter |
| BR-026 | Single Wrap | Satu item hanya dapat digift wrap sekali |
| BR-027 | Additional Cost | Gift wrapping dikenakan biaya tambahan |

---

## 6. Product Rules

| ID | Rule | Description |
|----|------|-------------|
| BR-028 | Status | Produk dapat berstatus: DRAFT, ACTIVE, ARCHIVED |
| BR-029 | Stock | Stok produk harus >= 0 |
| BR-030 | Price | Harga harus > 0 |
| BR-031 | SKU | SKU harus unik per produk |
| BR-032 | Images | Produk minimal memiliki 1 foto |

---

## 7. Admin Rules

| ID | Rule | Description |
|----|------|-------------|
| BR-033 | Role-Based | Admin memiliki role: SUPER_ADMIN, ADMIN, CONTENT_MANAGER, MARKETING, CS |
| BR-034 | Audit Trail | Semua perubahan admin harus tercatat di audit log |
| BR-035 | Approval | Refund memerlukan approval dari SUPER_ADMIN |
| BR-036 | Bulk Operation | Bulk operation maksimal 100 item |

---

## 8. Notification Rules

| ID | Rule | Description |
|----|------|-------------|
| BR-037 | Order Confirmation | Email konfirmasi dikirim setelah order dibuat |
| BR-038 | Payment Success | Email notifikasi dikirim setelah pembayaran berhasil |
| BR-039 | Shipping Update | Email notifikasi dikirim saat status berubah |
| BR-040 | Subscription Reminder | Email reminder dikirim 3 hari sebelum delivery |

---

**Version**: 1.0
**Last Updated**: 28 August 2026
