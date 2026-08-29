# Phase 4 Frontend Remediation Plan

## Overview
4 batches focusing on API reliability, code deduplication, admin consistency, and security. Each batch verified independently with typecheck + build.

---

## Batch 1: API Reliability (Medium Risk)

### 1A. Admin API Token Refresh
The admin API client clears tokens on 401 but never attempts refresh — causing forced logout on any expired token. The web client already has this pattern.

**File:** `apps/admin/src/lib/api.ts`
**Pattern:** Copy web's refresh interceptor logic (web already does this correctly).

### 1B. Web API Request Timeout
Admin has `timeout: 10000` but web client has none — hung requests can block indefinitely.

**File:** `apps/web/src/lib/api.ts`
**Fix:** Add `timeout: 15000` to axios instance config.

### 1C. Unify Export Style
Web uses `export default api`, admin uses `export const api`. Standardize.

**File:** `apps/admin/src/lib/api.ts`
**Fix:** Add `export default api` alongside named export (backward compatible).

**Verification:** typecheck + web build.

---

## Batch 2: Remove Unused Imports (Zero Risk)

Remove confirmed unused imports:

| File | Unused |
|------|--------|
| `apps/admin/.../banners/page.tsx` | `useMemo` |
| `apps/admin/.../articles/page.tsx` | `useMemo` |
| `apps/admin/.../page.tsx` | `ConfirmDialog` |
| `apps/web/src/components/ui/Toast.tsx` | `useEffect` |
| `apps/admin/src/components/ui/ConfirmDialog.tsx` | `useState` |
| `apps/web/src/components/ui/ConfirmDialog.tsx` | `useState` |

**Verification:** typecheck + web build.

---

## Batch 3: Admin Form Consistency (Medium Risk)

### 3A. Migrate Admin Banners to react-hook-form + Zod
Current: manual useState + validateForm() boilerplate (~50 lines).
After: react-hook-form + zodResolver, same as web checkout/register.

**File:** `apps/admin/.../banners/page.tsx`

### 3B. Migrate Admin Articles to react-hook-form + Zod
Same pattern as 3A.

**File:** `apps/admin/.../articles/page.tsx`

### 3C. Admin Login — Use Shared Input Component
Currently uses raw `<input>` with hand-built styling. The `Input` component already provides the same look.

**File:** `apps/admin/.../login/page.tsx`

**Verification:** typecheck + web build.

---

## Batch 4: Sidebar & Navigation (Low Risk)

### 4A. Fix Admin Sidebar Active-Route Matching
`pathname === item.href` only matches exact paths. Products at `/products/abc` won't highlight Products menu.

**File:** `apps/admin/src/components/layout/AdminSidebar.tsx`
**Fix:** Use `pathname.startsWith(item.href)` for parent routes, exact match for children.

### 4B. Remove Dead Sidebar Links
Sidebar links to `/users`, `/reviews`, `/marketing` — none have page files.

**File:** `apps/admin/src/components/layout/AdminSidebar.tsx`
**Fix:** Comment out or remove these items until pages are built.

**Verification:** typecheck + web build.
