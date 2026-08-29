#!/bin/bash

# OBLINTZ Database Backup Script
# Run via cron: 0 2 * * * /var/www/oblintz/deploy/backup.sh

set -e

# Config
BACKUP_DIR="/var/backups/oblintz"
DB_NAME="oblintz"
DB_USER="oblintz"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/oblintz_$TIMESTAMP.sql.gz"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Dump and compress
pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

# Keep only last 30 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete

echo "[$(date)] Backup completed: $BACKUP_FILE"
