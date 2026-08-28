# Monitoring Setup

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Monitoring Guide |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Setup monitoring untuk OBLINTZ.

---

## 2. Monitoring Stack

| Component | Purpose |
|-----------|---------|
| Prometheus | Metrics collection |
| Grafana | Visualization |
| Uptime Kuma | Uptime monitoring |

---

## 3. Installation

### 3.1 Prometheus

```bash
sudo apt install prometheus -y
sudo systemctl enable prometheus
sudo systemctl start prometheus
```

### 3.2 Node Exporter

```bash
sudo apt install prometheus-node-exporter -y
sudo systemctl enable prometheus-node-exporter
sudo systemctl start prometheus-node-exporter
```

### 3.3 Grafana

```bash
sudo apt install -y apt-transport-https software-properties-common
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
echo "deb https://packages.grafana.com/oss/deb stable main" | sudo tee -a /etc/apt/sources.list.d/grafana.list
sudo apt update
sudo apt install grafana -y
sudo systemctl enable grafana-server
sudo systemctl start grafana-server
```

---

## 4. Access

| Service | URL | Default Credentials |
|---------|-----|---------------------|
| Prometheus | http://server:9090 | - |
| Grafana | http://server:3000 | admin/admin |

---

## 5. Metrics

### 5.1 System Metrics

- CPU usage
- Memory usage
- Disk usage
- Network traffic

### 5.2 Application Metrics

- Request rate
- Response time
- Error rate
- Active connections

### 5.3 Business Metrics

- Orders per minute
- Revenue per hour
- Active users
- Conversion rate

---

**Version**: 1.0
**Last Updated**: 28 August 2026
