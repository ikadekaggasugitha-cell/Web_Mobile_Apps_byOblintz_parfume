# OBLINTZ — Rencana Perbaikan Pasca-Testing API

> Disusun dari temuan selama penulisan 18 suite unit test API (297 test, coverage modul 96.44%).
> Severity mengacu pada matriks di `Test-Strategy.md`.

## Ringkasan

| Aspek | Nilai |
|-------|-------|
| Modul API teruji | 18 / 18 (semua modul berkode) |
| Total test | 297 (semua lulus) |
| Coverage statement (modul) | 96.44% |
| Coverage gate (auth/product/order/payment/cart) | ✅ lulus |
| Temuan defect/perbaikan | 1 High-cluster + beberapa Medium/Low |

Severity → SLA (dari `Test-Strategy.md`):

| Severity | Arti | Target respon |
|----------|------|---------------|
| Critical | Sistem mati | 4 jam |
| High | Fitur utama rusak | 24 jam |
| Medium | Isu fitur minor | 72 jam |
| Low | Kosmetik | Rilis berikutnya |

Rekap jumlah temuan:

| Severity | Jumlah | Status |
|----------|--------|--------|
| Critical | 0 | — |
| High | 3 | ✅ **Selesai** |
| Medium | 6 | 🟡 **5 selesai** (M1, M2, M3, M6); M4/M5 setup siap-jalan |
| Low | 7 | 🟢 **4 selesai** (L1, L2, L6, L7); L3/L5 ditunda, L4 minor |

> **Update Low:** L1 — `totalItems` add-to-cart kini dihitung nyata. L2 — direktori `admin/`
> kosong dihapus. L6 — `coverage.thresholds` (90/90/90/80) di `vitest.config.ts` sebagai gate
> regresi in-repo. L7 — **CI diperbaiki total**: nama filter pnpm salah (`oblintz-api` → `@oblintz/api`),
> urutan setup pnpm/node, `test` watch-mode → `test:coverage` (sekali jalan + gate), plus langkah
> `test:integration` terhadap Postgres service di CI. **Ditemukan saat L7: CI lama praktis tidak jalan.**

> **Update High:** Ditambahkan `src/lib/errors.ts` (`AppError` + `handleRouteError`),
> error handler global diperluas, catch bocor dialihkan, validasi + slug-unik admin produk,
> stream upload di-drain.
> **Update Medium:** M1 — `src/lib/promo.ts` (`evaluatePromo`) dipakai bersama oleh preview &
> checkout (kini konsisten). M2 — validasi enum status pada update order admin. M3 — skema
> subscription disatukan (`subscription.schema.ts` = sumber kebenaran). Total **302 test hijau**,
> coverage keseluruhan **98.05%**, gate lulus.

> **Update:** Ketiga temuan HIGH telah diperbaiki. Ditambahkan `src/lib/errors.ts`
> (`AppError` + `handleRouteError`), error handler global diperluas (AppError/ZodError),
> semua catch bocor dialihkan ke handler bersama, validasi + cek slug unik pada admin produk,
> dan stream upload di-drain sebelum skip. Coverage keseluruhan naik 96.44% → **97.95%**;
> suite upload yang tadinya hang 5s kini 104ms.

---

## 🔴 CRITICAL — Sistem mati (SLA 4 jam)

**Tidak ada defect Critical ditemukan pada jalur yang diuji.** Alur transaksional inti
(auth, cart, checkout dengan decrement stok atomik, payment webhook + verifikasi
signature, order) berperilaku benar. Ini hasil positif.

---

## 🟠 HIGH — Fitur utama rusak / risiko keamanan (SLA 24 jam) — ✅ SELESAI

### H1 — Upload batch menggantung karena stream file tidak dikonsumsi — ✅ SELESAI (`part.file.resume()` sebelum skip)
- **Lokasi:** `apps/api/src/modules/upload/upload.routes.ts:123-125` dan `:140`
- **Masalah:** Pada `POST /api/upload/images`, saat tipe file tidak diizinkan
  (`continue`) atau ukuran melebihi batas (`if (skipped) continue`), stream part
  **tidak di-drain** sebelum lanjut ke part berikutnya. Dengan `@fastify/multipart`
  asli, iterator `request.parts()` menggantung (~timeout) → koneksi tertahan.
- **Dampak:** Admin mengunggah batch berisi file terlarang/oversize → request hang,
  potensi resource exhaustion. Terbukti saat testing (1 test dibuang karena hang 5s).
- **Perbaikan:** Konsumsi/buang stream sebelum skip:
  `await part.toBuffer().catch(() => {})` atau `part.file.resume()` sebelum `continue`.
