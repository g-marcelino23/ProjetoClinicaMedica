const crypto = require('crypto')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const pool = require('../config/db')
const config = require('../config/env')
const {
  MAX_FAILED_ATTEMPTS,
  PASSWORD_COST,
  isMfaRequired,
} = require('../domain/authenticationPolicy')
const {
  clearSessionCookie,
  issueSession,
  setSessionCookie,
} = require('../services/sessionService')
const {
  decryptField,
  encryptField,
} = require('../utils/dataProtection')
const {
  createOtpAuthUri,
  generateSecret,
  verifyTotp,
} = require('../utils/totp')
const { writeSecurityLog } = require('../utils/securityLogger')
const ApplicationError = require('../errors/ApplicationError')
const {
  rollbackTransaction,
} = require('../services/transactionService')

const DUMMY_PASSWORD_HASH =
  '$2b$12$BalzvafhAnq1.ZhlzMr7Wum1dBoDGdmUSUYyv0RsaQ5v9WNJtoSlS'
const VALID_PROFILES = new Set(['PACIENTE', 'MEDICO', 'SECRETARIO'])
const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

const getLinkedProfileIds = async (user, database = pool) => {
  const result = await database.query(
    `SELECT
       p.id AS paciente_id,
       m.id AS medico_id,
       s.id AS secretario_id
     FROM usuarios u
     LEFT JOIN pacientes p
       ON p.usuario_id = u.id AND u.perfil = 'PACIENTE'
     LEFT JOIN medicos m
       ON m.usuario_id = u.id AND u.perfil = 'MEDICO'
     LEFT JOIN secretarios s
       ON s.usuario_id = u.id AND u.perfil = 'SECRETARIO'
     WHERE u.id = $1`,
    [user.id]
  )
  return {
    paciente_id: result.rows[0]?.paciente_id || null,
    medico_id: result.rows[0]?.medico_id || null,
    secretario_id: result.rows[0]?.secretario_id || null,
  }
}

const getLinkedProfileId = (profile, ids) =>
  ({
    PACIENTE: ids.paciente_id,
    MEDICO: ids.medico_id,
    SECRETARIO: ids.secretario_id,
  })[profile]

const publicUser = (user, profileIds) => ({
  id: user.id,
  nome: user.nome,
  email: user.email,
  perfil: user.perfil,
  ...profileIds,
})

