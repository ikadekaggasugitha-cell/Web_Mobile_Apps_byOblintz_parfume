# GitHub Actions

## Document Information

| Field | Value |
|-------|-------|
| Document Type | CI/CD Guide |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Setup GitHub Actions untuk OBLINTZ CI/CD pipeline.

---

## 2. Pipeline Overview

```
Push to main/develop
     │
     ▼
┌─────────────┐
│    Test     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Build    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Deploy    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Verify    │
└─────────────┘
```

---

## 3. Workflow Files

### 3.1 Main Workflow

```yaml
# .github/workflows/main.yml
name: OBLINTZ CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build

  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /var/www/oblintz-staging
            git pull
            npm ci --production
            npx prisma migrate deploy
            pm2 restart all

  deploy-production:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ${{ secrets.PRODUCTION_USER }}
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          script: |
            cd /var/www/oblintz
            git pull
            npm ci --production
            npx prisma migrate deploy
            pm2 restart all
```

---

## 4. Secrets Configuration

| Secret | Description |
|--------|-------------|
| STAGING_HOST | Staging server IP |
| STAGING_USER | SSH username |
| STAGING_SSH_KEY | SSH private key |
| PRODUCTION_HOST | Production server IP |
| PRODUCTION_USER | SSH username |
| PRODUCTION_SSH_KEY | SSH private key |

---

## 5. Commands

```bash
# View workflow runs
gh run list

# View run details
gh run view <run-id>

# Manually trigger workflow
gh workflow run main
```

---

**Version**: 1.0
**Last Updated**: 28 August 2026
