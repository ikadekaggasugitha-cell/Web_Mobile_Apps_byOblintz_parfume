# OBLINTZ Documentation

Selamat datang di dokumentasi resmi OBLINTZ Perfume E-Commerce Platform.

## Overview

OBLINTZ adalah platform e-commerce parfum premium yang mengintegrasikan brand showcase dengan pengalaman belanja online yang intuitif. Platform ini dirancang untuk memberikan pengalaman personalisasi tinggi melalui fitur quiz parfum, subscription, dan gift wrapping.

---

## Struktur Dokumentasi

### Business Documentation
Dokumen bisnis yang menjelaskan kebutuhan, aturan, dan konteks proyek.

| Document | Description |
|----------|-------------|
| [BRD.md](./01-business/BRD.md) | Business Requirement Document |
| [PRD.md](./01-business/PRD.md) | Product Requirement Document |
| [Business-Rules.md](./01-business/Business-Rules.md) | Aturan bisnis |
| [User-Roles.md](./01-business/User-Roles.md) | Definisi role pengguna |
| [Stakeholders.md](./01-business/Stakeholders.md) | Daftar stakeholders |

### Architecture Documentation
Dokumen arsitektur yang menjelaskan struktur sistem dan teknologi.

| Document | Description |
|----------|-------------|
| [Architecture-Overview.md](./02-architecture/Architecture-Overview.md) | Arsitektur tingkat tinggi |
| [Tech-Stack.md](./02-architecture/Tech-Stack.md) | Tech stack final |
| [Database-Schema.md](./02-architecture/Database-Schema.md) | Schema database |
| [API-Design.md](./02-architecture/API-Design.md) | API endpoints |
| [Security-Architecture.md](./02-architecture/Security-Architecture.md) | Keamanan sistem |
| [Folder-Structure.md](./02-architecture/Folder-Structure.md) | Struktur project |

### Feature Documentation
Dokumen fitur yang menjelaskan setiap fitur platform.

| Document | Description |
|----------|-------------|
| [Product-Catalog.md](./03-features/Product-Catalog.md) | Fitur catalog |
| [Quiz-Wizard.md](./03-features/Quiz-Wizard.md) | Fitur quiz parfum |
| [Cart-Checkout.md](./03-features/Cart-Checkout.md) | Keranjang & checkout |
| [Payment-QRIS.md](./03-features/Payment-QRIS.md) | Integrasi QRIS |
| [Subscription.md](./03-features/Subscription.md) | Sistem subscription |
| [Gift-Wrapping.md](./03-features/Gift-Wrapping.md) | Gift wrapping |
| [Review-Rating.md](./03-features/Review-Rating.md) | Sistem review |
| [Wishlist-Collection.md](./03-features/Wishlist-Collection.md) | Wishlist & collection |
| [User-Authentication.md](./03-features/User-Authentication.md) | Autentikasi pengguna |

### Admin Documentation
Dokumen CMS admin panel.

| Document | Description |
|----------|-------------|
| [CMS-Overview.md](./04-admin/CMS-Overview.md) | Overview CMS admin |
| [Dashboard.md](./04-admin/Dashboard.md) | Fitur dashboard |
| [Product-Management.md](./04-admin/Product-Management.md) | Manajemen produk |
| [Order-Management.md](./04-admin/Order-Management.md) | Manajemen pesanan |
| [User-Management.md](./04-admin/User-Management.md) | Manajemen pengguna |
| [Content-Management.md](./04-admin/Content-Management.md) | Manajemen konten |
| [Marketing-Tools.md](./04-admin/Marketing-Tools.md) | Tools marketing |
| [Reports-Analytics.md](./04-admin/Reports-Analytics.md) | Laporan & analytics |

### Deployment Documentation
Dokumen deployment dan infrastruktur.

