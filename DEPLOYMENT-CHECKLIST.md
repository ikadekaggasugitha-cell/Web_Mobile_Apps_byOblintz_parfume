# Deployment Checklist

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Deployment Checklist |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## Overview

Checklist lengkap untuk deployment OBLINTZ ke production server.

---

## 1. Pre-Deployment

### 1.1 Infrastructure

- [ ] VPS ordered (Hostinger/Rumahweb)
- [ ] VPS accessible via SSH
- [ ] Domain purchased
- [ ] Domain DNS pointed to VPS IP
- [ ] SSH keys configured

### 1.2 Accounts

- [ ] Midtrans merchant account created
- [ ] Midtrans API keys obtained
- [ ] SendGrid account created
- [ ] SendGrid API key obtained
- [ ] GitHub repository created
- [ ] GitHub secrets configured

### 1.3 Code

- [ ] Code reviewed and approved
- [ ] All tests passing
- [ ] No linting errors
- [ ] No type errors
- [ ] Build successful

---

## 2. VPS Setup

### 2.1 System Update

```bash
sudo apt update && sudo apt upgrade -y
```

- [ ] System updated

### 2.2 Node.js Installation

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

- [ ] Node.js 20 installed
- [ ] npm installed

### 2.3 PostgreSQL Installation

```bash
sudo apt install postgresql postgresql-contrib -y
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

- [ ] PostgreSQL installed
- [ ] Service enabled
- [ ] Service started

### 2.4 Redis Installation

```bash
sudo apt install redis-server -y
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

- [ ] Redis installed
- [ ] Service enabled
- [ ] Service started

### 2.5 Nginx Installation