const createUser = async (data, allowedProfiles) => {
  if (!allowedProfiles.includes(data.perfil)) {
    throw new ApplicationError(
      'Perfil não permitido neste fluxo de cadastro',
      {
        status: 403,
        publicMessage: 'Perfil não permitido neste fluxo de cadastro',
        code: 'ACCESS_CONTROL_FAILURE',
      }
    )
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const passwordHash = await bcrypt.hash(data.senha, PASSWORD_COST)
    const userResult = await client.query(
      `INSERT INTO usuarios
         (nome, email, senha, perfil, ativo, credentials_changed_at)
       VALUES ($1, $2, $3, $4, true, CURRENT_TIMESTAMP)
       RETURNING id, nome, email, perfil`,
      [data.nome, data.email, passwordHash, data.perfil]
    )
    const user = userResult.rows[0]

    if (data.perfil === 'PACIENTE') {
      await client.query(
        `INSERT INTO pacientes (
           usuario_id, cpf, cpf_lookup, telefone, data_nascimento, endereco
         )
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          user.id,
          data.cpf,
          data.cpf_lookup,
          data.telefone || null,
          data.data_nascimento || null,
          data.endereco || null,
        ]
      )
    }

    if (data.perfil === 'MEDICO') {
      await client.query(
        `INSERT INTO medicos (usuario_id, crm, especialidade, telefone)
         VALUES ($1, $2, $3, $4)`,
        [user.id, data.crm, data.especialidade, data.telefone || null]
      )
    }

    if (data.perfil === 'SECRETARIO') {
      await client.query(
        `INSERT INTO secretarios (usuario_id, telefone)
         VALUES ($1, $2)`,
        [user.id, data.telefone || null]
      )
    }

    await client.query('COMMIT')
    return user
  } catch (error) {
    const transactionError = await rollbackTransaction(client, error)
    if (transactionError !== error) throw transactionError

    if (error.code === '23505') {
      const duplicateError = new ApplicationError('Cadastro duplicado', {
        status: 409,
        publicMessage: 'E-mail, CPF ou CRM já cadastrado',
        code: 'REGISTRATION_CONFLICT',
      })
      duplicateError.isDuplicateRegistration = true
      throw duplicateError
    }

    writeSecurityLog('error', 'registration_write_failure', {
      errorCode: error.code || 'unknown',
      constraint: error.constraint || 'unknown',
    })
    throw error
  } finally {
    client.release()
  }
}

const register = async (req, res, next) => {
  try {
    await createUser(
      { ...req.body, perfil: 'PACIENTE' },
      ['PACIENTE']
    )
    return res.status(202).json({
      mensagem:
        'Se os dados puderem ser utilizados, o cadastro será processado.',
    })
  } catch (error) {
    if (error.isDuplicateRegistration) {
      return res.status(202).json({
        mensagem:
          'Se os dados puderem ser utilizados, o cadastro será processado.',
      })
    }
    next(error)
  }
}

const registerStaff = async (req, res, next) => {
  try {
    const user = await createUser(req.body, ['MEDICO', 'SECRETARIO'])
    return res.status(201).json({
      mensagem: 'Profissional cadastrado com sucesso',
      usuario: user,
    })
  } catch (error) {
    next(error)
  }
}

const recordFailedLogin = async (client, userId) => {
  await client.query(
    `UPDATE usuarios
     SET failed_login_attempts = failed_login_attempts + 1,
         locked_until = CASE
           WHEN failed_login_attempts + 1 >= $2 THEN
             CURRENT_TIMESTAMP + make_interval(
               mins => LEAST(
                 15,
                 power(
                   2,
                   GREATEST(0, failed_login_attempts - $2 + 1)
                 )::integer
               )
             )
           ELSE locked_until
         END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [userId, MAX_FAILED_ATTEMPTS]
  )
}

const createMfaChallenge = async (
  client,
  userId,
  purpose,
  pendingSecret = null
) => {
  await client.query(
    `UPDATE auth_mfa_challenges
     SET consumed_at = CURRENT_TIMESTAMP
     WHERE usuario_id = $1 AND consumed_at IS NULL`,
    [userId]
  )

  const challengeId = crypto.randomUUID()
  await client.query(
    `INSERT INTO auth_mfa_challenges
       (id, usuario_id, purpose, pending_secret, expires_at)
     VALUES (
       $1,
       $2,
       $3,
       $4,
       CURRENT_TIMESTAMP + make_interval(mins => $5)
     )`,
    [
      challengeId,
      userId,
      purpose,
      pendingSecret
        ? encryptField('mfa_secret', pendingSecret)
        : null,
      config.mfa.challengeMinutes,
    ]
  )
  return challengeId
}

const completeAuthentication = async (client, user, req) => {
  const profileIds = await getLinkedProfileIds(user, client)
  if (!getLinkedProfileId(user.perfil, profileIds)) {
    throw new ApplicationError('Perfil incompleto', {
      status: 401,
      publicMessage: 'Autenticação inválida',
      code: 'AUTHENTICATION_INCOMPLETE_PROFILE',
    })
  }

  await client.query(
    `UPDATE usuarios
     SET failed_login_attempts = 0,
         locked_until = NULL,
         last_login_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [user.id]
  )
  const session = await issueSession(client, user.id, req)
  return {
    session,
    usuario: publicUser(user, profileIds),
  }
}

const login = async (req, res, next) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const { email, senha } = req.body
    const result = await client.query(
      `SELECT
         id, nome, email, senha, perfil, ativo,
         failed_login_attempts,
         locked_until > CURRENT_TIMESTAMP AS bloqueado,
         mfa_enabled
       FROM usuarios
       WHERE lower(email) = lower($1)
       FOR UPDATE`,
      [email]
    )
    const user = result.rows[0]
    const passwordValid = await bcrypt.compare(
      senha,
      user?.senha || DUMMY_PASSWORD_HASH
    )

    if (
      !user ||
      !passwordValid ||
      user.ativo !== true ||
      user.bloqueado === true ||
      !VALID_PROFILES.has(user.perfil)
    ) {
      if (user && !passwordValid && user.ativo === true) {
        await recordFailedLogin(client, user.id)
      }
      await client.query('COMMIT')
      writeSecurityLog('warn', 'authentication_failure', {
        requestId: req.id,
        ip: req.ip,
      })
      return res.status(401).json({ erro: 'E-mail ou senha inválidos' })
    }

    const profileIds = await getLinkedProfileIds(user, client)
    if (!getLinkedProfileId(user.perfil, profileIds)) {
      await client.query('COMMIT')
      writeSecurityLog('warn', 'authentication_incomplete_profile', {
        requestId: req.id,
        userId: user.id,
        profile: user.perfil,
        ip: req.ip,
      })
      return res.status(401).json({ erro: 'E-mail ou senha inválidos' })
    }

    if (bcrypt.getRounds(user.senha) < PASSWORD_COST) {
      const upgradedHash = await bcrypt.hash(senha, PASSWORD_COST)
      await client.query(
        `UPDATE usuarios
         SET senha = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [upgradedHash, user.id]
      )
    }

    if (isMfaRequired(user.perfil, config.mfa.requiredProfiles)) {
      if (user.mfa_enabled) {
        const challengeId = await createMfaChallenge(
          client,
          user.id,
          'LOGIN'
        )
        await client.query('COMMIT')
        return res.status(202).json({
          mfa_required: true,
          challenge_id: challengeId,
          mensagem: 'Informe o código do autenticador.',
        })
      }

      const secret = generateSecret()
      const challengeId = await createMfaChallenge(
        client,
        user.id,
        'ENROLLMENT',
        secret
      )
      await client.query('COMMIT')
      return res.status(202).json({
        mfa_enrollment_required: true,
        challenge_id: challengeId,
        secret,
        otpauth_uri: createOtpAuthUri(secret, user.email),
        mensagem: 'Configure o segundo fator para concluir o acesso.',
      })
    }

    const authentication = await completeAuthentication(client, user, req)
    await client.query('COMMIT')
    setSessionCookie(res, authentication.session.token)
    return res.json({
      mensagem: 'Login realizado com sucesso',
      usuario: authentication.usuario,
    })
  } catch (error) {
    next(await rollbackTransaction(client, error))
  } finally {
    client.release()
  }
}

