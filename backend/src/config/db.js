const pg = require('pg')
require('dotenv').config()
const config = require('./env')

const pool = new pg.Pool({
  ...config.db,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  statement_timeout: 10_000,
  query_timeout: 12_000,
  application_name: 'clinicalmed-api',
})

pool.on('error', (error) => {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      schemaVersion: 1,
      service: 'clinicalmed-api',
      level: 'error',
      event: 'unexpected_database_pool_error',
      errorName: error.name,
      errorCode: error.code || 'unknown',
    })
  )
})

module.exports = pool
