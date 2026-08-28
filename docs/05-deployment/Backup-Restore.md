# Backup & Restore

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Backup & Restore Guide |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Panduan backup dan restore OBLINTZ.

---

## 2. Backup

### 2.1 Database Backup

```bash
# Backup database
pg_dump -U oblintz oblintz > /var/backups/oblintz-db-$(date +%Y%m%d).sql

# Compressed backup
pg_dump -U oblintz oblintz | gzip > /var/backups/oblintz-db-$(date +%Y%m%d).sql.gz
```

### 2.2 Application Backup

```bash
# Backup application
tar -czf /var/backups/oblintz-app-$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  /var/www/oblintz
```

### 2.3 Full Backup

```bash
# Full backup script
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="/var/backups"

# Database
pg_dump -U oblintz oblintz | gzip > $BACKUP_DIR/oblintz-db-$DATE.sql.gz

# Application
tar -czf $BACKUP_DIR/oblintz-app-$DATE.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  /var/www/oblintz

# Uploads
tar -czf $BACKUP_DIR/oblintz-uploads-$DATE.tar.gz /var/www/oblintz/uploads

# Cleanup old backups (keep 7 days)
find $BACKUP_DIR -name "oblintz-*" -mtime +7 -delete
```

---

## 3. Automated Backup

```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /var/www/oblintz/scripts/backup.sh
```

---

## 4. Restore

### 4.1 Database Restore

```bash
# Restore database
psql -U oblintz oblintz < /var/backups/oblintz-db-YYYYMMDD.sql

# Compressed
gunzip < /var/backups/oblintz-db-YYYYMMDD.sql.gz | psql -U oblintz oblintz
```

### 4.2 Application Restore

```bash
# Restore application
cd /var/www/oblintz
tar -xzf /var/backups/oblintz-app-YYYYMMDD.tar.gz
npm ci --production
npx prisma migrate deploy
pm2 restart all
```

---

## 5. Backup Schedule

| Type | Frequency | Retention |
|------|-----------|-----------|
| Database | Daily | 7 days |
| Application | Daily | 7 days |
| Uploads | Weekly | 30 days |

---

**Version**: 1.0
**Last Updated**: 28 August 2026
