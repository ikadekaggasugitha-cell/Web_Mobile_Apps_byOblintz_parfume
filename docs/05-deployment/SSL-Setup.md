# SSL Setup

## Document Information

| Field | Value |
|-------|-------|
| Document Type | SSL Setup Guide |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Panduan setup SSL dengan Let's Encrypt.

---

## 2. Installation

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y
```

---

## 3. Get Certificate

```bash
# Get certificate for domain
sudo certbot --nginx -d oblintz.com -d www.oblintz.com
```

---

## 4. Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot auto-renewal is configured via systemd timer
systemctl status certbot.timer
```

---

## 5. Verify

```bash
# Check certificate
sudo certbot certificates

# Check expiry
echo | openssl s_client -connect oblintz.com:443 -servername oblintz.com 2>/dev/null | openssl x509 -noout -dates
```

---

## 6. Troubleshooting

| Issue | Solution |
|-------|----------|
| Certificate not found | Check domain DNS points to server |
| Renewal failed | Check certbot logs: `journalctl -u certbot` |
| Nginx error | Test config: `nginx -t` |

---

**Version**: 1.0
**Last Updated**: 28 August 2026