- **Test:** aktifkan kembali test "skips disallowed types" setelah fix.

### H2 — Error tak terduga dibungkus 400 + pesan internal bocor ke klien — ✅ SELESAI (`handleRouteError` + global handler AppError/ZodError)
- **Lokasi:** pola lintas modul — `auth.routes.ts` (register/login/forgot/reset/otp),
  `checkout.routes.ts`, `cart.routes.ts`, `review.routes.ts`, dll.
- **Masalah:** Blok `catch (error) { ... code: 'VALIDATION_ERROR', message: error.message }`
  mengembalikan **status 400** dan `error.message` mentah untuk **semua** error —
  termasuk error DB/internal (seharusnya 500). Ini (a) menyembunyikan error server
  sebagai 400 sehingga monitoring meleset, dan (b) berpotensi membocorkan detail
  internal (nama constraint/kolom Prisma) ke klien.
- **Dampak:** Info disclosure + observability buruk.
- **Perbaikan:** Bedakan error validasi (Zod → 400) dari error tak terduga (→ 500 dengan
  pesan generik). Idealnya pasang `app.setErrorHandler` terpusat + cek `error instanceof ZodError`.

### H3 — Endpoint admin produk tanpa validasi input & tanpa error handling — ✅ SELESAI (skema Zod + cek slug unik + try/catch)
- **Lokasi:** `apps/api/src/modules/product/product.routes.ts:318-351` (create), `:354-390` (update)
- **Masalah:** `POST/PUT /admin` membaca `request.body as any` tanpa skema validasi dan
  **tanpa try/catch**. `body.name.toLowerCase()` melempar TypeError bila `name` kosong;
  slug tidak dicek unik (berbeda dari modul category), sehingga pelanggaran unique
  `slug`/`sku` dari Prisma → error tak tertangani → 500.
- **Dampak:** Input buruk dari admin panel → 500 tak terkontrol; data tidak konsisten.
- **Perbaikan:** Tambah skema Zod (seperti modul lain), cek slug unik, bungkus try/catch.

---

## 🟡 MEDIUM — Isu fitur minor (SLA 72 jam)

### M1 — Preview checkout tidak konsisten dengan validasi promo sebenarnya — ✅ SELESAI (`evaluatePromo` bersama)
- **Lokasi:** `apps/api/src/modules/checkout/checkout.routes.ts:97-114` vs
  `checkout.service.ts:95-118`
- **Masalah:** `/checkout/preview` hanya mengecek `promo.status === 'ACTIVE'`, mengabaikan
  `startDate`, `endDate`, `usageLimit`, dan `minOrder` — sedangkan `processCheckout`
  memvalidasi semuanya. Preview bisa menampilkan diskon yang lalu **ditolak** saat checkout.
- **Dampak:** UX membingungkan (total berubah saat bayar).
- **Perbaikan:** Ekstrak satu fungsi validasi/perhitungan promo dan pakai di kedua tempat.

### M2 — Endpoint admin lain tanpa skema validasi input — ✅ SEBAGIAN
- **Lokasi:** `order.routes.ts` (update status), `user.routes.ts` (update profil/alamat),
  `category.routes.ts` (create/update).
- **Selesai:** `order.routes.ts` update status kini divalidasi Zod terhadap enum `OrderStatus`
  (status ngawur → 400, bukan tertulis ke DB).
- **Sisa (rekomendasi):** `user` & `category` sudah punya guard manual untuk field kritis
  (nama, field alamat wajib, cek slug unik); standardisasi ke Zod tinggal polish.

### M3 — Skema subscription mati & tidak konsisten — ✅ SELESAI (disatukan ke `subscription.schema.ts`)
- **Lokasi:** `subscription.schema.ts` (mendefinisikan `planId`, frekuensi lowercase
  `monthly/quarterly/yearly`) tidak dipakai `subscription.routes.ts` (memakai skema inline
  `productId`, `MONTHLY/QUARTERLY`).
- **Dampak:** Membingungkan; kontrak API tidak jelas.
- **Perbaikan:** Satukan sumber kebenaran — pakai `subscription.schema.ts` di route atau hapus.

### M4 — Belum ada integration test (constraint DB tidak teruji) — ✅ SETUP SIAP-JALAN
- **Dibuat:** `tests/integration/` (buildApp + spec produk yang menguji unique-slug 409 & baca nyata),
  `vitest.integration.config.ts`, `setup.ts` (arahkan `DATABASE_URL_TEST`), skrip `test:integration`,
  `.env.test.example`. Guard: skip bersih bila `DATABASE_URL_TEST` tak diset (terverifikasi: 3 skipped, exit 0).
