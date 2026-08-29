# Phase 3 Frontend Remediation Plan

## Overview
Comprehensive improvement across 7 batches: dead code cleanup, accessibility, UX, SEO, performance, error handling, and code quality. Each batch is verified independently with typecheck + build.

---

## Batch 1: Dead Code Cleanup (Zero Risk)

### 1A. Consolidate Duplicate Fetch Functions
Every data-fetching page has TWO identical fetch functions: a `useCallback` (for manual re-fetch after mutations) and a `useEffect` inline `fetchData` (with AbortController). The `useCallback` version doesn't use AbortController. **Consolidate into a single `useCallback` that accepts an optional `AbortSignal`.**

**Files (7):**
| File | useCallback Name | useEffect Lines to Remove |
|------|-----------------|--------------------------|
| `apps/web/src/app/(shop)/products/page.tsx` | `fetchProducts` | 62-92 |
| `apps/web/src/app/(shop)/cart/page.tsx` | `refreshCart` | 70-98 |
| `apps/web/src/app/(shop)/collections/page.tsx` | `refreshCollections` | 63-91 |
| `apps/web/src/app/(shop)/subscriptions/page.tsx` | `refreshSubscriptions` | 70-98 |
| `apps/admin/src/app/(dashboard)/products/page.tsx` | `refreshProducts` | 65-99 |
| `apps/admin/src/app/(dashboard)/orders/page.tsx` | `refreshOrders` | 72-106 |
| `apps/admin/src/app/(dashboard)/subscriptions/page.tsx` | `refreshSubscriptions` | 67-100 |

**Pattern:**
```tsx
// BEFORE: Two functions
const refreshX = useCallback(async () => { /* no AbortController */ }, [deps]);
useEffect(() => {
  const controller = new AbortController();
  const fetchData = async () => { /* same logic + AbortController */ };
  fetchData();
  return () => controller.abort();
}, [deps]);

// AFTER: One function
const refreshX = useCallback(async (signal?: AbortSignal) => {
  // ... fetch logic with optional signal
}, [deps]);
useEffect(() => {
  const controller = new AbortController();
  refreshX(controller.signal);
  return () => controller.abort();
}, [refreshX]);
```

### 1B. Remove Unused Dependencies
6 packages confirmed unused (zero imports in source):

| Package | App | Action |
|---------|-----|--------|
| `zustand` | `apps/web` | Remove from package.json |
| `date-fns` | `apps/web` | Remove from package.json |
| `zustand` | `apps/admin` | Remove from package.json |
| `date-fns` | `apps/admin` | Remove from package.json |
| `@tanstack/react-table` | `apps/admin` | Remove from package.json |
| `recharts` | `apps/admin` | Remove from package.json |

**Verification:** `pnpm install` + typecheck all packages.

---

## Batch 2: Accessibility (Low Risk, Additive)

### 2A. Skip-to-Content Link
**Files:** `apps/web/src/app/layout.tsx`, `apps/admin/src/app/layout.tsx`

Add before `<Header>` / `<AdminSidebar>`:
```tsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[999] ...">
  Skip to content
</a>
```
Add `id="main-content"` to `<main>`.

### 2B. ARIA Labels on Icon-Only Buttons
| File | Element | Fix |
|------|---------|-----|
| `apps/web/src/components/layout/Header.tsx` | Cart link (emoji 🛒) | Add `aria-label="Keranjang"` |
| `apps/web/src/app/(shop)/products/[slug]/page.tsx` | +/- quantity buttons | Add `aria-label="Kurangi jumlah"` / `aria-label="Tambah jumlah"` |
| `apps/web/src/app/(shop)/cart/page.tsx` | +/- quantity buttons | Same |
| `apps/web/src/components/ui/Modal.tsx` | Close button (✕) | Add `aria-label="Tutup"` |

### 2C. Toast aria-live
**Files:** `apps/web/src/components/ui/Toast.tsx`, `apps/admin/src/components/ui/Toast.tsx`

Add `role="status"` and `aria-live="polite"` to toast container. Errors get `role="alert"` and `aria-live="assertive"`.

### 2D. Form Labels in Admin Modals
| File | Inputs Missing Labels |
|------|----------------------|
| `apps/admin/.../banners/page.tsx` | title, subtitle, imageUrl, link, position, isActive |
| `apps/admin/.../articles/page.tsx` | title, content, excerpt, status |

Add `<label>` elements with `htmlFor` matching input `id`.

### 2E. Modal/Dialog ARIA
**Files:** `apps/web/src/components/ui/ConfirmDialog.tsx`, `apps/web/src/components/ui/Modal.tsx`

Add:
- `role="dialog"` or `role="alertdialog"` on ConfirmDialog
- `aria-modal="true"`
- `aria-labelledby` pointing to title id
- Focus trap (auto-focus first interactive element on open)

