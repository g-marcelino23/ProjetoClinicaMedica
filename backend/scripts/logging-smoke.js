require('dotenv').config({ quiet: true })

const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const pool = require('../src/config/db')
const {
  createSecurityEntry,
} = require('../src/utils/securityLogger')
const {
  recordSecurityEvent,
} = require('../src/services/securityMonitoringService')

const run = async () => {
  const runId = crypto.randomUUID()
  const sourceIp = `2001:db8::${crypto.randomBytes(6).toString('hex')}`
  let alert = null

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const entry = createSecurityEntry('warn', 'authentication_failure', {
      requestId: `${runId.slice(0, 48)}-${attempt}`,
      method: 'POST',
      path: '/auth/login',
      status: 401,
      ip: sourceIp,
      senha: 'SmokePasswordMustNeverBeStored',
      cookie: 'clinicalmed_session=SmokeSecret',
      testRunId: runId,
    })
    alert = await recordSecurityEvent(entry)
  }

  assert.ok(alert, 'O limiar de autenticação não gerou alerta')
  assert.equal(alert.alert_type, 'AUTHENTICATION_BRUTE_FORCE')
  assert.equal(alert.severity, 'HIGH')
  assert.equal(alert.event_count, 5)
  assert.equal(alert.should_notify, true)

  const persisted = await pool.query(
    `SELECT context::text AS context
     FROM security_events
     WHERE request_id = $1`,
    [`${runId.slice(0, 48)}-1`]
  )
  assert.equal(persisted.rows.length, 1)
  assert.doesNotMatch(
    persisted.rows[0].context,
    /SmokePasswordMustNeverBeStored|SmokeSecret/
  )
  assert.match(persisted.rows[0].context, /\[REDACTED\]/)

  await assert.rejects(
    pool.query(
      `UPDATE security_events
       SET level = 'info'
       WHERE request_id = $1`,
      [`${runId.slice(0, 48)}-1`]
    ),
    (error) => ['42501', 'P0001'].includes(error.code)
  )

  const openAlert = await pool.query(
    `SELECT status, severity, event_count
     FROM security_alerts
     WHERE id = $1`,
    [alert.id]
  )
  assert.deepEqual(openAlert.rows[0], {
    status: 'OPEN',
    severity: 'HIGH',
    event_count: 5,
  })

  console.log(
    'A09 smoke: força bruta detectada, alerta HIGH aberto, segredos redigidos e trilha imutável'
  )
}

run()
  .catch((error) => {
    console.error(`Falha no smoke test da A09: ${error.message}`)
    process.exitCode = 1
  })
  .finally(() => pool.end())
