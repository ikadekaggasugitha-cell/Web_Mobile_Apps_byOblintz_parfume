# Troubleshooting

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Troubleshooting Guide |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Panduan troubleshooting untuk OBLINTZ.

---

## 2. Common Issues

### 2.1 Website Not Loading

| Check | Command |
|-------|---------|
| Nginx status | `systemctl status nginx` |
| PM2 status | `pm2 list` |
| Port status | `netstat -tlnp` |

### 2.2 Database Connection Failed

| Check | Command |
|-------|---------|
| PostgreSQL status | `systemctl status postgresql` |
| Connection test | `psql -U oblintz -d oblintz` |

### 2.3 Redis Connection Failed

| Check | Command |
|-------|---------|
| Redis status | `systemctl status redis-server` |
| Connection test | `redis-cli ping` |

### 2.4 Payment Not Working

| Check | Action |
|-------|--------|
| Midtrans status | Check Midtrans dashboard |
| Webhook | Check webhook URL |
| Logs | Check API logs |

---

## 3. Log Locations

| Log | Location |
|-----|----------|
| Nginx | /var/log/nginx/ |
| PM2 | ~/.pm2/logs/ |
| Application | /var/www/oblintz/logs/ |

---

## 4. Common Commands

```bash
# Restart all services
pm2 restart all

# View logs
pm2 logs

# Check disk space
df -h

# Check memory
free -m

# Check processes
top
```

---

## 5. Support

Email: support@oblintz.com

---

**Version**: 1.0
**Last Updated**: 28 August 2026