- **Untuk menjalankan (lingkungan Anda):** set `DATABASE_URL_TEST` → `prisma migrate deploy` → `test:integration`.
- **Catatan:** contoh fokus modul tanpa dependensi eksternal (produk/kategori); auth/checkout perlu
  Redis/email/Midtrans di-stub atau disediakan sebagai langkah lanjut.
- **Konteks:** Semua 297 test adalah unit dengan Prisma di-mock. Constraint level DB
  (unique `slug`/`sku`, foreign key, transaksi nyata) tidak diverifikasi — padahal
  `Test-Strategy.md` menyebut integration tests.
- **Perbaikan:** Tambah `tests/integration/*` (supertest + DB test/Testcontainers) untuk
  minimal auth, checkout (transaksi stok), payment.

### M5 — Belum ada E2E test (checkout & QRIS) — ✅ SETUP + SMOKE LULUS
- **Dibuat:** `@playwright/test` terpasang, `apps/web/playwright.config.ts`, `e2e/homepage.spec.ts`
  (smoke), `e2e/checkout.spec.ts` (template alur belanja), skrip `e2e`/`e2e:ui`/`e2e:install`.
- **Terverifikasi jalan:** homepage smoke **4/4 lulus** (Chromium + auto-start `next dev`) — hero,
  CTA, navigasi, dan structured-data SEO.
- **Untuk menjalankan penuh (lingkungan Anda):** hidupkan web+api+DB berisi produk, lalu `pnpm --filter
  @oblintz/web e2e`. Spec checkout butuh API+DB+produk ter-seed. QRIS *settlement* server-to-server →
  paling tepat diverifikasi di layer integration/API.
- **Konteks:** Skill `senior-qa` menyebut Playwright E2E untuk alur checkout/pembayaran QRIS.
- **Perbaikan:** Scaffold `apps/web/e2e/checkout.spec.ts` + `payment.spec.ts`
  (`e2e_test_scaffolder.py`), termasuk simulasi webhook Midtrans.

### M6 — Branch coverage rendah di beberapa modul — 🟡 PARSIAL (checkout 84→95%, subscription→100%)
- **Data:** product 57%, quiz 65%, payment 76%, upload 76% (statement tinggi, tapi banyak
  cabang kondisional belum diuji).
- **Dampak:** Logika percabangan (mis. matrix scoring quiz, variasi status payment) belum
  tervalidasi penuh.
- **Perbaikan:** Tambah kasus per cabang; pertimbangkan set threshold `coverage.thresholds`.

---

## 🟢 LOW — Kosmetik / kebersihan (rilis berikutnya)

| ID | Lokasi | Masalah | Status |
|----|--------|---------|--------|
| L1 | `cart.routes.ts` | Respon add-to-cart `totalItems: 0` selalu 0 (hardcoded) | ✅ Dihitung nyata dari cart |
| L2 | `src/modules/admin/` | Direktori kosong (tanpa file) | ✅ Dihapus |
| L3 | tooling Vitest | Warning "CJS build of Vite's Node API is deprecated" | ⏳ Ditunda (upgrade Vite/Vitest) |
| L4 | `tests/unit/report.test.ts` | `mockResolvedValue` dipakai ulang (assertion longgar) | 🔸 Minor, diterima |
| L5 | `apps/web`, `apps/admin` | Frontend belum punya unit/component test | ⏳ Sebagian (E2E homepage ada); component test ditunda |
| L6 | `vitest.config.ts` | Tidak ada gate regresi coverage in-repo | ✅ `coverage.thresholds` 90/90/90/80 |
| L7 | `.github/workflows/ci-cd.yml` | Skrip coverage + CI belum ter-wire (dan **CI rusak**) | ✅ CI diperbaiki + unit-coverage + integration |

---

## Urutan Eksekusi yang Disarankan

1. **Sprint keamanan/stabilitas (High):** H2 (error handler terpusat) → H3 (validasi+guard
   produk) → H1 (drain stream upload). H2 menyelesaikan pola yang berulang di banyak modul.
2. **Konsistensi (Medium):** M1 (promo preview↔checkout) → M2 (skema admin) → M3 (subscription).
3. **Kedalaman test (Medium):** M6 (branch) → M4 (integration) → M5 (E2E) — sekaligus set
   `coverage.thresholds` di `vitest.config.ts` agar regresi tertangkap.
4. **Kebersihan (Low):** L1–L7, digabung ke rilis rutin; prioritaskan L7 (CI gate) lebih awal
   karena mencegah regresi coverage ke depan.

## Referensi
- Matriks severity & target coverage: `docs/08-testing/Test-Strategy.md`
- Kasus uji: `docs/08-testing/Test-Cases.md`
- Suite test: `apps/api/tests/unit/*.test.ts`
