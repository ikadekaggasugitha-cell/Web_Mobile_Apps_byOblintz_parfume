# Nginx Configuration

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Nginx Configuration |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Konfigurasi Nginx untuk OBLINTZ.

---

## 2. Configuration

### 2.1 Main Config

```nginx
# /etc/nginx/sites-available/oblintz.com

upstream api {
    server 127.0.0.1:5000;
}

upstream web {
    server 127.0.0.1:3000;
}

upstream admin {
    server 127.0.0.1:3001;
}

# HTTP → HTTPS redirect
server {
    listen 80;
    server_name oblintz.com www.oblintz.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name oblintz.com www.oblintz.com;

    # SSL
    ssl_certificate /etc/letsencrypt/live/oblintz.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/oblintz.com/privkey.pem;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # API
    location /api/ {
        proxy_pass http://api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Admin
    location /admin {
        proxy_pass http://admin;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    # Static files
    location /uploads/ {
        alias /var/www/oblintz/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Web (Default)
    location / {
        proxy_pass http://web;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    # Next.js static
    location /_next/static/ {
        proxy_pass http://web;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 3. Commands

```bash
# Test config
nginx -t

# Reload
systemctl reload nginx

# Restart
systemctl restart nginx
```

---

**Version**: 1.0
**Last Updated**: 28 August 2026
