#!/bin/bash

# OBLINTZ Deployment Script
# Run this on your VPS after first clone

set -e

echo "🚀 OBLINTZ Deployment Script"
echo "=========================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root (sudo)${NC}"
  exit 1
fi

# Update system
echo -e "${YELLOW}1. Updating system...${NC}"
apt update && apt upgrade -y

# Install Node.js 20
echo -e "${YELLOW}2. Installing Node.js 20...${NC}"
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi

# Install pnpm
echo -e "${YELLOW}3. Installing pnpm...${NC}"
npm install -g pnpm

# Install PM2
echo -e "${YELLOW}4. Installing PM2...${NC}"
npm install -g pm2

# Install Nginx
echo -e "${YELLOW}5. Installing Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
  apt install -y nginx
fi

# Install Certbot
echo -e "${YELLOW}6. Installing Certbot...${NC}"
if ! command -v certbot &> /dev/null; then
  apt install -y certbot python3-certbot-nginx
fi

# Setup project
echo -e "${YELLOW}7. Setting up project...${NC}"
cd /var/www/oblintz

# Create logs directory
mkdir -p logs

# Install dependencies
pnpm install --frozen-lockfile

# Setup environment
if [ ! -f apps/api/.env ]; then
  cp .env.example apps/api/.env
  echo -e "${YELLOW}   Created .env from .env.example - Please edit it!${NC}"
  echo -e "${YELLOW}   Run: nano /var/www/oblintz/apps/api/.env${NC}"
fi

# Generate Prisma client
cd apps/api
pnpm prisma generate

# Build
echo -e "${YELLOW}8. Building apps...${NC}"
cd /var/www/oblintz
pnpm --filter oblintz-api build
pnpm --filter oblintz-web build
pnpm --filter oblintz-admin build

# Setup Nginx
echo -e "${YELLOW}9. Setting up Nginx...${NC}"
cp deploy/nginx/oblintz.conf /etc/nginx/sites-available/oblintz
ln -sf /etc/nginx/sites-available/oblintz /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Start with PM2
echo -e "${YELLOW}10. Starting with PM2...${NC}"
cd /var/www/oblintz
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Setup SSL (interactive)
echo ""
echo -e "${GREEN}✅ Basic deployment complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Edit environment: nano apps/api/.env"
echo "2. Setup SSL: sudo certbot --nginx -d oblintz.com -d www.oblintz.com"
echo "3. Setup firewall: sudo ufw allow 'Nginx Full'"
echo "4. Check logs: pm2 logs"
echo "5. Monitor: pm2 monit"
