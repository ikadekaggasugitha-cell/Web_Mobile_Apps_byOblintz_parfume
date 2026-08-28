# Log Management

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Log Management |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Manajemen log untuk OBLINTZ.

---

## 2. Log Types

| Type | Location | Description |
|------|----------|-------------|
| Application | /var/www/oblintz/logs/ | App logs |
| Nginx | /var/log/nginx/ | Web server logs |
| PM2 | ~/.pm2/logs/ | Process logs |
| System | /var/log/syslog | System logs |

---

## 3. Log Rotation

```bash
# /etc/logrotate.d/oblintz
/var/www/oblintz/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
}
```

---

## 4. Viewing Logs

```bash
# PM2 logs
pm2 logs

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Application logs
tail -f /var/www/oblintz/logs/app.log
```

---

## 5. Log Levels

| Level | Description |
|-------|-------------|
| error | Errors only |
| warn | Warnings and errors |
| info | General information |
| debug | Debug information |

---

**Version**: 1.0
**Last Updated**: 28 August 2026