```bash
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

- [ ] Nginx installed
- [ ] Service enabled
- [ ] Service started

### 2.6 PM2 Installation

```bash
sudo npm install -g pm2
```

- [ ] PM2 installed

### 2.7 Firewall

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

- [ ] Firewall configured
- [ ] Nginx ports allowed
- [ ] SSH port allowed

---

## 3. Database Setup

### 3.1 Create Database

```bash
sudo -u postgres psql
```

```sql
CREATE USER oblintz WITH PASSWORD 'secure_password';
CREATE DATABASE oblintz OWNER oblintz;
GRANT ALL PRIVILEGES ON DATABASE oblintz TO oblintz;
\q
```

- [ ] Database user created
- [ ] Database created
- [ ] Permissions granted

### 3.2 Configure PostgreSQL

```bash
sudo nano /etc/postgresql/15/main/pg_hba.conf
```

- [ ] Authentication configured
- [ ] Remote access configured (if needed)

---

## 4. Application Setup

### 4.1 Create Directory

```bash
mkdir -p /var/www/oblintz
cd /var/www/oblintz
```

- [ ] Application directory created

### 4.2 Clone Repository

```bash
git clone https://github.com/your-username/oblintz.git .
```

- [ ] Repository cloned

### 4.3 Install Dependencies

```bash
npm ci --production
```

- [ ] Dependencies installed

### 4.4 Setup Environment

```bash
cp .env.example .env
nano .env
```

- [ ] Environment file created
- [ ] Database URL configured
- [ ] Redis URL configured
- [ ] JWT secrets configured
- [ ] Midtrans keys configured
- [ ] SendGrid key configured

### 4.5 Run Migrations

```bash
npx prisma migrate deploy
```

- [ ] Database migrations executed

### 4.6 Seed Database (Optional)

```bash
npm run seed
```

- [ ] Initial data seeded

### 4.7 Build Applications

```bash
npm run build
```

- [ ] API built
- [ ] Web app built
- [ ] Admin panel built

---

## 5. PM2 Configuration

### 5.1 Create Ecosystem File

```bash
nano ecosystem.config.js
```

- [ ] Ecosystem file created

### 5.2 Start Applications

```bash
pm2 start ecosystem.config.js
```

- [ ] API started
- [ ] Web app started
- [ ] Admin panel started

### 5.3 Save Process List

```bash
pm2 save
pm2 startup
```

- [ ] Process list saved
- [ ] Startup configured

### 5.4 Verify PM2

```bash
pm2 list
pm2 logs
```

- [ ] All apps running
- [ ] No errors in logs

---

## 6. Nginx Configuration

### 6.1 Create Config File

```bash
nano /etc/nginx/sites-available/oblintz.com
```

- [ ] Config file created
- [ ] Upstream servers configured
- [ ] SSL redirect configured
- [ ] Proxy headers configured

### 6.2 Enable Site

```bash
ln -s /etc/nginx/sites-available/oblintz.com /etc/nginx/sites-enabled/
```

- [ ] Site enabled

### 6.3 Test Configuration

```bash
nginx -t
```

- [ ] Configuration valid

### 6.4 Reload Nginx

```bash
systemctl reload nginx
```

- [ ] Nginx reloaded

---

## 7. SSL Setup

### 7.1 Install Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

- [ ] Certbot installed

### 7.2 Obtain Certificate

```bash
sudo certbot --nginx -d oblintz.com -d www.oblintz.com
```

- [ ] SSL certificate obtained
- [ ] Certificate installed

### 7.3 Verify Auto-Renewal

```bash
sudo certbot renew --dry-run
```

- [ ] Auto-renewal working

---

## 8. Storage Setup

### 8.1 Create Upload Directories

```bash
mkdir -p /var/www/oblintz/uploads/{products,avatars,banners,reviews}
chown -R www-data:www-data /var/www/oblintz/uploads
chmod -R 755 /var/www/oblintz/uploads
```

- [ ] Upload directories created
- [ ] Permissions configured

---

## 9. Monitoring Setup

### 9.1 Install Prometheus

```bash
sudo apt install prometheus -y
```

- [ ] Prometheus installed

### 9.2 Install Node Exporter

```bash
sudo apt install prometheus-node-exporter -y
```

- [ ] Node Exporter installed

### 9.3 Install Grafana

```bash
sudo apt install grafana -y
sudo systemctl enable grafana-server
sudo systemctl start grafana-server
```

- [ ] Grafana installed
- [ ] Service started

### 9.4 Configure Prometheus

```bash
nano /etc/prometheus/prometheus.yml
```

- [ ] Prometheus configured
- [ ] Scrape targets configured
- [ ] Alert rules configured

### 9.5 Access Grafana

- URL: http://your-server-ip:3000
- Default credentials: admin/admin

- [ ] Grafana accessible
- [ ] Admin password changed
- [ ] Dashboard imported

---

## 10. Verification

### 10.1 Website

- [ ] Homepage loads (https://oblintz.com)
- [ ] Products page loads
- [ ] Product detail loads
- [ ] Search works
- [ ] Quiz works

### 10.2 Authentication

- [ ] Registration works
- [ ] Login works
- [ ] Logout works
- [ ] Password reset works

### 10.3 E-commerce

- [ ] Add to cart works
- [ ] Cart updates correctly
- [ ] Checkout works
- [ ] QRIS payment generates
- [ ] Payment callback works
- [ ] Order created successfully

### 10.4 User Features

- [ ] Wishlist works
- [ ] Collection works
- [ ] Review submission works
- [ ] Subscription creation works
- [ ] Gift wrapping works

### 10.5 Admin Panel

- [ ] Admin login works (https://admin.oblintz.com)
- [ ] Dashboard loads
- [ ] Product management works
- [ ] Order management works
- [ ] User management works

### 10.6 API

- [ ] Health check works (/api/health)
- [ ] API responses correct
- [ ] Error handling works
- [ ] Rate limiting works

### 10.7 Email

- [ ] Welcome email sent
- [ ] Order confirmation sent
- [ ] Password reset email sent

### 10.8 Performance

- [ ] Page load time < 2 seconds
- [ ] API response time < 500ms
- [ ] No console errors

### 10.9 Security

- [ ] HTTPS working
- [ ] Security headers present
- [ ] CORS configured
- [ ] Rate limiting active

### 10.10 Monitoring

- [ ] Prometheus collecting metrics
- [ ] Grafana dashboard showing data
- [ ] Uptime monitoring configured
- [ ] Alerts configured

---

## 11. Post-Deployment

### 11.1 Backup

- [ ] Automated backup configured
- [ ] Backup tested
- [ ] Backup schedule defined

### 11.2 Documentation

- [ ] Deployment documented
- [ ] Environment variables documented
- [ ] Access credentials secured

### 11.3 Team

- [ ] Team notified of deployment
- [ ] Access credentials shared
- [ ] Support process defined

### 11.4 Monitoring

- [ ] 24-hour monitoring active
- [ ] Alert channels tested
- [ ] On-call schedule defined

---

## 12. Rollback Plan

### If Issues Occur

1. Check PM2 logs: `pm2 logs`
2. Check Nginx logs: `tail -f /var/log/nginx/error.log`
3. Check application health: `curl https://oblintz.com/health`

### Rollback Steps

1. Stop current deployment
2. Restore from backup
3. Restart services
4. Verify functionality

### Backup Location

```bash
/var/backups/oblintz-YYYYMMDD-HHMMSS.tar.gz
```

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| DevOps | | | |
| Product Owner | | | |

---

**Status**: Ready for Deployment

**Last Updated**: 28 August 2026
