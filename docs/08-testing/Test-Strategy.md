# Test Strategy

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Test Strategy |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Strategi testing untuk OBLINTZ.

---

## 2. Testing Levels

| Level | Scope | Tools |
|-------|-------|-------|
| Unit Testing | Individual functions | Jest |
| Integration Testing | API endpoints | Supertest |
| E2E Testing | User flows | Playwright |
| Performance Testing | Load testing | k6 |
| Security Testing | Vulnerabilities | OWASP ZAP |

---

## 3. Test Coverage

| Module | Target Coverage |
|--------|-----------------|
| Auth | 90% |
| Products | 85% |
| Orders | 90% |
| Payments | 95% |
| Cart | 85% |

---

## 4. Test Environment

| Environment | Purpose |
|-------------|---------|
| Development | Local testing |
| Staging | Pre-production testing |
| Production | Live testing (limited) |

---

## 5. Test Types

### 5.1 Functional Testing

- User registration/login
- Product browsing
- Cart operations
- Checkout flow
- Payment processing
- Order tracking

### 5.2 Non-Functional Testing

- Performance testing
- Security testing
- Accessibility testing
- Cross-browser testing
- Mobile responsiveness

---

## 6. Test Execution

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run with coverage
npm run test:coverage
```

---

## 7. Defect Management

| Severity | Description | Response Time |
|----------|-------------|---------------|
| Critical | System down | 4 hours |
| High | Major feature broken | 24 hours |
| Medium | Minor feature issue | 72 hours |
| Low | Cosmetic issue | Next release |

---

**Version**: 1.0
**Last Updated**: 28 August 2026
