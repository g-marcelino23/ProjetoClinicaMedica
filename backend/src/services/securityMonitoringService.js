const pool = require('../config/db')
const config = require('../config/env')
const {
  rollbackTransaction,
} = require('./transactionService')
const {
  ALERT_RULES,
  createCorrelationKey,
} = require('../domain/securityMonitoringPolicy')

const createContext = (entry) => {
  const {
    timestamp,
    schemaVersion,
    service,
    level,
    event,
    requestId,
    userId,
    sourceKey,
    method,
    path,
    status,
    ...context
  } = entry

  return context
}

const recordSecurityEvent = async (entry) => {
  const rule = ALERT_RULES[entry.event] || null
  const correlationKey = rule
    ? createCorrelationKey(config.dataProtection.indexKey, entry, rule)
    : null
  const context = createContext(entry)
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const inserted = await client.query(
      `INSERT INTO security_events (
         occurred_at,
         level,
         event_type,
         request_id,
         actor_user_id,
         source_key,
         correlation_key,
         method,
         route,
         status,
         context
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING occurred_at`,
      [
        entry.timestamp,
        entry.level,
        entry.event,
        entry.requestId || null,
        entry.userId || null,
        entry.sourceKey || null,
        correlationKey,
        entry.method || null,
        entry.path || null,
        entry.status || null,
        context,
      ]
    )

    if (!rule) {
      await client.query('COMMIT')
      return null
    }

    const recentEvents = await client.query(
      `SELECT
         COUNT(*)::integer AS event_count,
         MIN(occurred_at) AS first_event_at,
         MAX(occurred_at) AS last_event_at
       FROM security_events
       WHERE event_type = $1
         AND correlation_key = $2
         AND occurred_at >=
           CURRENT_TIMESTAMP - make_interval(secs => $3)`,
      [entry.event, correlationKey, rule.windowSeconds]
    )
    const summary = recentEvents.rows[0]

    if (summary.event_count < rule.threshold) {
      await client.query('COMMIT')
      return null
    }

    const alertResult = await client.query(
      `INSERT INTO security_alerts (
         alert_type,
         severity,
         correlation_key,
         first_event_at,
         last_event_at,
         event_count,
         context
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (alert_type, correlation_key)
         WHERE status = 'OPEN'
       DO UPDATE SET
         first_event_at = LEAST(
           security_alerts.first_event_at,
           EXCLUDED.first_event_at
         ),
         last_event_at = GREATEST(
           security_alerts.last_event_at,
           EXCLUDED.last_event_at
         ),
         event_count = GREATEST(
           security_alerts.event_count,
           EXCLUDED.event_count
         ),
         context = EXCLUDED.context,
         last_notified_at = CASE
           WHEN security_alerts.last_notified_at <=
             CURRENT_TIMESTAMP - make_interval(secs => $8)
           THEN CURRENT_TIMESTAMP
           ELSE security_alerts.last_notified_at
         END,
         updated_at = CURRENT_TIMESTAMP
       RETURNING
         id,
         alert_type,
         severity,
         event_count,
         first_event_at,
         last_event_at,
         last_notified_at = CURRENT_TIMESTAMP AS should_notify`,
      [
        rule.alertType,
        rule.severity,
        correlationKey,
        summary.first_event_at,
        summary.last_event_at || inserted.rows[0].occurred_at,
        summary.event_count,
        {
          event: entry.event,
          requestId: entry.requestId || null,
          path: entry.path || null,
          playbook: rule.alertType,
        },
        rule.cooldownSeconds,
      ]
    )

    await client.query('COMMIT')
    return alertResult.rows[0]
  } catch (error) {
    throw await rollbackTransaction(client, error)
  } finally {
    client.release()
  }
}

module.exports = {
  recordSecurityEvent,
}
