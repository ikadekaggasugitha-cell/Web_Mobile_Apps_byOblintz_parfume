# Grafana Dashboard

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Grafana Dashboard |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Dashboard Grafana untuk OBLINTZ monitoring.

---

## 2. Dashboard Panels

### 2.1 System Metrics

| Panel | Query |
|-------|-------|
| CPU Usage | `100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)` |
| Memory Usage | `(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100` |
| Disk Usage | `(1 - node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100` |

### 2.2 Application Metrics

| Panel | Query |
|-------|-------|
| Request Rate | `rate(http_requests_total[5m])` |
| Response Time | `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))` |
| Error Rate | `rate(http_requests_total{status_code=~"5.."}[5m])` |

### 2.3 Business Metrics

| Panel | Query |
|-------|-------|
| Orders Today | `increase(orders_total[24h])` |
| Revenue Today | `increase(orders_amount_total[24h])` |

---

## 3. Setup

1. Login to Grafana (http://server:3000)
2. Add Prometheus data source (http://localhost:9090)
3. Import dashboard or create new
4. Add panels with queries above

---

## 4. Alerts

Configure alert channels:
- Email
- Telegram
- Slack

---

**Version**: 1.0
**Last Updated**: 28 August 2026
