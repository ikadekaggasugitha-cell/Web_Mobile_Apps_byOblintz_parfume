# Pipeline Overview

## Document Information

| Field | Value |
|-------|-------|
| Document Type | CI/CD Pipeline |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Overview CI/CD pipeline untuk OBLINTZ.

---

## 2. Pipeline Stages

### 2.1 Test Stage

| Step | Description |
|------|-------------|
| Checkout | Clone repository |
| Setup Node | Install Node.js 20 |
| Install | npm ci |
| Lint | ESLint check |
| Type Check | TypeScript check |
| Test | Unit tests |

### 2.2 Build Stage

| Step | Description |
|------|-------------|
| Build API | Build backend |
| Build Web | Build frontend |
| Build Admin | Build admin panel |
| Upload Artifacts | Store build files |

### 2.3 Deploy Stage

| Step | Description |
|------|-------------|
| Download | Get build artifacts |
| SSH | Connect to server |
| Pull | Git pull |
| Install | npm ci --production |
| Migrate | Database migration |
| Restart | PM2 restart |

### 2.4 Verify Stage

| Step | Description |
|------|-------------|
| Health Check | Test endpoints |
| Smoke Test | Basic functionality |

---

## 3. Environments

| Environment | Branch | URL |
|-------------|--------|-----|
| Staging | develop | staging.oblintz.com |
| Production | main | oblintz.com |

---

## 4. Triggers

| Trigger | Action |
|---------|--------|
| Push to develop | Deploy to staging |
| Push to main | Deploy to production |
| Pull Request | Run tests only |

---

**Version**: 1.0
**Last Updated**: 28 August 2026
