# Secrets Configuration

## Document Information

| Field | Value |
|-------|-------|
| Document Type | GitHub Secrets |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Konfigurasi secrets untuk GitHub Actions.

---

## 2. Required Secrets

### 2.1 Staging

| Secret | Description | Example |
|--------|-------------|---------|
| STAGING_HOST | Server IP | 103.xxx.xxx.xxx |
| STAGING_USER | SSH user | root |
| STAGING_SSH_KEY | SSH private key | -----BEGIN OPENSSH... |

### 2.2 Production

| Secret | Description | Example |
|--------|-------------|---------|
| PRODUCTION_HOST | Server IP | 103.xxx.xxx.xxx |
| PRODUCTION_USER | SSH user | root |
| PRODUCTION_SSH_KEY | SSH private key | -----BEGIN OPENSSH... |

### 2.3 Optional

| Secret | Description |
|--------|-------------|
| CODECOV_TOKEN | Code coverage |
| SLACK_WEBHOOK | Slack notifications |

---

## 3. Setup Instructions

1. Go to GitHub repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret

---

## 4. Security Notes

- Never commit secrets to code
- Rotate secrets periodically
- Use least privilege principle
- Audit secret access

---

**Version**: 1.0
**Last Updated**: 28 August 2026
