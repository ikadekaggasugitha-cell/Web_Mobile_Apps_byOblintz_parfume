import { pgTable, uuid, varchar, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
import { adminRoleEnum, userRoleEnum } from './enums'

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    phone: varchar('phone', { length: 20 }).unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    avatar: varchar('avatar', { length: 500 }),
    role: userRoleEnum('role').default('USER').notNull(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    phoneVerified: boolean('phone_verified').default(false).notNull(),
    banned: boolean('banned').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [index('users_email_idx').on(t.email)],
)

export const addresses = pgTable(
  'addresses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 20 }).notNull(),
    address: varchar('address').notNull(),
    city: varchar('city', { length: 100 }).notNull(),
    province: varchar('province', { length: 100 }).notNull(),
    postalCode: varchar('postal_code', { length: 10 }).notNull(),
    isDefault: boolean('is_default').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('addresses_user_id_idx').on(t.userId)],
)

export const adminUsers = pgTable('admin_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: adminRoleEnum('role').default('ADMIN').notNull(),
  permissions: jsonb('permissions'),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    adminUserId: uuid('admin_user_id'),
    action: varchar('action', { length: 100 }).notNull(),
    module: varchar('module', { length: 100 }).notNull(),
    recordId: uuid('record_id'),
    oldData: jsonb('old_data'),
    newData: jsonb('new_data'),
    ipAddress: varchar('ip_address', { length: 45 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('audit_logs_admin_user_id_created_at_idx').on(t.adminUserId, t.createdAt),
    index('audit_logs_module_action_idx').on(t.module, t.action),
  ],
)
