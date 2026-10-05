const assert = require('node:assert/strict')
const { decryptField } = require('../src/utils/dataProtection')
const { generateTotp } = require('../src/utils/totp')

const parseResponse = async (response) => {
  const text = await response.text()
  return {
    response,
    body: text ? JSON.parse(text) : null,
  }
}

const post = (baseUrl, origin, pathname, body) =>
  fetch(`${baseUrl}${pathname}`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      origin,
    },
    body: JSON.stringify(body),
  }).then(parseResponse)

const loginWithMfa = async ({
  baseUrl,
  origin,
  email,
  password,
  pool,
}) => {
  let result = await post(baseUrl, origin, '/auth/login', {
    email,
    senha: password,
  })

  if (result.response.status !== 202) return result

  let secret = result.body.secret
  if (!secret) {
    const userResult = await pool.query(
      `SELECT id, mfa_secret
       FROM usuarios
       WHERE lower(email) = lower($1)`,
      [email]
    )
    assert.equal(userResult.rows.length, 1)
    secret = decryptField('mfa_secret', userResult.rows[0].mfa_secret)

    // As contas são exclusivamente de demonstração e podem autenticar várias
    // vezes no mesmo intervalo de 30 segundos durante a regressão.
    await pool.query(
      'UPDATE usuarios SET mfa_last_counter = NULL WHERE id = $1',
      [userResult.rows[0].id]
    )
  }

  result = await post(baseUrl, origin, '/auth/mfa/verify', {
    challenge_id: result.body.challenge_id,
    codigo: generateTotp(secret),
  })
  return result
}

const resetDemoMfa = async (pool) => {
  const demoUsers = await pool.query(
    `SELECT id
     FROM usuarios
     WHERE email LIKE 'demo.seed.%@clinicalmed.local'`
  )
  const ids = demoUsers.rows.map((row) => row.id)
  if (ids.length === 0) return

  await pool.query(
    `UPDATE auth_sessions
     SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP),
         revocation_reason = COALESCE(revocation_reason, 'TEST_CLEANUP')
     WHERE usuario_id = ANY($1::int[])`,
    [ids]
  )
  await pool.query(
    'DELETE FROM auth_mfa_challenges WHERE usuario_id = ANY($1::int[])',
    [ids]
  )
  await pool.query(
    'DELETE FROM auth_mfa_recovery_codes WHERE usuario_id = ANY($1::int[])',
    [ids]
  )
  await pool.query(
    `UPDATE usuarios
     SET mfa_enabled = false,
         mfa_secret = NULL,
         mfa_last_counter = NULL,
         failed_login_attempts = 0,
         locked_until = NULL
     WHERE id = ANY($1::int[])`,
    [ids]
  )
}

module.exports = { loginWithMfa, resetDemoMfa }
