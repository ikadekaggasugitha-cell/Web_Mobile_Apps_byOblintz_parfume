# Test Cases

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Test Cases |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Authentication Tests

| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| TC-001 | Register with valid email | Registration successful |
| TC-002 | Register with existing email | Error: email exists |
| TC-003 | Login with correct credentials | Login successful |
| TC-004 | Login with wrong password | Error: invalid credentials |
| TC-005 | Reset password | Email sent |

---

## 2. Product Tests

| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| TC-010 | View product list | Products displayed |
| TC-011 | Search product | Results shown |
| TC-012 | Filter by category | Filtered results |
| TC-013 | View product detail | Detail page loaded |
| TC-014 | View related products | Related products shown |

---

## 3. Cart Tests

| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| TC-020 | Add item to cart | Item added |
| TC-021 | Update quantity | Quantity updated |
| TC-022 | Remove item | Item removed |
| TC-023 | Apply promo code | Discount applied |
| TC-024 | Clear cart | Cart emptied |

---

## 4. Checkout Tests

| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| TC-030 | Checkout with saved address | Order created |
| TC-031 | Checkout as guest | Order created |
| TC-032 | Select payment method | Method selected |
| TC-033 | Complete payment | Payment successful |

---

## 5. Payment Tests

| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| TC-040 | Generate QRIS | QR code displayed |
| TC-041 | QRIS payment success | Order confirmed |
| TC-042 | QRIS expired | Error shown |
| TC-043 | Webhook received | Status updated |

---

## 6. Subscription Tests

| ID | Test Case | Expected Result |
|----|-----------|-----------------|
| TC-050 | Create subscription | Subscription active |
| TC-051 | Pause subscription | Subscription paused |
| TC-052 | Resume subscription | Subscription resumed |
| TC-053 | Cancel subscription | Subscription cancelled |

---

**Version**: 1.0
**Last Updated**: 28 August 2026
