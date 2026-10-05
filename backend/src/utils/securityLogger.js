const pool = require('../config/db')
const config = require('../config/env')
const {
  hashSecurityContext,
  sanitizeLogValue,
  sanitizeString,
} = require('../domain/securityMonitoringPolicy')
const {
  recordSecurityEvent,
} = require('../services/securityMonitoringService')

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const AUDITED_READ_PREFIXES = [
  '/consultas',
  '/exames',
  '/pacientes',
  '/portal/paciente',
  '/prescricoes',
  '/prontuarios',
]

const getClientIp = (req) => req.ip || req.socket?.remoteAddress || 'unknown'

const emitStructuredEntry = (entry) => {
  const output = JSON.stringify(entry)

  if (entry.level === 'error' || entry.level === 'warn') {
    console.error(output)
  } else {
    console.log(output)
  }
}

const createSecurityEntry = (level, event, details = {}) => {
  const sanitizedDetails = sanitizeLogValue(details)
  const sourceKey = hashSecurityContext(
    config.dataProtection.indexKey,
    'source-ip',
    details.ip
  )

  delete sanitizedDetails.ip

  return {
    timestamp: new Date().toISOString(),
    schemaVersion: 1,
    service: 'clinicalmed-api',
    level: ['info', 'warn', 'error'].includes(level) ? level : 'info',
    event: sanitizeString(event, 100),
    ...sanitizedDetails,
    ...(sourceKey ? { sourceKey } : {}),
  }
}

const writeSecurityLog = (level, event, details = {}) => {
  const entry = createSecurityEntry(level, event, details)
  emitStructuredEntry(entry)

  if (process.env.NODE_TEST_CONTEXT) {
    return entry
  }

  void recordSecurityEvent(entry)
    .then((alert) => {
      if (!alert?.should_notify) return

      emitStructuredEntry({
        timestamp: new Date().toISOString(),
        schemaVersion: 1,
        service: 'clinicalmed-api',
        level: alert.severity === 'CRITICAL' ? 'error' : 'warn',
        event: 'security_alert_raised',
        alertId: alert.id,
        alertType: alert.alert_type,
        severity: alert.severity,
        eventCount: alert.event_count,
        firstEventAt: alert.first_event_at,
        lastEventAt: alert.last_event_at,
      })
    })
    .catch((error) => {
      emitStructuredEntry({
        timestamp: new Date().toISOString(),
        schemaVersion: 1,
        service: 'clinicalmed-api',
        level: 'error',
        event: 'security_monitoring_persistence_failure',
        errorName: sanitizeString(error.name || 'Error', 80),
      })
      emitStructuredEntry({
        timestamp: new Date().toISOString(),
        schemaVersion: 1,
        service: 'clinicalmed-api',
        level: 'error',
        event: 'security_alert_raised',
        alertId: null,
        alertType: 'SECURITY_MONITORING_UNAVAILABLE',
        severity: 'CRITICAL',
      })
    })

  return entry
}

const securityAuditMiddleware = (req, res, next) => {
  res.on('finish', () => {
    const path = req.originalUrl?.split('?')[0]
    const auditedRead =
      req.method === 'GET' &&
      Boolean(req.usuario?.id) &&
      AUDITED_READ_PREFIXES.some(
        (prefix) => path === prefix || path?.startsWith(`${prefix}/`)
      )
    const shouldLog =
      MUTATING_METHODS.has(req.method) ||
      auditedRead ||
      [401, 403, 404, 429].includes(res.statusCode) ||
      res.statusCode >= 500

    if (!shouldLog) return

    const details = {
      requestId: req.id,
      method: req.method,
      path,
      status: res.statusCode,
      ip: getClientIp(req),
      userId: req.usuario?.id || null,
      profile: req.usuario?.perfil || null,
    }

    const event =
      res.statusCode === 429
        ? 'security_rate_limit'
        : res.statusCode >= 500
          ? 'server_response_error'
          : res.statusCode === 403
            ? 'access_control_failure'
            : res.statusCode === 404
              ? 'route_not_found'
              : auditedRead
                ? 'clinical_data_access'
                : 'security_audit'

    writeSecurityLog(
      res.statusCode >= 400 ? 'warn' : 'info',
      event,
      details
    )

    if (
      req.usuario?.id &&
      (MUTATING_METHODS.has(req.method) || auditedRead)
    ) {
      const action = `${req.method} ${details.path}`.slice(0, 100)
      const description = `status=${res.statusCode};request_id=${req.id}`.slice(0, 500)

      pool
        .query(
          `INSERT INTO logs_acesso (usuario_id, acao, descricao)
           VALUES ($1, $2, $3)`,
          [req.usuario.id, action, description]
        )
        .catch(() => {
          writeSecurityLog('error', 'audit_persistence_failure', {
            requestId: req.id,
            userId: req.usuario.id,
          })
        })
    }
  })

  next()
}

module.exports = {
  createSecurityEntry,
  emitStructuredEntry,
  getClientIp,
  securityAuditMiddleware,
  writeSecurityLog,
}