**Verification:** typecheck all packages.

---

## Batch 3: UX Improvements (Medium Risk)

### 3A. Custom 404 Pages
**Create:** `apps/web/src/app/not-found.tsx`, `apps/admin/src/app/not-found.tsx`

Branded404 with navigation links back to home/dashboard.

### 3B. Mobile Hamburger Menu
**File:** `apps/web/src/components/layout/Header.tsx`

Add a hamburger button visible on `md:hidden`, a slide-out mobile nav drawer with all navigation links. Uses existing Tailwind responsive classes. No new dependencies.

**Verification:** typecheck + web build.

---

## Batch 4: SEO (Low Risk, Additive)

### 4A. Sitemap + Robots
**Create:**
- `apps/web/src/app/sitemap.ts` — dynamic sitemap generating URLs for products, collections, categories
- `apps/web/src/app/robots.ts` — standard robots.txt allowing all crawlers, pointing to sitemap

### 4B. OpenGraph Metadata
**File:** `apps/web/src/app/layout.tsx`

Add `metadataBase`, `openGraph`, `twitter` card metadata.

### 4C. Page-Specific Metadata
**File:** `apps/web/src/app/(shop)/products/[slug]/page.tsx`

Export `generateMetadata()` with product name, description, price, and image for social sharing.

### 4D. Public Directory
**Create:** `apps/web/public/` with `favicon.ico` placeholder and `og-image.png` placeholder.

**Verification:** typecheck + web build.

---

## Batch 5: Performance (Medium Risk)

### 5A. React.memo on List Items
**Files:**
- `apps/web/src/components/product/ProductCard.tsx` — wrap export in `React.memo`
- `apps/web/src/app/(shop)/subscriptions/page.tsx` — wrap `SubscriptionCard` in `React.memo`

### 5B. Image Priority for Hero
**File:** `apps/web/src/app/(shop)/products/[slug]/page.tsx`

Add `priority={true}` to main product image (above-the-fold LCP).

### 5C. Loading Route Segments
**Create:** `apps/web/src/app/(shop)/loading.tsx` — skeleton spinner for shop pages
**Create:** `apps/web/src/app/(auth)/loading.tsx` — skeleton for auth pages
**Create:** `apps/admin/src/app/(dashboard)/loading.tsx` — skeleton for admin pages

**Verification:** typecheck + web build.

---

## Batch 6: Error Handling (Medium Risk)

### 6A. Error State for Failed Fetches
Add `isError` state to all data-fetching pages. Show "Gagal memuat data. Coba lagi." with retry button instead of empty state.

**Files (all pages with data fetching):**
- `apps/web`: products, cart, collections, subscriptions, quiz, products/[slug], checkout
- `apps/admin`: dashboard, products, orders, subscriptions, reports, banners, articles

### 6B. Cart Quantity Debounce
**File:** `apps/web/src/app/(shop)/cart/page.tsx`

Add 300ms debounce to `updateQuantity` to prevent rapid-fire API calls on fast +/- clicks.

**Verification:** typecheck + web build.

---

## Batch 7: Code Quality (Low Risk)

### 7A. Remove `any` Types in Frontend
Replace `any` with proper interfaces:

| File | Line | Current | Fix |
|------|------|---------|-----|
| `apps/web/.../checkout/page.tsx` | 32 | `useState<any>(null)` | `useState<CartData \| null>(null)` |
| `apps/web/.../checkout/page.tsx` | 248 | `(item: any)` | `(item: CartItem)` |
| `apps/web/.../products/[slug]/page.tsx` | 29 | `reviews: any[]` | Define `Review` interface |
| `apps/admin/.../settings/page.tsx` | 27 | `useState<any>(null)` | Define `AdminUser` interface |
| `apps/admin/.../orders/page.tsx` | 45 | `useState<any>(null)` | `useState<Pagination \| null>(null)` |
| `apps/admin/.../subscriptions/page.tsx` | 41 | Same | Same |
| `apps/admin/.../products/page.tsx` | 34 | Same | Same |
| `apps/admin/.../reports/page.tsx` | 16-17 | `recentOrders: any[]`, `topProducts: any[]` | Define interfaces |

### 7B. Remove `as any` Casts
- `apps/web/.../subscriptions/page.tsx` line 312: `<Badge variant={status.color as any}>` — ensure `STATUS_LABELS` color values match Badge variant types properly.

### 7C. Create Shared Types Package
**Create:** `packages/shared/src/types.ts` with common interfaces:
- `Pagination`, `Product`, `Order`, `Subscription`, `CartItem`, `CartData`, `Review`, `AdminUser`

**Update:** `packages/shared/src/index.ts` to export types.

**Verification:** typecheck all packages + web build.
