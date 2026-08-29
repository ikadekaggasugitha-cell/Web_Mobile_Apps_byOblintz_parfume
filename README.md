# OBLINTZ Perfume E-Commerce

Platform e-commerce parfum premium dengan sistem rekomendasi berbasis quiz, subscription, dan admin panel lengkap.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **API** | Fastify, Prisma, PostgreSQL, Redis |
| **Web** | Next.js 14, TypeScript, Tailwind CSS |
| **Admin** | Next.js 14, TypeScript, Tailwind CSS |
| **Payment** | Midtrans (QRIS) |
| **Email** | SendGrid |
| **Process** | PM2, Nginx |

## Features

### Customer (Web)
- Product catalog dengan search & filter
- Quiz rekomendasi parfum
- Keranjang belanja dengan gift wrapping
- Checkout + QRIS payment
- Subscription (Monthly/Quarterly)
- Collections personal
- Review & rating produk
- Wishlist
- User profile & alamat

### Admin Panel
- Dashboard real-time
- Product management (CRUD)
- Order management & status update
- Subscription management
- Content management (Articles & Banners)
- Review moderation
- Reports & analytics
- Profile settings

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9+
- PostgreSQL 16+
- Redis 7+

### Installation

```bash
# Clone
git clone https://github.com/your-repo/oblintz.web.git
cd oblintz.web

# Install dependencies
pnpm install

# Setup environment
cp .env.example apps/api/.env
# Edit apps/api/.env with your config

# Generate Prisma client
cd apps/api
pnpm prisma generate

# Run development
pnpm dev
```

### Development Servers

| App | URL | Port |
|-----|-----|------|
| API | http://localhost:5001 | 5001 |
| Web | http://localhost:3000 | 3000 |
| Admin | http://localhost:3001 | 3001 |

## Project Structure

```
oblintz.web/
├── apps/
│   ├── api/              # Fastify API server
│   │   ├── prisma/       # Database schema & migrations
│   │   └── src/
│   │       ├── modules/  # Route handlers (auth, product, cart, etc.)
│   │       ├── services/ # External services (midtrans, email)
│   │       └── middleware/
│   ├── web/              # Customer-facing Next.js app
│   │   └── src/app/      # App Router pages
│   └── admin/            # Admin panel Next.js app
│       └── src/app/      # App Router pages
├── deploy/               # Deployment configs
│   └── nginx/
└── docs/                 # Documentation (53 files)
```

## API Endpoints

98 endpoints across 18 modules:

- **Auth** (8): Register, login, logout, refresh, forgot/reset password, OTP
- **User** (7): Profile, addresses CRUD, change password
- **Product** (7): List, search, detail, related, admin CRUD
- **Category** (5): Tree, detail, admin CRUD
- **Cart** (6): Redis-backed CRUD + promo validation
- **Checkout** (2): Process + preview
- **Order** (7): User list/detail/cancel + admin status
- **Payment** (4): QRIS create, status, webhook, admin list
- **Review** (8): CRUD, rating stats, admin approve/reject
- **Wishlist** (5): Add/remove/toggle/check/list
- **Promo** (6): Public validate + admin CRUD
- **Upload** (3): Image upload single/multiple + delete
- **Quiz** (2): Options + submit with scoring
- **Collection** (7): User-owned collections CRUD
- **Subscription** (7): Create/pause/resume/cancel + admin
- **Article** (6): Public list/detail + admin CRUD
- **Banner** (5): Public list + admin CRUD + reorder
- **Report** (4): Dashboard, sales, products, users

## Deployment

### VPS Setup

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Install Nginx
sudo apt install nginx -y

# Setup SSL
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d oblintz.com -d www.oblintz.com
```

### Deploy

```bash
# Clone & build
git clone https://github.com/your-repo/oblintz.web.git
cd oblintz.web
pnpm install
pnpm build

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

See [docs/05-deployment/](docs/05-deployment/) for detailed instructions.

## Environment Variables

See `.env.example` for all required variables:

- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `JWT_ACCESS_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - JWT refresh secret
- `MIDTRANS_SERVER_KEY` - Midtrans payment
- `MIDTRANS_CLIENT_KEY` - Midtrans client
- `SENDGRID_API_KEY` - Email service

## License

MIT