| Document | Description |
|----------|-------------|
| [Deployment-Guide.md](./05-deployment/Deployment-Guide.md) | Panduan deployment |
| [VPS-Setup.md](./05-deployment/VPS-Setup.md) | Setup VPS |
| [Nginx-Config.md](./05-deployment/Nginx-Config.md) | Konfigurasi Nginx |
| [PM2-Config.md](./05-deployment/PM2-Config.md) | Konfigurasi PM2 |
| [SSL-Setup.md](./05-deployment/SSL-Setup.md) | Setup SSL |
| [Environment-Variables.md](./05-deployment/Environment-Variables.md) | Variabel environment |
| [Backup-Restore.md](./05-deployment/Backup-Restore.md) | Backup & restore |

### CI/CD Documentation
Dokumen Continuous Integration dan Deployment.

| Document | Description |
|----------|-------------|
| [GitHub-Actions.md](./06-cicd/GitHub-Actions.md) | Setup GitHub Actions |
| [Pipeline-Overview.md](./06-cicd/Pipeline-Overview.md) | Overview pipeline |
| [Secrets-Configuration.md](./06-cicd/Secrets-Configuration.md) | Konfigurasi secrets |

### Monitoring Documentation
Dokumen monitoring dan observabilitas.

| Document | Description |
|----------|-------------|
| [Monitoring-Setup.md](./07-monitoring/Monitoring-Setup.md) | Setup monitoring |
| [Prometheus-Config.md](./07-monitoring/Prometheus-Config.md) | Konfigurasi Prometheus |
| [Grafana-Dashboard.md](./07-monitoring/Grafana-Dashboard.md) | Dashboard Grafana |
| [Alerting-Rules.md](./07-monitoring/Alerting-Rules.md) | Aturan alert |
| [Log-Management.md](./07-monitoring/Log-Management.md) | Manajemen log |

### Testing Documentation
Dokumen strategi dan test cases.

| Document | Description |
|----------|-------------|
| [Test-Strategy.md](./08-testing/Test-Strategy.md) | Strategi testing |
| [Test-Cases.md](./08-testing/Test-Cases.md) | Test cases |
| [UAT-Checklist.md](./08-testing/UAT-Checklist.md) | Checklist UAT |

### Guides
Panduan penggunaan untuk berbagai role.

| Document | Description |
|----------|-------------|
| [User-Guide.md](./09-guides/User-Guide.md) | Panduan pengguna |
| [Admin-Guide.md](./09-guides/Admin-Guide.md) | Panduan admin |
| [API-Documentation.md](./09-guides/API-Documentation.md) | Dokumentasi API |
| [Troubleshooting.md](./09-guides/Troubleshooting.md) | Panduan troubleshooting |

---

## Quick Links

| Document | Description |
|----------|-------------|
| [BLUEPRINT.md](../BLUEPRINT.md) | Blueprint lengkap proyek |
| [DEPLOYMENT-CHECKLIST.md](../DEPLOYMENT-CHECKLIST.md) | Checklist deployment |

---

## Ringkasan Proyek

| Aspect | Detail |
|--------|--------|
| **Project Name** | OBLINTZ Perfume E-Commerce Platform |
| **Type** | E-commerce + Brand Showcase |
| **Target** | Premium & Mid-market |
| **Platform** | Web + Mobile App |
| **Payment** | Midtrans QRIS |
| **Timeline** | 12-13 weeks (MVP) |
| **Infrastructure** | VPS (Hostinger/Rumahweb) |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Backend | Node.js 20, Fastify 4, Prisma 5 |
| Database | PostgreSQL 15, Redis 7 |
| Payment | Midtrans QRIS |
| Email | SendGrid |
| CI/CD | GitHub Actions |
| Monitoring | Prometheus + Grafana |

---

## Maintenance

Dokumentasi ini dirawat oleh tim OBLINTZ dan akan diperbarui secara berkala.

**Last Updated**: 28 August 2026

**Version**: 1.0
