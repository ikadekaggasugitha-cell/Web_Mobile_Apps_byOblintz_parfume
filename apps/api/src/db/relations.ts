import { relations } from 'drizzle-orm'
import { users, addresses } from './schema/users'
import { products, categories } from './schema/products'
import { orders, orderItems, transactions, giftWrappings } from './schema/orders'
import { promoCodes } from './schema/promos'
import { reviews } from './schema/reviews'
import { wishlists } from './schema/wishlists'
import { collections, collectionItems } from './schema/collections'
import { subscriptions } from './schema/subscriptions'
import { quizResults } from './schema/quizzes'
import { auditLogs } from './schema/users'

// ==================== USER RELATIONS ====================

export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(addresses),
  orders: many(orders),
  reviews: many(reviews),
  wishlists: many(wishlists),
  collections: many(collections),
  subscriptions: many(subscriptions),
  quizResults: many(quizResults),
}))

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, { fields: [addresses.userId], references: [users.id] }),
}))

// ==================== PRODUCT RELATIONS ====================

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, { fields: [categories.parentId], references: [categories.id], relationName: 'CategoryTree' }),
  children: many(categories, { relationName: 'CategoryTree' }),
  products: many(products),
}))

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  orderItems: many(orderItems),
  reviews: many(reviews),
  wishlists: many(wishlists),
  collectionItems: many(collectionItems),
  quizResults: many(quizResults),
  subscriptions: many(subscriptions),
}))

// ==================== ORDER RELATIONS ====================

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  promoCode: one(promoCodes, { fields: [orders.promoCodeId], references: [promoCodes.id] }),
  items: many(orderItems),
  transaction: one(transactions),
  giftWrapping: one(giftWrappings),
}))

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}))

export const transactionsRelations = relations(transactions, ({ one }) => ({
  order: one(orders, { fields: [transactions.orderId], references: [orders.id] }),
}))

export const giftWrappingsRelations = relations(giftWrappings, ({ one }) => ({
  order: one(orders, { fields: [giftWrappings.orderId], references: [orders.id] }),
}))

// ==================== PROMO RELATIONS ====================

export const promoCodesRelations = relations(promoCodes, ({ many }) => ({
  orders: many(orders),
}))

// ==================== REVIEW RELATIONS ====================

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
}))

// ==================== WISHLIST RELATIONS ====================

export const wishlistsRelations = relations(wishlists, ({ one }) => ({
  user: one(users, { fields: [wishlists.userId], references: [users.id] }),
  product: one(products, { fields: [wishlists.productId], references: [products.id] }),
}))

// ==================== COLLECTION RELATIONS ====================

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  user: one(users, { fields: [collections.userId], references: [users.id] }),
  items: many(collectionItems),
}))

export const collectionItemsRelations = relations(collectionItems, ({ one }) => ({
  collection: one(collections, { fields: [collectionItems.collectionId], references: [collections.id] }),
  product: one(products, { fields: [collectionItems.productId], references: [products.id] }),
}))

// ==================== SUBSCRIPTION RELATIONS ====================

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
  product: one(products, { fields: [subscriptions.productId], references: [products.id] }),
}))

// ==================== QUIZ RELATIONS ====================

export const quizResultsRelations = relations(quizResults, ({ one }) => ({
  user: one(users, { fields: [quizResults.userId], references: [users.id] }),
  product: one(products, { fields: [quizResults.productId], references: [products.id] }),
}))

// ==================== AUDIT LOG RELATIONS ====================

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  adminUser: one(users, { fields: [auditLogs.adminUserId], references: [users.id] }),
}))
