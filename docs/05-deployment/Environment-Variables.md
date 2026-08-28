# Environment Variables

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Environment Variables |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Daftar environment variables untuk OBLINTZ.

---

## 2. Variables

### 2.1 Application

```env
NODE_ENV=production
APP_NAME=OBLINTZ
APP_URL=https://oblintz.com
API_URL=https://api.oblintz.com
ADMIN_URL=https://admin.oblintz.com
```

### 2.2 Database

```env
DATABASE_URL=postgresql://oblintz_user:secure_password@localhost:5432/oblintz
```

### 2.3 Redis

```env
REDIS_URL=redis://localhost:6379
```

### 2.4 JWT

```env
JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
```

### 2.5 Midtrans

```env
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxx
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxx
MIDTRANS_MERCHANT_ID=xxxxx
MIDTRANS_IS_PRODUCTION=true
MIDTRANS_WEBHOOK_URL=https://api.oblintz.com/payments/webhook
```

### 2.6 SendGrid

```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@oblintz.com
SENDGRID_FROM_NAME=OBLINTZ
SENDGRID_REPLY_TO=support@oblintz.com
```

### 2.7 Storage

```env
STORAGE_TYPE=local
UPLOAD_PATH=/var/www/oblintz/uploads
UPLOAD_MAX_SIZE=5242880
```

### 2.8 Monitoring

```env
LOG_LEVEL=info
METRICS_ENABLED=true
```

---

## 3. Template

```env
# Copy to .env and fill in values
cp .env.example .env
```

---

**Version**: 1.0
**Last Updated**: 28 August 2026
