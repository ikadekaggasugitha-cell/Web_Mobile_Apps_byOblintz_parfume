# Deployment Guide

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Deployment Guide |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Panduan lengkap deployment OBLINTZ ke production server.

---

## 2. Prerequisites

- VPS (Hostinger/Rumahweb) - Ubuntu 22.04
- Domain name
- SSH access
- GitHub account

---

## 3. Deployment Steps

### 3.1 VPS Setup

```bash
# Connect to VPS
ssh root@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL 15
sudo apt install postgresql postgresql-contrib -y

# Install Redis
sudo apt install redis-server -y

# Install Nginx
sudo apt install nginx -y

# Install PM2
sudo npm install -g pm2
```

### 3.2 Database Setup

```bash
# Create database
sudo -u postgres psql
CREATE USER oblintz WITH PASSWORD 'secure_password';
CREATE DATABASE oblintz OWNER oblintz;
GRANT ALL PRIVILEGES ON DATABASE oblintz TO oblintz;
\q
```

### 3.3 Application Setup

```bash
# Create directory
mkdir -p /var/www/oblintz
cd /var/www/oblintz

# Clone repository
git clone https://github.com/your-username/oblintz.git .

# Install dependencies
npm ci --production

# Setup environment
cp .env.example .env
nano .env

# Run migrations
npx prisma migrate deploy

# Build
npm run build
```

### 3.4 PM2 Setup

```bash
# Start apps
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3.5 Nginx Setup

```bash
# Create config
nano /etc/nginx/sites-available/oblintz.com

# Enable site
ln -s /etc/nginx/sites-available/oblintz.com /etc/nginx/sites-enabled/

# Test and reload
nginx -t
systemctl reload nginx
```

### 3.6 SSL Setup

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot --nginx -d oblintz.com -d www.oblintz.com
```

---

## 4. Verification

- [ ] Website loads (https://oblintz.com)
- [ ] API works (https://api.oblintz.com/health)
- [ ] Admin panel works (https://admin.oblintz.com)
- [ ] SSL working
- [ ] Database connected
- [ ] Redis connected

---

## 5. Rollback

```bash
# Stop current deployment
pm2 stop all

# Restore from backup
cd /var/www/oblintz
tar -xzf /var/backups/oblintz-YYYYMMDD.tar.gz

# Restart
pm2 restart all
```

---

**Version**: 1.0
**Last Updated**: 28 August 2026
