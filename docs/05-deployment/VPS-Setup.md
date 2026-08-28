# VPS Setup

## Document Information

| Field | Value |
|-------|-------|
| Document Type | VPS Setup Guide |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Panduan setup VPS untuk OBLINTZ.

---

## 2. VPS Specifications

| Spec | Minimum | Recommended |
|------|---------|-------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 2 GB | 4 GB |
| Storage | 20 GB SSD | 40 GB SSD |
| Bandwidth | Unmetered | Unmetered |
| OS | Ubuntu 22.04 | Ubuntu 22.04 |

---

## 3. Initial Setup

### 3.1 Connect to VPS

```bash
ssh root@your-server-ip
```

### 3.2 Create User

```bash
# Create new user
adduser oblintz
usermod -aG sudo oblintz

# Setup SSH for new user
mkdir -p /home/oblintz/.ssh
cp /root/.ssh/authorized_keys /home/oblintz/.ssh/
chown -R oblintz:oblintz /home/oblintz/.ssh
```

### 3.3 Security Setup

```bash
# Setup firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable

# Disable root login
nano /etc/ssh/sshd_config
# Change: PermitRootLogin no

# Restart SSH
systemctl restart sshd
```

---

## 4. Software Installation

### 4.1 Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 4.2 PostgreSQL 15

```bash
sudo apt install postgresql postgresql-contrib -y
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### 4.3 Redis

```bash
sudo apt install redis-server -y
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

### 4.4 Nginx

```bash
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 4.5 PM2

```bash
sudo npm install -g pm2
```

---

## 5. Verification

```bash
# Check services
systemctl status postgresql
systemctl status redis-server
systemctl status nginx

# Check versions
node --version
npm --version
psql --version
redis-cli --version
nginx -v
```

---

**Version**: 1.0
**Last Updated**: 28 August 2026
