# Phase 5 Frontend Remediation Plan

## Overview
Extract shared components, adopt shared utilities, and improve mobile UX. Each batch verified independently.

---

## Batch 1: Extract Shared StatusBadge Component (Low Risk)

Admin pages build identical inline status badges with raw className strings (7+ occurrences). Extract to a `StatusBadge` component in admin.

**Create:** `apps/admin/src/components/ui/StatusBadge.tsx`

**Replace inline badges in:**
- `apps/admin/src/app/(dashboard)/page.tsx` — order status
- `apps/admin/src/app/(dashboard)/orders/page.tsx` — order status
- `apps/admin/src/app/(dashboard)/subscriptions/page.tsx` — subscription status
- `apps/admin/src/app/(dashboard)/products/page.tsx` — product status
- `apps/admin/src/app/(dashboard)/content/banners/page.tsx` — active/inactive
- `apps/admin/src/app/(dashboard)/content/articles/page.tsx` — published/draft

---

## Batch 2: Adopt Shared Utilities (Zero Risk)

Both apps duplicate `formatCurrency` and `formatDate` that already exist in `@oblintz/shared`.

**Update local utils to re-export from shared:**
- `apps/web/src/lib/utils.ts` — re-export `formatCurrency`, `formatDate`
- `apps/admin/src/lib/utils.ts` — re-export `formatCurrency`, `formatDate`

---

## Batch 3: Admin Sidebar Responsive (Medium Risk)

Current sidebar is fixed `w-64` with no mobile handling.

**File:** `apps/admin/src/components/layout/AdminSidebar.tsx`

**Fix:**
- Add hamburger toggle button (visible on `lg:hidden`)
- Sidebar slides in/out on mobile
- Overlay backdrop on mobile
- Desktop: always visible

**Verification:** typecheck + web build.
