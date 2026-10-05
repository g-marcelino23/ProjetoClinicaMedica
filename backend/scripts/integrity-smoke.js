require('dotenv').config({ quiet: true })

const assert = require('node:assert/strict')
const path = require('node:path')
const { Pool } = require('pg')
const appPool = require('../src/config/db')
const {
  buildMigrationInventory,
  verifyMigrationInventory,
} = require('../src/utils/migrationIntegrity')

const migrationPool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_MIGRATION_USER,
  password: process.env.DB_MIGRATION_PASSWORD,
  ssl:
    process.env.DB_SSL === 'true'
      ? {
          rejectUnauthorized:
            process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
        }
      : false,
})

const run = async () => {
  assert.ok(
    process.env.DB_MIGRATION_USER && process.env.DB_MIGRATION_PASSWORD,
    'Credenciais exclusivas de migração são obrigatórias'
  )

  const inventory = buildMigrationInventory(
    path.resolve(__dirname, '..', 'migrations')
  )
  const recorded = await migrationPool.query(
    `SELECT filename, checksum, size_bytes
     FROM schema_migrations
     ORDER BY filename`
  )
  const verification = verifyMigrationInventory(inventory, recorded.rows)

  assert.equal(verification.baseline.length, 0)
  assert.equal(verification.pending.length, 0)
  assert.equal(recorded.rows.length, inventory.length)

  const metadata = await migrationPool.query(`
    SELECT
      COUNT(*) FILTER (
        WHERE column_name IN ('checksum', 'size_bytes') AND is_nullable = 'NO'
      )::integer AS protected_columns,
      (
        SELECT COUNT(*)::integer
        FROM pg_constraint
        WHERE conrelid = 'schema_migrations'::regclass
          AND conname IN (
            'schema_migrations_checksum_format',
            'schema_migrations_size_nonnegative'
          )
      ) AS integrity_constraints
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'schema_migrations'
  `)
  assert.equal(metadata.rows[0].protected_columns, 2)
  assert.equal(metadata.rows[0].integrity_constraints, 2)

  const privileges = await appPool.query(`
    SELECT
      current_user,
      has_table_privilege(
        current_user,
        'schema_migrations',
        'SELECT'
      ) AS can_select,
      has_table_privilege(
        current_user,
        'schema_migrations',
        'UPDATE'
      ) AS can_update
  `)
  assert.equal(privileges.rows[0].can_select, false)
  assert.equal(privileges.rows[0].can_update, false)

  console.log(
    `A08 smoke: ${inventory.length} hashes conferidos, metadados protegidos e conta ${privileges.rows[0].current_user} sem acesso ao histórico`
  )
}

run()
  .catch((error) => {
    console.error(`Falha no smoke test da A08: ${error.message}`)
    process.exitCode = 1
  })
  .finally(async () => {
    await Promise.allSettled([appPool.end(), migrationPool.end()])
  })
