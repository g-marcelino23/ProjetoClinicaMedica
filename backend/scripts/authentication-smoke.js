require('dotenv').config({ quiet: true })

const assert = require('node:assert/strict')
const pool = require('../src/config/db')
const { generateTotp } = require('../src/utils/totp')

const baseUrl =
  process.env.AUTHENTICATION_SMOKE_URL || 'http://127.0.0.1:3001'
const origin =
  process.env.AUTHENTICATION_SMOKE_ORIGIN || 'http://localhost:5173'
const email = `a07.${Date.now()}.${Math.random().toString(16).slice(2)}@example.invalid`
const originalPassword = 'Frase longa e exclusiva para teste #2026'
const newPassword = 'Outra frase longa e exclusiva para teste #2027'
const cpf = `${String(Date.now()).slice(-9)}00`
const formattedCpf = `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`

let userId = null
let patientId = null

const request = async (pathname, options = {}) => {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      accept: 'application/json',
      origin,
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  const text = await response.text()
  return {
    status: response.status,
    headers: response.headers,
    body: text ? JSON.parse(text) : null,
  }
}

const post = (pathname, body, cookie = null) =>
  request(pathname, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: cookie ? { cookie } : {},
  })

const login = (password) =>
  post('/auth/login', { email, senha: password })

const verify = (challengeId, code) =>
  post('/auth/mfa/verify', {
    challenge_id: challengeId,
    codigo: code,
  })

const cookieFrom = (response) =>
  response.headers.get('set-cookie')?.split(';')[0]

const cleanup = async () => {
  if (patientId) {
    await pool.query('DELETE FROM pacientes WHERE id = $1', [patientId])
  }
  if (userId) {
    await pool.query('DELETE FROM usuarios WHERE id = $1', [userId])
  }
}

const cleanupStaleArtifacts = async () => {
  await pool.query(
    `DELETE FROM pacientes
     WHERE usuario_id IN (
       SELECT id
       FROM usuarios
       WHERE email LIKE 'a07.%@example.invalid'
     )`
  )
  await pool.query(
    `DELETE FROM usuarios
     WHERE email LIKE 'a07.%@example.invalid'`
  )
}

