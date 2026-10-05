const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const {
  ALERT_RULES,
} = require('../src/domain/securityMonitoringPolicy')

const backendRoot = path.resolve(__dirname, '..')
const read = (relativePath) =>
  fs.readFileSync(path.join(backendRoot, relativePath), 'utf8')

const migration = read('migrations/006_security_logging_and_alerting.sql')
for (const control of [
  'CREATE TABLE IF NOT EXISTS security_events',
  'CREATE TABLE IF NOT EXISTS security_alerts',
  'security_events_append_only',
  'REVOKE ALL PRIVILEGES',
  'GRANT SELECT, INSERT',
]) {
  assert.ok(migration.includes(control), `Controle SQL ausente: ${control}`)
}

const logger = read('src/utils/securityLogger.js')
for (const control of [
  'schemaVersion: 1',
  'security_alert_raised',
  'security_monitoring_persistence_failure',
  'AUDITED_READ_PREFIXES',
  'clinical_data_access',
  'access_control_failure',
  'route_not_found',
]) {
  assert.ok(logger.includes(control), `Controle de logging ausente: ${control}`)
}

const validation = read('src/middlewares/validate.js')
assert.ok(validation.includes('input_validation_failure'))

const errorMiddleware = read('src/middlewares/errorMiddleware.js')
assert.ok(errorMiddleware.includes('classifyException'))

const exceptionPolicy = read('src/domain/exceptionPolicy.js')
assert.ok(exceptionPolicy.includes('data_integrity_failure'))
assert.ok(exceptionPolicy.includes('unhandled_application_error'))

const authentication = read('src/controllers/authController.js')
for (const event of [
  'authentication_failure',
  'authentication_success',
  'mfa_verification_failure',
  'password_change_reauthentication_failure',
  'password_changed',
]) {
  assert.ok(
    authentication.includes(event),
    `Evento de autenticação ausente: ${event}`
  )
}

assert.ok(
  Object.keys(ALERT_RULES).length >= 15,
  'Quantidade insuficiente de casos de detecção'
)
for (const [event, rule] of Object.entries(ALERT_RULES)) {
  assert.match(event, /^[a-z][a-z0-9_]+$/)
  assert.match(rule.alertType, /^[A-Z][A-Z0-9_]+$/)
  assert.ok(['MEDIUM', 'HIGH', 'CRITICAL'].includes(rule.severity))
  assert.ok(rule.threshold >= 1)
  assert.ok(rule.windowSeconds >= 60)
  assert.ok(rule.cooldownSeconds >= 60)
}

console.log(
  `A09: trilha append-only, logs estruturados e ${Object.keys(ALERT_RULES).length} regras de alerta confirmadas`
)
