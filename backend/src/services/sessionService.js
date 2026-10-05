const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const config = require('../config/env')

const getCookieOptions = () => ({
  httpOnly: true,
  secure: config.isProduction,
  sameSite: 'strict',
  path: '/',
  maxAge: config.session.absoluteMinutes * 60 * 1000,
  priority: 'high',
})

const clearSessionCookie = (res) =>
  res.clearCookie(config.jwt.cookieName, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'strict',
    path: '/',
    priority: 'high',
  })

const issueSession = async (client, userId, req) => {
  const sessionId = crypto.randomUUID()
  const expiresAt = new Date(
    Date.now() + config.session.absoluteMinutes * 60 * 1000
  )
  const userAgent = req.get('user-agent') || ''
  const userAgentHash = userAgent
    ? crypto.createHash('sha256').update(userAgent).digest('hex')
    : null

  await client.query(
    `INSERT INTO auth_sessions
       (id, usuario_id, expires_at, user_agent_hash)
     VALUES ($1, $2, $3, $4)`,
    [sessionId, userId, expiresAt, userAgentHash]
  )

  await client.query(
    `UPDATE auth_sessions
     SET revoked_at = CURRENT_TIMESTAMP,
         revocation_reason = 'CONCURRENT_LIMIT'
     WHERE id IN (
       SELECT id
       FROM auth_sessions
       WHERE usuario_id = $1
         AND revoked_at IS NULL
       ORDER BY created_at DESC, id DESC
       OFFSET $2
     )`,
    [userId, config.session.maxConcurrent]
  )

  const token = jwt.sign({}, config.jwt.secret, {
    algorithm: 'HS256',
    subject: String(userId),
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    expiresIn: config.session.absoluteMinutes * 60,
    jwtid: sessionId,
  })

  return { token, expiresAt, sessionId }
}

const setSessionCookie = (res, token) =>
  res.cookie(config.jwt.cookieName, token, getCookieOptions())

module.exports = {
  clearSessionCookie,
  getCookieOptions,
  issueSession,
  setSessionCookie,
}
