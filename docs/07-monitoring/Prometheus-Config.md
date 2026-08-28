# Prometheus Configuration

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Prometheus Config |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Konfigurasi Prometheus untuk OBLINTZ.

---

## 2. Configuration

```yaml
# /etc/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'oblintz-api'
    static_configs:
      - targets: ['localhost:5000']
    metrics_path: '/metrics'

  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:9121']

  - job_name: 'postgresql'
    static_configs:
      - targets: ['localhost:9187']

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']

rule_files:
  - '/etc/prometheus/alerts.yml'
```

---

## 3. Alert Rules

```yaml
# /etc/prometheus/alerts.yml
groups:
  - name: oblintz-alerts
    rules:
      - alert: HighCPUUsage
        expr: 100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage"

      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service down"
```

---

## 4. Commands

```bash
# Test config
promtool check config /etc/prometheus/prometheus.yml

# Reload
curl -X POST http://localhost:9090/-/reload
```

---

**Version**: 1.0
**Last Updated**: 28 August 2026
