require('dotenv').config({ quiet: true })

const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const pool = require('../src/config/db')
const {
  classifyException,
} = require('../src/domain/exceptionPolicy')
const {
  rollbackTransaction,
} = require('../src/services/transactionService')

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3001'
const allowedOrigin = 'http://localhost:5174'

const request = async (pathname, options = {}) => {
  const response = await fetch(`${baseUrl}${pathname}`, options)
  const text = await response.text()
  let body = null

  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }

  return { response, body, text }
}

const assertSafeResponse = (result) => {
  assert.doesNotMatch(
    result.text,
    /syntaxerror|postgres|node_modules|select\s|password|stack|at\s+\w+\s*\(/i
  )
}

const verifyHttpFailures = async () => {
  const ready = await request('/ready')
  assert.equal(ready.response.status, 200)
  assert.deepEqual(ready.body, { status: 'ready' })

  const malformed = await request('/auth/login', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: allowedOrigin,
    },
    body: '{',
  })
  assert.equal(malformed.response.status, 400)
  assert.equal(malformed.body.erro, 'Corpo JSON inválido')
  assert.ok(malformed.body.request_id)
  assertSafeResponse(malformed)

  const oversized = await request('/auth/login', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: allowedOrigin,
    },
    body: JSON.stringify({ padding: 'x'.repeat(101 * 1024) }),
  })
  assert.equal(oversized.response.status, 413)
  assert.equal(
    oversized.body.erro,
    'Corpo da requisição excede o limite permitido'
  )
  assertSafeResponse(oversized)

  const missing = await request('/auth/login', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: allowedOrigin,
    },
    body: '{}',
  })
  assert.equal(missing.response.status, 400)
  assert.equal(missing.body.erro, 'Dados inválidos')
  assertSafeResponse(missing)

  const extra = await request('/auth/login', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: allowedOrigin,
    },
    body: JSON.stringify({
      email: 'nobody@clinicalmed.local',
      senha: 'NotARealPassword',
      perfil: 'SECRETARIO',
    }),
  })
  assert.equal(extra.response.status, 400)
  assert.equal(extra.body.erro, 'Dados inválidos')
  assertSafeResponse(extra)

  const notFound = await request('/route-that-does-not-exist')
  assert.equal(notFound.response.status, 404)
  assert.equal(notFound.body.erro, 'Rota não encontrada')
  assertSafeResponse(notFound)
}

const verifyDatabaseRollback = async () => {
  const requestId = crypto.randomUUID()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    await client.query(
      `INSERT INTO security_events (
         level, event_type, request_id, status, context
       )
       VALUES ('info', 'exception_smoke_partial', $1, 200, '{"test":true}')`,
      [requestId]
    )

    let originalError
    try {
      await client.query(
        `INSERT INTO security_events (
           level, event_type, request_id, status, context
         )
         VALUES ('info', 'exception_smoke_invalid', $1, 999, '{"test":true}')`,
        [requestId]
      )
    } catch (error) {
      originalError = error
    }

    assert.ok(originalError)
    const transactionError = await rollbackTransaction(client, originalError)
    assert.equal(transactionError, originalError)

    const persisted = await pool.query(
      'SELECT COUNT(*)::integer AS total FROM security_events WHERE request_id = $1',
      [requestId]
    )
    assert.equal(persisted.rows[0].total, 0)
  } finally {
    client.release()
  }
}

const verifyQueryTimeout = async () => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    await client.query(`SET LOCAL statement_timeout = '50ms'`)

    let timeoutError
    try {
      await client.query('SELECT pg_sleep(0.2)')
    } catch (error) {
      timeoutError = error
    }

    assert.ok(timeoutError)
    const classification = classifyException(timeoutError)
    assert.equal(classification.status, 503)
    assert.equal(classification.retryAfterSeconds, 5)
    await rollbackTransaction(client, timeoutError)
  } finally {
    client.release()
  }
}

const run = async () => {
  await verifyHttpFailures()
  await verifyDatabaseRollback()
  await verifyQueryTimeout()
  console.log(
    'A10 smoke: 5 respostas excepcionais seguras, rollback atômico e timeout fail-closed confirmados'
  )
}

run()
  .catch((error) => {
    console.error(`Falha no smoke test da A10: ${error.message}`)
    process.exitCode = 1
  })
  .finally(() => pool.end())
