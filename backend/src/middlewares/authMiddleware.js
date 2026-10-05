const jwt = require('jsonwebtoken')
const pool = require('../config/db')
const config = require('../config/env')
const { clearSessionCookie } = require('../services/sessionService')

const VALID_PROFILES = new Set(['PACIENTE', 'MEDICO', 'SECRETARIO'])

const rejectSession = (res, message = 'Sessão inválida ou expirada') => {
  clearSessionCookie(res)
  return res.status(401).json({ erro: message })
}

const authMiddleware = async (req, res, next) => {
  const token = req.cookies?.[config.jwt.cookieName]
  if (!token) {
    return res.status(401).json({ erro: 'Autenticação necessária' })
  }

  let decoded
  try {
    decoded = jwt.verify(token, config.jwt.secret, {
      algorithms: ['HS256'],
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    })
  } catch {
    return rejectSession(res)
  }

  try {
    if (
      !decoded.jti ||
      !/^[1-9]\d*$/.test(String(decoded.sub || ''))
    ) {
      return rejectSession(res)
    }

    const userResult = await pool.query(
      `SELECT
         u.id,
         u.nome,
         u.email,
         u.perfil,
         u.ativo,
         s.id AS session_id,
         p.id AS paciente_id,
         m.id AS medico_id,
         sec.id AS secretario_id
       FROM auth_sessions s
       JOIN usuarios u ON u.id = s.usuario_id
       LEFT JOIN pacientes p
         ON p.usuario_id = u.id AND u.perfil = 'PACIENTE'
       LEFT JOIN medicos m
         ON m.usuario_id = u.id AND u.perfil = 'MEDICO'
       LEFT JOIN secretarios sec
         ON sec.usuario_id = u.id AND u.perfil = 'SECRETARIO'
       WHERE s.id = $1
         AND s.usuario_id = $2
         AND s.revoked_at IS NULL
         AND s.expires_at > CURRENT_TIMESTAMP
         AND s.last_seen_at >
           CURRENT_TIMESTAMP - make_interval(mins => $3)
         AND u.credentials_changed_at <= s.created_at`,
      [decoded.jti, decoded.sub, config.session.idleMinutes]
    )

    if (
      userResult.rows.length === 0 ||
      userResult.rows[0].ativo !== true ||
      !VALID_PROFILES.has(userResult.rows[0].perfil)
    ) {
      return rejectSession(res)
    }

    const currentUser = userResult.rows[0]
    const linkedProfileId = {
      PACIENTE: currentUser.paciente_id,
      MEDICO: currentUser.medico_id,
      SECRETARIO: currentUser.secretario_id,
    }[currentUser.perfil]

    if (!linkedProfileId) {
      return rejectSession(res, 'Sessão sem perfil vinculado')
    }

    await pool.query(
      `UPDATE auth_sessions
       SET last_seen_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND revoked_at IS NULL`,
      [currentUser.session_id]
    )

    req.authSession = { id: currentUser.session_id }
    req.usuario = {
      id: currentUser.id,
      perfil: currentUser.perfil,
      nome: currentUser.nome,
      email: currentUser.email,
      paciente_id: currentUser.paciente_id || null,
      medico_id: currentUser.medico_id || null,
      secretario_id: currentUser.secretario_id || null,
    }
    next()
  } catch (error) {
    return next(error)
  }
}

module.exports = authMiddleware
