# Folder Structure

## Document Information

| Field | Value |
|-------|-------|
| Document Type | Project Structure |
| Project | OBLINTZ Perfume E-Commerce Platform |
| Version | 1.0 |
| Date | 28 August 2026 |

---

## 1. Overview

Struktur folder untuk OBLINTZ monorepo.

---

## 2. Root Structure

```
oblintz/
├── apps/
│   ├── web/                          # Customer-facing frontend
│   ├── admin/                        # CMS Admin panel
│   └── api/                          # Backend API
├── packages/
│   ├── shared/                       # Shared types & utils
│   └── ui/                           # Shared UI components
├── docs/                             # Documentation
├── prisma/                           # Database schema
├── uploads/                          # File uploads
├── .github/                          # GitHub Actions
├── .env.example                      # Environment template
├── .gitignore                        # Git ignore
├── package.json                      # Root package.json
├── tsconfig.json                     # TypeScript config
├── BLUEPRINT.md                      # Project blueprint
├── DEPLOYMENT-CHECKLIST.md           # Deployment checklist
└── README.md                         # Project README
```

---

## 3. Frontend Structure (apps/web)

```
apps/web/
├── app/                              # Next.js App Router
│   ├── (auth)/                       # Auth routes (no layout)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   ├── forgot-password/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (shop)/                       # Shop routes
│   │   ├── products/
│   │   │   ├── [slug]/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── categories/
│   │   │   └── [slug]/
│   │   │       └── page.tsx
│   │   ├── cart/
│   │   │   └── page.tsx
│   │   ├── checkout/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── quiz/
│   │   └── page.tsx
│   ├── account/                      # User account
│   │   ├── orders/
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── wishlist/
│   │   │   └── page.tsx
│   │   ├── collections/
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── subscriptions/
│   │   │   └── page.tsx
│   │   ├── addresses/
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Homepage
│   ├── not-found.tsx                 # 404 page
│   └── loading.tsx                   # Loading state
├── components/
│   ├── ui/                           # Shadcn/UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── layout/                       # Layout components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Sidebar.tsx
│   │   └── MobileNav.tsx
│   ├── product/                      # Product components
│   │   ├── ProductCard.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── ProductGallery.tsx
│   │   ├── ProductNotes.tsx
│   │   └── ProductReviews.tsx
│   ├── cart/                         # Cart components
│   │   ├── CartItem.tsx
│   │   ├── CartSummary.tsx
│   │   └── GiftWrapping.tsx
│   ├── quiz/                         # Quiz components
│   │   ├── QuizQuestion.tsx
│   │   ├── QuizProgress.tsx
│   │   └── QuizResults.tsx
│   └── checkout/                     # Checkout components
│       ├── ShippingForm.tsx
│       ├── PaymentMethod.tsx
│       └── OrderSummary.tsx
├── hooks/                            # Custom hooks
│   ├── useAuth.ts
│   ├── useCart.ts
│   ├── useQuiz.ts
│   └── useApi.ts
├── lib/                              # Utilities
│   ├── api.ts
│   ├── utils.ts
│   └── validate.ts
├── stores/                           # Zustand stores
│   ├── authStore.ts
│   ├── cartStore.ts
│   └── quizStore.ts
├── types/                            # TypeScript types
│   ├── product.ts
│   ├── order.ts
│   └── user.ts
├── public/                           # Static assets
│   ├── images/
│   └── icons/
├── next.config.js                    # Next.js config
├── tailwind.config.js                # Tailwind config
├── tsconfig.json                     # TypeScript config
└── package.json                      # Dependencies
```

---

## 4. Backend Structure (apps/api)

```
apps/api/
├── src/
│   ├── config/                       # Configuration
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   ├── jwt.ts
│   │   ├── midtrans.ts
│   │   └── sendgrid.ts
│   ├── middleware/                    # Fastify plugins
│   │   ├── auth.ts
│   │   ├── cors.ts
│   │   ├── rateLimit.ts
│   │   ├── logger.ts
│   │   └── errorHandler.ts
│   ├── modules/                      # Feature modules
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.controller.ts
│   │   ├── product/
│   │   │   ├── product.routes.ts
│   │   │   ├── product.service.ts
│   │   │   └── product.controller.ts
│   │   ├── order/
│   │   │   ├── order.routes.ts
│   │   │   ├── order.service.ts
│   │   │   └── order.controller.ts
│   │   ├── payment/
│   │   │   ├── payment.routes.ts
│   │   │   ├── payment.service.ts
│   │   │   └── payment.controller.ts
│   │   ├── quiz/
│   │   │   ├── quiz.routes.ts
│   │   │   ├── quiz.service.ts
│   │   │   └── quiz.controller.ts
│   │   ├── review/
│   │   │   ├── review.routes.ts
│   │   │   ├── review.service.ts
│   │   │   └── review.controller.ts
│   │   ├── subscription/
│   │   │   ├── subscription.routes.ts
│   │   │   ├── subscription.service.ts
│   │   │   └── subscription.controller.ts
│   │   ├── user/
│   │   │   ├── user.routes.ts
│   │   │   ├── user.service.ts
│   │   │   └── user.controller.ts
│   │   └── admin/
│   │       ├── admin.routes.ts
│   │       ├── admin.service.ts
│   │       └── admin.controller.ts
│   ├── prisma/                       # Database
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── utils/                        # Helpers
│   │   ├── errors.ts
│   │   ├── validators.ts
│   │   └── helpers.ts
│   ├── types/                        # TypeScript types
│   │   └── index.ts
│   └── server.ts                     # Entry point
├── prisma/
│   └── schema.prisma                 # Prisma schema
├── ecosystem.config.js               # PM2 config
├── tsconfig.json                     # TypeScript config
└── package.json                      # Dependencies
```

---

## 5. Admin Structure (apps/admin)

```
apps/admin/
├── app/
│   ├── dashboard/
│   │   └── page.tsx
│   ├── products/
│   │   ├── [id]/
│   │   │   └── page.tsx
│   │   ├── new/
│   │   │   └── page.tsx
│   │   └── page.tsx
│   ├── orders/
│   │   ├── [id]/
│   │   │   └── page.tsx
│   │   └── page.tsx
│   ├── users/
│   │   ├── [id]/
│   │   │   └── page.tsx
│   │   └── page.tsx
│   ├── reviews/
│   │   └── page.tsx
│   ├── content/
│   │   ├── banners/
│   │   │   └── page.tsx
│   │   ├── articles/
│   │   │   └── page.tsx
│   │   └── faq/
│   │       └── page.tsx
│   ├── marketing/
│   │   ├── promos/
│   │   │   └── page.tsx
│   │   └── campaigns/
│   │       └── page.tsx
│   ├── reports/
│   │   └── page.tsx
│   ├── settings/
│   │   └── page.tsx
│   ├── layout.tsx
│   ├── page.tsx
│   └── not-found.tsx
├── components/
│   ├── layout/
│   │   ├── AdminSidebar.tsx
│   │   ├── AdminHeader.tsx
│   │   └── AdminLayout.tsx
│   ├── ui/
│   │   └── ...
│   ├── dashboard/
│   │   ├── StatsCard.tsx
│   │   ├── RecentOrders.tsx
│   │   └── SalesChart.tsx
│   └── tables/
│       ├── DataTable.tsx
│       └── Pagination.tsx
├── hooks/
├── lib/
├── types/
├── next.config.js
├── tailwind.config.js
└── package.json
```

---

**Version**: 1.0
**Last Updated**: 28 August 2026
