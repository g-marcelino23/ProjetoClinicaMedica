const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const test = require('node:test')
const {
  ALERT_RULES,
  createCorrelationKey,
  hashSecurityContext,
  sanitizeLogValue,
} = require('../src/domain/securityMonitoringPolicy')

const testKey = crypto.randomBytes(32)

test('contexto sensível é redigido e controles são neutralizados', () => {
  const sanitized = sanitizeLogValue({
    requestId: 'safe-id',
    path: '/login\r\nFAKE_EVENT',
    senha: 'NeverLogThis',
    nested: {
      cookie: 'session=secret',
      cpf: '000.000.000-00',
    },
  })
  const serialized = JSON.stringify(sanitized)

  assert.equal(sanitized.senha, '[REDACTED]')
  assert.equal(sanitized.nested.cookie, '[REDACTED]')
  assert.equal(sanitized.nested.cpf, '[REDACTED]')
  assert.doesNotMatch(serialized, /NeverLogThis|session=secret|000\.000/)
  assert.doesNotMatch(sanitized.path, /[\r\n]/)
})

test('identificador de origem é HMAC estável sem expor o endereço', () => {
  const first = hashSecurityContext(
    testKey,
    'source-ip',
    '203.0.113.10'
  )
  const second = hashSecurityContext(
    testKey,
    'source-ip',
    '203.0.113.10'
  )

  assert.equal(first, second)
  assert.match(first, /^[a-f0-9]{64}$/)
  assert.doesNotMatch(first, /203\.0\.113/)
})

test('correlação separa origens e rotas sem armazenar o valor original', () => {
  const rule = ALERT_RULES.input_validation_failure
  const baseEntry = {
    sourceKey: 'a'.repeat(64),
    path: '/auth/login',
  }
  const first = createCorrelationKey(testKey, baseEntry, rule)
  const otherRoute = createCorrelationKey(
    testKey,
    { ...baseEntry, path: '/auth/register' },
    rule
  )

  assert.match(first, /^[a-f0-9]{64}$/)
  assert.notEqual(first, otherRoute)
})

test('regras cobrem autenticação, autorização, validação, erros e integridade', () => {
  assert.ok(Object.keys(ALERT_RULES).length >= 15)
  assert.equal(ALERT_RULES.authentication_failure.threshold, 5)
  assert.equal(ALERT_RULES.mfa_verification_failure.threshold, 3)
  assert.equal(ALERT_RULES.access_control_failure.severity, 'HIGH')
  assert.equal(ALERT_RULES.input_validation_failure.severity, 'MEDIUM')
  assert.equal(ALERT_RULES.data_integrity_failure.severity, 'CRITICAL')
  assert.equal(ALERT_RULES.audit_persistence_failure.threshold, 1)
})
