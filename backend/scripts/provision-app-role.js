require('dotenv').config()

const { Pool } = require('pg')

const adminPool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_ADMIN_USER || process.env.DB_USER,
  password: process.env.DB_ADMIN_PASSWORD || process.env.DB_PASSWORD,
  ssl:
    process.env.DB_SSL === 'true'
      ? {
          rejectUnauthorized:
            process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
        }
      : false,
})

const run = async () => {
  const client = await adminPool.connect()

  try {
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'clinicalmed_app') THEN
          CREATE ROLE clinicalmed_app;
        END IF;
      END
      $$;
    `)

    await client.query(`
      ALTER ROLE clinicalmed_app
        LOGIN
        NOSUPERUSER
        NOCREATEDB
        NOCREATEROLE
        NOREPLICATION
        NOBYPASSRLS
    `)

    const passwordSql = await client.query(
      `SELECT format(
         'ALTER ROLE clinicalmed_app PASSWORD %L',
         $1::text
       ) AS sql`,
      [process.env.APP_DB_PASSWORD || process.env.DB_PASSWORD]
    )
    await client.query(passwordSql.rows[0].sql)

    const databaseGrant = await client.query(
      `SELECT format(
         'GRANT CONNECT ON DATABASE %I TO clinicalmed_app',
         current_database()
       ) AS sql`
    )
    await client.query(databaseGrant.rows[0].sql)

    await client.query('GRANT USAGE ON SCHEMA public TO clinicalmed_app')
    await client.query(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO clinicalmed_app'
    )
    await client.query(
      'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO clinicalmed_app'
    )

    const verification = await client.query(
      `SELECT rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls
       FROM pg_roles
       WHERE rolname = 'clinicalmed_app'`
    )

    const role = verification.rows[0]
    const restricted = role && Object.values(role).every((value) => value === false)

    if (!restricted) {
      throw new Error('O papel criado ainda possui privilégios administrativos')
    }

    console.log('Papel clinicalmed_app provisionado sem privilégios administrativos.')
  } finally {
    client.release()
  }
}

run()
  .catch((error) => {
    console.error(`Falha ao provisionar papel da aplicação: ${error.name}`)
    process.exitCode = 1
  })
  .finally(() => adminPool.end())
