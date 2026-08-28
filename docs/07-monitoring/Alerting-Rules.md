# Alerting Rules

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Alerting Rules |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Aturan alerting untuk OBLINTZ.

---

## 2. System Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| High CPU | CPU > 80% for 5 min | Warning |
| High Memory | Memory > 85% for 5 min | Warning |
| Disk Low | Disk < 20% free | Critical |
| Service Down | Service unreachable for 1 min | Critical |

---

## 3. Application Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| High Response Time | p95 > 1s for 5 min | Warning |
| High Error Rate | Errors > 5% for 5 min | Critical |
| Database Pool Full | Connections > 80 | Warning |

---

## 4. Business Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| No Orders | Zero orders for 2 hours | Warning |
| Payment Failure | Failure rate > 10% | Critical |

---

## 5. Notification Channels

| Channel | Configuration |
|---------|---------------|
| Email | SMTP settings |
| Telegram | Bot token + chat ID |
| Slack | Webhook URL |

---

**Version**: 1.0
**Last Updated**: 28 August 2026