const randomRecoveryCode = () => {
  const bytes = crypto.randomBytes(12)
  let value = ''
  for (const byte of bytes) {
    value += RECOVERY_ALPHABET[byte % RECOVERY_ALPHABET.length]
  }
  return `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8, 12)}`
}

const hashRecoveryCode = (code) =>
  crypto
    .createHmac('sha256', config.dataProtection.indexKey)
    .update(`mfa-recovery:${code}`)
    .digest('hex')

const createRecoveryCodes = async (client, userId) => {
  await client.query(
    'DELETE FROM auth_mfa_recovery_codes WHERE usuario_id = $1',
    [userId]
  )
  const codes = Array.from({ length: 10 }, randomRecoveryCode)
  for (const code of codes) {
    await client.query(
      `INSERT INTO auth_mfa_recovery_codes
         (usuario_id, code_hash)
       VALUES ($1, $2)`,
      [userId, hashRecoveryCode(code)]
    )
  }
  return codes
}

const verifyMfa = async (req, res, next) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const challengeResult = await client.query(
      `SELECT
         ch.id,
         ch.purpose,
         ch.pending_secret,
         ch.attempts,
         u.id AS usuario_id,
         u.nome,
         u.email,
         u.perfil,
         u.ativo,
         u.mfa_enabled,
         u.mfa_secret,
         u.mfa_last_counter
       FROM auth_mfa_challenges ch
       JOIN usuarios u ON u.id = ch.usuario_id
       WHERE ch.id = $1
         AND ch.consumed_at IS NULL
         AND ch.expires_at > CURRENT_TIMESTAMP
         AND ch.attempts < 5
       FOR UPDATE OF ch, u`,
      [req.body.challenge_id]
    )

    if (challengeResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(401).json({
        erro: 'Desafio de autenticação inválido ou expirado',
      })
    }

    const challenge = challengeResult.rows[0]
    if (
      challenge.ativo !== true ||
      !VALID_PROFILES.has(challenge.perfil)
    ) {
      await client.query('ROLLBACK')
      return res.status(401).json({
        erro: 'Desafio de autenticação inválido ou expirado',
      })
    }

    const isRecoveryCode = !/^\d{6}$/.test(req.body.codigo)
    let matchedCounter = null
    let recoveryAccepted = false

    if (isRecoveryCode && challenge.purpose === 'LOGIN') {
      const recoveryResult = await client.query(
        `UPDATE auth_mfa_recovery_codes
         SET used_at = CURRENT_TIMESTAMP
         WHERE usuario_id = $1
           AND code_hash = $2
           AND used_at IS NULL
         RETURNING id`,
        [
          challenge.usuario_id,
          hashRecoveryCode(req.body.codigo),
        ]
      )
      recoveryAccepted = recoveryResult.rows.length === 1
    } else if (!isRecoveryCode) {
      const encryptedSecret =
        challenge.purpose === 'ENROLLMENT'
          ? challenge.pending_secret
          : challenge.mfa_secret
      if (encryptedSecret) {
        const secret = decryptField('mfa_secret', encryptedSecret)
        matchedCounter = verifyTotp(secret, req.body.codigo, {
          lastCounter:
            challenge.purpose === 'LOGIN'
              ? challenge.mfa_last_counter
              : null,
        })
      }
    }

    if (matchedCounter === null && !recoveryAccepted) {
      await client.query(
        `UPDATE auth_mfa_challenges
         SET attempts = attempts + 1
         WHERE id = $1`,
        [challenge.id]
      )
      await client.query('COMMIT')
      writeSecurityLog('warn', 'mfa_verification_failure', {
        requestId: req.id,
        userId: challenge.usuario_id,
        ip: req.ip,
      })
      return res.status(401).json({ erro: 'Código de autenticação inválido' })
    }

    let recoveryCodes = null
    if (challenge.purpose === 'ENROLLMENT') {
      await client.query(
        `UPDATE usuarios
         SET mfa_enabled = true,
             mfa_secret = $1,
             mfa_last_counter = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [
          challenge.pending_secret,
          matchedCounter,
          challenge.usuario_id,
        ]
      )
      recoveryCodes = await createRecoveryCodes(
        client,
        challenge.usuario_id
      )
    } else if (matchedCounter !== null) {
      await client.query(
        `UPDATE usuarios
         SET mfa_last_counter = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [matchedCounter, challenge.usuario_id]
      )
    }

    await client.query(
      `UPDATE auth_mfa_challenges
       SET consumed_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [challenge.id]
    )

    const user = {
      id: challenge.usuario_id,
      nome: challenge.nome,
      email: challenge.email,
      perfil: challenge.perfil,
    }
    const authentication = await completeAuthentication(client, user, req)
    await client.query('COMMIT')
    setSessionCookie(res, authentication.session.token)

    writeSecurityLog('info', 'authentication_success', {
      requestId: req.id,
      userId: user.id,
      profile: user.perfil,
      mfa: recoveryAccepted ? 'recovery_code' : 'totp',
      ip: req.ip,
    })

    return res.json({
      mensagem: 'Login realizado com sucesso',
      usuario: authentication.usuario,
      ...(recoveryCodes ? { recovery_codes: recoveryCodes } : {}),
    })
  } catch (error) {
    next(await rollbackTransaction(client, error))
  } finally {
    client.release()
  }
}

const me = (req, res) => res.json({ usuario: req.usuario })

const logout = async (req, res, next) => {
  const token = req.cookies?.[config.jwt.cookieName]
  let decoded = null

  if (token) {
    try {
      decoded = jwt.verify(token, config.jwt.secret, {
        algorithms: ['HS256'],
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
        ignoreExpiration: true,
      })
    } catch {
      // Token inválido não deve impedir a remoção defensiva do cookie.
    }

    if (decoded?.jti && decoded?.sub) {
      try {
        await pool.query(
          `UPDATE auth_sessions
           SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP),
               revocation_reason = COALESCE(
                 revocation_reason,
                 'USER_LOGOUT'
               )
           WHERE id = $1 AND usuario_id = $2`,
          [decoded.jti, decoded.sub]
        )
      } catch (error) {
        clearSessionCookie(res)
        return next(error)
      }
    }
  }

  clearSessionCookie(res)
  res.status(204).end()
}

const changePassword = async (req, res, next) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const userResult = await client.query(
      'SELECT id, senha FROM usuarios WHERE id = $1 FOR UPDATE',
      [req.usuario.id]
    )
    const passwordValid = await bcrypt.compare(
      req.body.senha_atual,
      userResult.rows[0]?.senha || DUMMY_PASSWORD_HASH
    )

    if (!passwordValid) {
      await client.query('ROLLBACK')
      writeSecurityLog('warn', 'password_change_reauthentication_failure', {
        requestId: req.id,
        userId: req.usuario.id,
        ip: req.ip,
      })
      return res.status(401).json({ erro: 'Credencial atual inválida' })
    }

    const passwordHash = await bcrypt.hash(
      req.body.nova_senha,
      PASSWORD_COST
    )
    await client.query(
      `UPDATE usuarios
       SET senha = $1,
           credentials_changed_at = CURRENT_TIMESTAMP,
           failed_login_attempts = 0,
           locked_until = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [passwordHash, req.usuario.id]
    )
    await client.query(
      `UPDATE auth_sessions
       SET revoked_at = CURRENT_TIMESTAMP,
           revocation_reason = 'PASSWORD_CHANGED'
       WHERE usuario_id = $1 AND revoked_at IS NULL`,
      [req.usuario.id]
    )
    await client.query('COMMIT')

    clearSessionCookie(res)
    writeSecurityLog('info', 'password_changed', {
      requestId: req.id,
      userId: req.usuario.id,
      ip: req.ip,
    })
    return res.json({
      mensagem: 'Senha alterada. Entre novamente em todos os dispositivos.',
    })
  } catch (error) {
    next(await rollbackTransaction(client, error))
  } finally {
    client.release()
  }
}

module.exports = {
  changePassword,
  login,
  logout,
  me,
  register,
  registerStaff,
  verifyMfa,
}
