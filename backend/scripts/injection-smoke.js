require('dotenv').config({ quiet: true })

const assert = require('node:assert/strict')
const pool = require('../src/config/db')
const { CIPHERTEXT_PREFIX } = require('../src/utils/dataProtection')
const { loginWithMfa, resetDemoMfa } = require('./smoke-auth')

const baseUrl = process.env.INJECTION_SMOKE_URL || 'http://127.0.0.1:3001'
const origin = process.env.INJECTION_SMOKE_ORIGIN || 'http://localhost:5173'
const demoPassword = process.env.DEMO_PASSWORD

const request = async (pathname, options = {}) => {
  const response = await fetch(`${baseUrl}${pathname}`, options)
  const text = await response.text()
  return {
    status: response.status,
    headers: response.headers,
    body: text ? JSON.parse(text) : null,
  }
}

const loginAsDemoSecretary = async () => {
  const result = await pool.query(
    `SELECT u.id, u.email
     FROM usuarios u
     JOIN secretarios s ON s.usuario_id = u.id
     WHERE u.email LIKE 'demo.seed.%@clinicalmed.local'
       AND u.ativo = true
     ORDER BY u.id
     LIMIT 1`
  )
  assert.equal(result.rows.length, 1, 'Secretário de demonstração não encontrado')

  const authenticated = await loginWithMfa({
    baseUrl,
    origin,
    email: result.rows[0].email,
    password: demoPassword,
    pool,
  })
  assert.equal(authenticated.response.status, 200)
  const cookie = authenticated.response.headers
    .get('set-cookie')
    ?.split(';')[0]
  assert.ok(cookie)

  return { cookie, userId: result.rows[0].id }
}

const authenticatedRequest = (cookie, pathname, options = {}) =>
  request(pathname, {
    ...options,
    headers: {
      cookie,
      origin,
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...options.headers,
    },
  })

const run = async () => {
  const usersBefore = await pool.query(
    'SELECT COUNT(*)::int AS total FROM usuarios'
  )
  const secretary = await loginAsDemoSecretary()

  const attacks = [
    await request('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin },
      body: JSON.stringify({
        email: "' OR 1=1--",
        senha: "' OR 1=1--",
      }),
    }),
    await authenticatedRequest(
      secretary.cookie,
      `/relatorios/consultas?status=${encodeURIComponent(
        "REALIZADA' OR '1'='1"
      )}`
    ),
    await authenticatedRequest(
      secretary.cookie,
      `/relatorios/exames?data_inicial=${encodeURIComponent(
        "2026-01-01' OR 1=1--"
      )}`
    ),
    await authenticatedRequest(
      secretary.cookie,
      '/relatorios/consultas?ordenar_por=id%3BDROP%20TABLE%20usuarios'
    ),
    await authenticatedRequest(
      secretary.cookie,
      '/indicadores?data_final=2026-01-01%27%20OR%201%3D1--'
    ),
    await authenticatedRequest(
      secretary.cookie,
      '/pacientes/1%20OR%201%3D1'
    ),
    await authenticatedRequest(
      secretary.cookie,
      '/medicos/1%3BDELETE%20FROM%20usuarios'
    ),
  ]

  for (const attack of attacks) {
    assert.equal(attack.status, 400)
  }

  const validFilteredQueries = [
    await authenticatedRequest(
      secretary.cookie,
      '/relatorios/consultas?data_inicial=2026-01-01&data_final=2026-12-31&status=REALIZADA'
    ),
    await authenticatedRequest(
      secretary.cookie,
      '/relatorios/exames?data_inicial=2026-01-01&data_final=2026-12-31&status=ENTREGUE'
    ),
    await authenticatedRequest(
      secretary.cookie,
      '/relatorios/atendimentos-medico?data_inicial=2026-01-01&data_final=2026-12-31'
    ),
    await authenticatedRequest(
      secretary.cookie,
      '/indicadores?data_inicial=2026-01-01&data_final=2026-12-31'
    ),
  ]
  for (const validQuery of validFilteredQueries) {
    assert.equal(validQuery.status, 200)
  }

  const xssTitle = '<img src=x onerror=globalThis.__clinicalmed_xss=1>'
  const xssMessage = '</script><script>globalThis.__clinicalmed_xss=1</script>'
  const notification = await authenticatedRequest(
    secretary.cookie,
    '/notificacoes',
    {
      method: 'POST',
      body: JSON.stringify({
        usuario_id: secretary.userId,
        titulo: xssTitle,
        mensagem: xssMessage,
        tipo: 'INFO',
      }),
    }
  )
  assert.equal(notification.status, 201)
  assert.equal(notification.body.notificacao.titulo, xssTitle)
  assert.equal(notification.body.notificacao.mensagem, xssMessage)

  const storedNotification = await pool.query(
    'SELECT titulo, mensagem FROM notificacoes WHERE id = $1',
    [notification.body.notificacao.id]
  )
  assert.match(
    storedNotification.rows[0].titulo,
    new RegExp(`^${CIPHERTEXT_PREFIX.replaceAll('.', '\\.')}\\.`)
  )
  assert.match(
    storedNotification.rows[0].mensagem,
    new RegExp(`^${CIPHERTEXT_PREFIX.replaceAll('.', '\\.')}\\.`)
  )
  await pool.query('DELETE FROM notificacoes WHERE id = $1', [
    notification.body.notificacao.id,
  ])

  const hostileRequestId = "'OR1--<script>"
  const requestIdResponse = await request('/health', {
    headers: { 'x-request-id': hostileRequestId },
  })
  assert.equal(requestIdResponse.status, 200)
  assert.notEqual(
    requestIdResponse.headers.get('x-request-id'),
    hostileRequestId
  )
  assert.match(
    requestIdResponse.headers.get('x-request-id'),
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  )

  const usersAfter = await pool.query(
    'SELECT COUNT(*)::int AS total FROM usuarios'
  )
  assert.equal(usersAfter.rows[0].total, usersBefore.rows[0].total)

  console.log(
    JSON.stringify({
      status: 'ok',
      injectionPayloadsRejected: attacks.length,
      validFilteredQueriesAccepted: validFilteredQueries.length,
      parameterPollutionRejected: true,
      storedPayloadRemainedData: true,
      sensitivePayloadEncryptedAtRest: true,
      hostileRequestIdReplaced: true,
      databaseUserCountUnchanged: true,
    })
  )
}

run()
  .catch((error) => {
    console.error(`Smoke test A05 falhou: ${error.message}`)
    process.exitCode = 1
  })
  .finally(async () => {
    await resetDemoMfa(pool)
    await pool.end()
  })
