# PM2 Configuration

## Document Information

| Field | Value |
|-------|-------|
| Document Type | PM2 Configuration |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Konfigurasi PM2 untuk OBLINTZ.

---

## 2. Ecosystem Config

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'oblintz-api',
      script: './apps/api/dist/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      max_memory_restart: '500M',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
    },
    {
      name: 'oblintz-web',
      script: './apps/web/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '500M',
    },
    {
      name: 'oblintz-admin',
      script: './apps/admin/server.js',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      max_memory_restart: '300M',
    },
  ],
};
```

---

## 3. Commands

```bash
# Start all apps
pm2 start ecosystem.config.js

# List running apps
pm2 list

# View logs
pm2 logs

# Restart app
pm2 restart oblintz-api

# Stop app
pm2 stop oblintz-api

# Delete app
pm2 delete oblintz-api

# Save process list
pm2 save

# Restore process list
pm2 resurrect

# Startup script
pm2 startup
```

---

## 4. Monitoring

```bash
# Monitor CPU/Memory
pm2 monit

# View detailed info
pm2 show oblintz-api
```

---

**Version**: 1.0
**Last Updated**: 28 August 2026
