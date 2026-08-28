# Security Architecture

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Security Architecture |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Dokumen ini menjelaskan arsitektur keamanan untuk OBLINTZ platform.

---

## 2. Security Principles

| Principle | Description |
|-----------|-------------|
| Defense in Depth | Multiple layers of security |
| Least Privilege | Minimal access required |
| Secure by Default | Security enabled by default |
| Fail Securely | Handle errors securely |

---

## 3. Security Layers

### 3.1 Network Security

| Layer | Protection |
|-------|------------|
| DDoS Protection | Cloudflare (optional) |
| Firewall | UFW (Uncomplicated Firewall) |
| Rate Limiting | Nginx rate limiting |
| IP Filtering | Admin IP whitelist (optional) |

### 3.2 Application Security

| Layer | Protection |
|-------|------------|
| HTTPS | SSL/TLS encryption (Let's Encrypt) |
| CORS | Cross-Origin Resource Sharing |
| CSP | Content Security Policy |
| XSS Prevention | Input sanitization, CSP headers |
| SQL Injection | Prisma ORM parameterized queries |

### 3.3 Authentication Security

| Layer | Protection |
|-------|------------|
| Password Hashing | bcrypt with salt |
| JWT Tokens | Secure, httpOnly cookies |
| Token Expiry | Access: 15min, Refresh: 7d |
| Rate Limiting | Login attempts limited |

### 3.4 Authorization Security

| Layer | Protection |
|-------|------------|
| RBAC | Role-Based Access Control |
| Middleware | Auth middleware on protected routes |
| Ownership | Users can only access own data |

### 3.5 Data Security

| Layer | Protection |
|-------|------------|
| Encryption | Sensitive data encrypted |
| Backup | Encrypted backups |
| Logging | Audit trail for sensitive operations |

---

## 4. Nginx Security Headers

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval';" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

---

## 5. JWT Configuration

```typescript
{
  accessToken: {
    expiresIn: '15m',
    secret: process.env.JWT_ACCESS_SECRET
  },
  refreshToken: {
    expiresIn: '7d',
    secret: process.env.JWT_REFRESH_SECRET
  }
}
```

---

## 6. Rate Limiting

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

location /api/auth/ {
    limit_req zone=auth burst=5 nodelay;
}

location /api/ {
    limit_req zone=api burst=20 nodelay;
}
```

---

## 7. Security Checklist

- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] Rate limiting active
- [ ] Password hashing (bcrypt)
- [ ] JWT tokens secured
- [ ] Input validation (Zod)
- [ ] SQL injection prevention (Prisma)
- [ ] XSS prevention
- [ ] CORS configured
- [ ] Audit logging
- [ ] Backup encryption
- [ ] Admin access restricted

---

**Version**: 1.0
**Last Updated**: 28 August 2026
