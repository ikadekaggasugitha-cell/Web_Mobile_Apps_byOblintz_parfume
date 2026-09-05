import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import * as schema from './schema'
import * as relations from './relations'

const connectionString = process.env.DATABASE_URL!

const migrationClient = postgres(connectionString, { max: 1 })
const db = drizzle(migrationClient, { schema: { ...schema, ...relations } })

async function main() {
  console.log('Running migrations...')
  await migrate(db, { migrationsFolder: './drizzle/migrations' })
  console.log('Migrations complete!')
  await migrationClient.end()
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