const run = async () => {
  await cleanupStaleArtifacts()
  const registrationBody = {
    nome: 'Pessoa Teste Autenticação',
    email,
    senha: originalPassword,
    perfil: 'PACIENTE',
    cpf: formattedCpf,
  }
  const firstRegistration = await post('/auth/register', registrationBody)
  const duplicateRegistration = await post('/auth/register', registrationBody)
  assert.equal(firstRegistration.status, 202)
  assert.equal(duplicateRegistration.status, 202)
  assert.deepEqual(duplicateRegistration.body, firstRegistration.body)

  const userResult = await pool.query(
    `SELECT u.id, p.id AS paciente_id
     FROM usuarios u
     JOIN pacientes p ON p.usuario_id = u.id
     WHERE u.email = $1`,
    [email]
  )
  assert.equal(userResult.rows.length, 1)
  userId = userResult.rows[0].id
  patientId = userResult.rows[0].paciente_id

  const unknown = await post('/auth/login', {
    email: `missing.${email}`,
    senha: originalPassword,
  })
  const wrong = await login('Credencial errada mas longa #2026')
  assert.equal(unknown.status, 401)
  assert.equal(wrong.status, 401)
  assert.deepEqual(unknown.body, wrong.body)

  const enrollment = await login(originalPassword)
  assert.equal(enrollment.status, 202)
  assert.equal(enrollment.body.mfa_enrollment_required, true)
  assert.equal(enrollment.headers.get('set-cookie'), null)

  const wrongMfa = await verify(enrollment.body.challenge_id, '000000')
  assert.equal(wrongMfa.status, 401)
  const enrolled = await verify(
    enrollment.body.challenge_id,
    generateTotp(enrollment.body.secret)
  )
  assert.equal(enrolled.status, 200)
  assert.equal(enrolled.body.recovery_codes.length, 10)
  const firstCookie = cookieFrom(enrolled)
  assert.ok(firstCookie)
  assert.match(enrolled.headers.get('set-cookie'), /HttpOnly/i)
  assert.match(enrolled.headers.get('set-cookie'), /SameSite=Strict/i)

  const reusedChallenge = await verify(
    enrollment.body.challenge_id,
    generateTotp(enrollment.body.secret)
  )
  assert.equal(reusedChallenge.status, 401)

  const me = await request('/auth/me', {
    headers: { cookie: firstCookie },
  })
  assert.equal(me.status, 200)
  assert.equal(me.body.usuario.id, userId)

  const bearerOnly = await request('/auth/me', {
    headers: {
      authorization: `Bearer ${firstCookie.split('=')[1]}`,
    },
  })
  assert.equal(bearerOnly.status, 401)

  await pool.query(
    `UPDATE auth_sessions
     SET last_seen_at = CURRENT_TIMESTAMP - INTERVAL '10 minutes'
     WHERE usuario_id = $1 AND revoked_at IS NULL`,
    [userId]
  )
  const replayAfterIdleTimeout = await request('/auth/me', {
    headers: { cookie: firstCookie },
  })
  assert.equal(replayAfterIdleTimeout.status, 401)

  const recoveryChallenge = await login(originalPassword)
  assert.equal(recoveryChallenge.status, 202)
  const recoveryLogin = await verify(
    recoveryChallenge.body.challenge_id,
    enrolled.body.recovery_codes[0]
  )
  assert.equal(recoveryLogin.status, 200)
  const recoveryCookie = cookieFrom(recoveryLogin)
  const logout = await post('/auth/logout', {}, recoveryCookie)
  assert.equal(logout.status, 204)
  const replayAfterLogout = await request('/auth/me', {
    headers: { cookie: recoveryCookie },
  })
  assert.equal(replayAfterLogout.status, 401)

  const reusedRecoveryChallenge = await login(originalPassword)
  const reusedRecovery = await verify(
    reusedRecoveryChallenge.body.challenge_id,
    enrolled.body.recovery_codes[0]
  )
  assert.equal(reusedRecovery.status, 401)

  await pool.query(
    'UPDATE usuarios SET mfa_last_counter = NULL WHERE id = $1',
    [userId]
  )
  const passwordChangeChallenge = await login(originalPassword)
  const passwordChangeLogin = await verify(
    passwordChangeChallenge.body.challenge_id,
    generateTotp(enrollment.body.secret)
  )
  assert.equal(passwordChangeLogin.status, 200)
  const passwordCookie = cookieFrom(passwordChangeLogin)

  const wrongCurrentPassword = await post(
    '/auth/change-password',
    {
      senha_atual: 'Senha atual incorreta e longa #2026',
      nova_senha: newPassword,
    },
    passwordCookie
  )
  assert.equal(wrongCurrentPassword.status, 401)

  const changed = await post(
    '/auth/change-password',
    {
      senha_atual: originalPassword,
      nova_senha: newPassword,
    },
    passwordCookie
  )
  assert.equal(changed.status, 200)
  const replayAfterPasswordChange = await request('/auth/me', {
    headers: { cookie: passwordCookie },
  })
  assert.equal(replayAfterPasswordChange.status, 401)
  assert.equal((await login(originalPassword)).status, 401)
  assert.equal((await login(newPassword)).status, 202)

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const failure = await login('Tentativa incorreta e longa #2026')
    assert.equal(failure.status, 401)
  }
  const locked = await login(newPassword)
  assert.equal(locked.status, 401)
  const lockState = await pool.query(
    `SELECT
       failed_login_attempts,
       locked_until > CURRENT_TIMESTAMP AS bloqueado
     FROM usuarios
     WHERE id = $1`,
    [userId]
  )
  assert.ok(lockState.rows[0].failed_login_attempts >= 5)
  assert.equal(lockState.rows[0].bloqueado, true)

  console.log(
    JSON.stringify({
      status: 'ok',
      enumerationResponsesEquivalent: true,
      mfaEnrollmentRequired: true,
      totpReplayRejected: true,
      recoveryCodeSingleUse: true,
      bearerFallbackRejected: true,
      idleTimeoutEnforced: true,
      logoutRevokedServerSession: true,
      passwordChangeRevokedSessions: true,
      accountBackoffEnforced: true,
    })
  )
}

run()
  .catch((error) => {
    console.error(`Smoke test A07 falhou: ${error.stack || error.message}`)
    process.exitCode = 1
  })
  .finally(async () => {
    try {
      await cleanup()
    } catch (error) {
      console.error(`Falha ao limpar dados A07: ${error.message}`)
      process.exitCode = 1
    }
    await pool.end()
  })
