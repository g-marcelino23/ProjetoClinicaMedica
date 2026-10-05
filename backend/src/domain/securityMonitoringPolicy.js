const crypto = require('node:crypto')

const ALERT_RULES = Object.freeze({
  authentication_failure: {
    alertType: 'AUTHENTICATION_BRUTE_FORCE',
    severity: 'HIGH',
    threshold: 5,
    windowSeconds: 600,
    cooldownSeconds: 900,
    correlation: 'source',
  },
  mfa_verification_failure: {
    alertType: 'MFA_BRUTE_FORCE',
    severity: 'HIGH',
    threshold: 3,
    windowSeconds: 600,
    cooldownSeconds: 900,
    correlation: 'user_or_source',
  },
  password_change_reauthentication_failure: {
    alertType: 'PASSWORD_REAUTHENTICATION_ATTACK',
    severity: 'HIGH',
    threshold: 3,
    windowSeconds: 600,
    cooldownSeconds: 900,
    correlation: 'user_or_source',
  },
  access_control_failure: {
    alertType: 'ACCESS_CONTROL_PROBING',
    severity: 'HIGH',
    threshold: 5,
    windowSeconds: 300,
    cooldownSeconds: 900,
    correlation: 'source',
  },
  input_validation_failure: {
    alertType: 'MALICIOUS_INPUT_PROBING',
    severity: 'MEDIUM',
    threshold: 10,
    windowSeconds: 300,
    cooldownSeconds: 900,
    correlation: 'source_route',
  },
  route_not_found: {
    alertType: 'ROUTE_SCANNING',
    severity: 'MEDIUM',
    threshold: 20,
    windowSeconds: 300,
    cooldownSeconds: 900,
    correlation: 'source',
  },
  cors_origin_rejected: {
    alertType: 'CROSS_ORIGIN_PROBING',
    severity: 'MEDIUM',
    threshold: 3,
    windowSeconds: 300,
    cooldownSeconds: 900,
    correlation: 'source',
  },
  csrf_origin_rejected: {
    alertType: 'CSRF_ATTEMPT',
    severity: 'HIGH',
    threshold: 1,
    windowSeconds: 300,
    cooldownSeconds: 900,
    correlation: 'source',
  },
  authentication_rate_limit: {
    alertType: 'AUTHENTICATION_RATE_LIMIT_TRIGGERED',
    severity: 'HIGH',
    threshold: 1,
    windowSeconds: 900,
    cooldownSeconds: 900,
    correlation: 'source',
  },
  mfa_rate_limit: {
    alertType: 'MFA_RATE_LIMIT_TRIGGERED',
    severity: 'HIGH',
    threshold: 1,
    windowSeconds: 900,
    cooldownSeconds: 900,
    correlation: 'source',
  },
  registration_rate_limit: {
    alertType: 'REGISTRATION_ABUSE',
    severity: 'HIGH',
    threshold: 1,
    windowSeconds: 3600,
    cooldownSeconds: 1800,
    correlation: 'source',
  },
  api_rate_limit: {
    alertType: 'API_RATE_LIMIT_TRIGGERED',
    severity: 'HIGH',
    threshold: 1,
    windowSeconds: 900,
    cooldownSeconds: 900,
    correlation: 'source',
  },
  unhandled_application_error: {
    alertType: 'REPEATED_APPLICATION_FAILURE',
    severity: 'HIGH',
    threshold: 3,
    windowSeconds: 300,
    cooldownSeconds: 900,
    correlation: 'global',
  },
  data_integrity_failure: {
    alertType: 'CLINICAL_DATA_INTEGRITY_FAILURE',
    severity: 'CRITICAL',
    threshold: 1,
    windowSeconds: 3600,
    cooldownSeconds: 3600,
    correlation: 'global',
  },
  authentication_incomplete_profile: {
    alertType: 'AUTHENTICATION_DATA_INCONSISTENCY',
    severity: 'CRITICAL',
    threshold: 1,
    windowSeconds: 3600,
    cooldownSeconds: 3600,
    correlation: 'user_or_source',
  },
  audit_persistence_failure: {
    alertType: 'AUDIT_TRAIL_PERSISTENCE_FAILURE',
    severity: 'CRITICAL',
    threshold: 1,
    windowSeconds: 300,
    cooldownSeconds: 900,
    correlation: 'global',
  },
  dependency_unavailable: {
    alertType: 'DEPENDENCY_UNAVAILABLE',
    severity: 'HIGH',
    threshold: 1,
    windowSeconds: 300,
    cooldownSeconds: 900,
    correlation: 'global',
  },
  transaction_rollback_failure: {
    alertType: 'TRANSACTION_ROLLBACK_FAILURE',
    severity: 'CRITICAL',
    threshold: 1,
    windowSeconds: 3600,
    cooldownSeconds: 3600,
    correlation: 'global',
  },
  transaction_concurrency_failure: {
    alertType: 'REPEATED_TRANSACTION_CONFLICT',
    severity: 'MEDIUM',
    threshold: 5,
    windowSeconds: 300,
    cooldownSeconds: 900,
    correlation: 'source_route',
  },
})

const SENSITIVE_KEY =
  /(authorization|cookie|password|senha|secret|token|recovery_code|codigo|cpf|email|telefone|endereco|diagnostico|anamnese|prescricao|resultado|observacao|mensagem)/i
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g

const sanitizeString = (value, maximumLength = 300) =>
  value.replace(CONTROL_CHARACTERS, ' ').slice(0, maximumLength)

const sanitizeLogValue = (value, depth = 0) => {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return sanitizeString(value)
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'boolean') return value
  if (depth >= 3) return '[TRUNCATED]'

  if (Array.isArray(value)) {
    return value.slice(0, 10).map((item) => sanitizeLogValue(item, depth + 1))
  }

  if (typeof value === 'object') {
    const sanitized = {}
    for (const [key, nestedValue] of Object.entries(value).slice(0, 30)) {
      const safeKey = sanitizeString(key, 60)
      sanitized[safeKey] = SENSITIVE_KEY.test(safeKey)
        ? '[REDACTED]'
        : sanitizeLogValue(nestedValue, depth + 1)
    }
    return sanitized
  }

  return sanitizeString(String(value))
}

const hashSecurityContext = (key, label, value) => {
  if (!value || value === 'unknown') return null

  return crypto
    .createHmac('sha256', key)
    .update(`${label}:${String(value)}`, 'utf8')
    .digest('hex')
}

const getCorrelationMaterial = (rule, entry) => {
  const source = entry.sourceKey || 'unknown-source'
  const user = entry.userId ? `user:${entry.userId}` : source

  switch (rule.correlation) {
    case 'user_or_source':
      return user
    case 'source_route':
      return `${source}:route:${entry.path || 'unknown-route'}`
    case 'global':
      return 'clinicalmed-api'
    default:
      return source
  }
}

const createCorrelationKey = (key, entry, rule) =>
  hashSecurityContext(
    key,
    'security-alert',
    `${rule.alertType}:${getCorrelationMaterial(rule, entry)}`
  )

module.exports = {
  ALERT_RULES,
  createCorrelationKey,
  hashSecurityContext,
  sanitizeLogValue,
  sanitizeString,
}
