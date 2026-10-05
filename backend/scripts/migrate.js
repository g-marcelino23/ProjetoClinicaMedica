require('dotenv').config()

const fs = require('node:fs')
const path = require('node:path')
const { Pool } = require('pg')
const {
  buildMigrationInventory,
  verifyMigrationInventory,
} = require('../src/utils/migrationIntegrity')

const hasDedicatedMigrationUser = Boolean(
  process.env.DB_MIGRATION_USER && process.env.DB_MIGRATION_PASSWORD
)

if (!hasDedicatedMigrationUser) {
  throw new Error(
    'DB_MIGRATION_USER e DB_MIGRATION_PASSWORD são obrigatórios para verificar ou aplicar migrações'
  )
}

const pool = new Pool({
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

const migrationsDirectory = path.resolve(__dirname, '..', 'migrations')

const ensureIntegrityMetadata = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      checksum char(64),
      size_bytes integer,
      executed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await client.query(
    'ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum char(64)'
  )
  await client.query(
    'ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS size_bytes integer'
  )
}

const registerBaseline = async (client, baseline) => {
  if (baseline.length === 0) return

  await client.query('BEGIN')
  try {
    for (const migration of baseline) {
      await client.query(
        `UPDATE schema_migrations
         SET checksum = $2, size_bytes = $3
         WHERE filename = $1 AND checksum IS NULL`,
        [migration.filename, migration.checksum, migration.sizeBytes]
      )
    }
    await client.query('COMMIT')
    console.log(
      `Baseline SHA-256 registrado para ${baseline.length} migração(ões) existente(s)`
    )
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}

const applyMigration = async (client, migrationRecord) => {
  await client.query('BEGIN')

  try {
    if (migrationRecord.filename.endsWith('.sql')) {
      const sql = fs.readFileSync(
        path.join(migrationsDirectory, migrationRecord.filename),
        'utf8'
      )
      await client.query(sql)
    } else {
      const migration = require(
        path.join(migrationsDirectory, migrationRecord.filename)
      )
      if (typeof migration.up !== 'function') {
        throw new Error(
          `${migrationRecord.filename} deve exportar uma função up(client)`
        )
      }
      await migration.up(client)
    }

    await client.query(
      `INSERT INTO schema_migrations (filename, checksum, size_bytes)
       VALUES ($1, $2, $3)`,
      [
        migrationRecord.filename,
        migrationRecord.checksum,
        migrationRecord.sizeBytes,
      ]
    )
    await client.query('COMMIT')
    console.log(`Migração aplicada: ${migrationRecord.filename}`)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}

const hardenIntegrityMetadata = async (client) => {
  await client.query('BEGIN')

  try {
    await client.query(
      'ALTER TABLE schema_migrations ALTER COLUMN checksum SET NOT NULL'
    )
    await client.query(
      'ALTER TABLE schema_migrations ALTER COLUMN size_bytes SET NOT NULL'
    )
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'schema_migrations_checksum_format'
            AND conrelid = 'schema_migrations'::regclass
        ) THEN
          ALTER TABLE schema_migrations
            ADD CONSTRAINT schema_migrations_checksum_format
            CHECK (checksum ~ '^[a-f0-9]{64}$');
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'schema_migrations_size_nonnegative'
            AND conrelid = 'schema_migrations'::regclass
        ) THEN
          ALTER TABLE schema_migrations
            ADD CONSTRAINT schema_migrations_size_nonnegative
            CHECK (size_bytes >= 0);
        END IF;

        IF EXISTS (
          SELECT 1 FROM pg_roles WHERE rolname = 'clinicalmed_app'
        ) THEN
          REVOKE ALL PRIVILEGES
            ON TABLE schema_migrations
            FROM clinicalmed_app;
        END IF;
      END
      $$;
    `)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}

const run = async () => {
  const inventory = buildMigrationInventory(migrationsDirectory)
  const client = await pool.connect()

  try {
    await client.query(
      `SELECT pg_advisory_lock(hashtext('clinicalmed_schema_migrations'))`
    )
    await ensureIntegrityMetadata(client)

    const recorded = await client.query(
      `SELECT filename, checksum, size_bytes
       FROM schema_migrations
       ORDER BY filename`
    )
    const { baseline, pending } = verifyMigrationInventory(
      inventory,
      recorded.rows
    )

    await registerBaseline(client, baseline)

    for (const migrationRecord of pending) {
      await applyMigration(client, migrationRecord)
    }

    await hardenIntegrityMetadata(client)
    console.log(
      `Integridade confirmada para ${inventory.length} migração(ões) com SHA-256`
    )
  } finally {
    await client
      .query(
        `SELECT pg_advisory_unlock(hashtext('clinicalmed_schema_migrations'))`
      )
      .catch(() => {})
    client.release()
  }
}

run()
  .catch((error) => {
    console.error(`Falha ao aplicar migrações: ${error.message}`)
    process.exitCode = 1
  })
  .finally(() => pool.end())
