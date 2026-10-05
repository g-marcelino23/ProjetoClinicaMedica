const assert = require('node:assert/strict')
const http = require('node:http')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const baseUrl = process.env.CONFIG_SMOKE_URL || 'http://127.0.0.1:3001'
const allowedOrigin =
  process.env.CONFIG_SMOKE_ORIGIN || 'http://localhost:5173'
const backendDirectory = path.resolve(__dirname, '..')

const rawRequest = (pathname, method = 'GET', headers = {}, body = null) =>
  new Promise((resolve, reject) => {
    const target = new URL(pathname, baseUrl)
    const request = http.request(
      target,
      { method, headers },
      (response) => {
        let responseBody = ''
        response.setEncoding('utf8')
        response.on('data', (chunk) => {
          responseBody += chunk
        })
        response.on('end', () => {
          resolve({
            status: response.statusCode,
            headers: response.headers,
            body: responseBody,
          })
        })
      }
    )

    request.on('error', reject)
    if (body) request.write(body)
    request.end()
  })

const assertSafeBody = (body, label) => {
  assert.doesNotMatch(body, /(?:node_modules|[A-Z]:\\|\/src\/|at\s+\w+\s*\()/i, label)
}

const runConfigCheck = (overrides, shouldSucceed, label) => {
  const strongSecret =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_'
  const baseEnvironment = {
    ...process.env,
    NODE_ENV: 'production',
    PORT: '3001',
    DB_HOST: 'database.internal',
    DB_PORT: '5432',
    DB_NAME: 'clinicalmed',
    DB_USER: 'clinicalmed_app',
    DB_PASSWORD: 'Senha-Banco-Forte-Exclusiva-2026!',
    DB_SSL: 'true',
    DB_SSL_REJECT_UNAUTHORIZED: 'true',
    JWT_SECRET: strongSecret,
    SESSION_ABSOLUTE_MINUTES: '15',
    SESSION_IDLE_MINUTES: '5',
    SESSION_MAX_CONCURRENT: '3',
    MFA_REQUIRED_PROFILES: 'PACIENTE,MEDICO,SECRETARIO',
    DATA_ENCRYPTION_KEY_ID: '2026-01',
    DATA_ENCRYPTION_KEY:
      'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8',
    DATA_ENCRYPTION_PREVIOUS_KEYS: '',
    DATA_INDEX_KEY:
      'Hx4dHBsaGRgXFhUUExIREA8ODQwLCgkIBwYFBAMCAQA',
    CORS_ORIGINS: 'https://clinicalmed.example',
    TRUST_PROXY: '1',
    ...overrides,
  }
  const result = spawnSync(
    process.execPath,
    ['-e', "require('./src/config/env')"],
    {
      cwd: backendDirectory,
      env: baseEnvironment,
      encoding: 'utf8',
    }
  )

  assert.equal(
    result.status === 0,
    shouldSucceed,
    `${label}: ${result.stderr || result.stdout}`
  )
}

const run = async () => {
  const health = await rawRequest('/health')
  assert.equal(health.status, 200)
  assert.equal(health.headers['x-content-type-options'], 'nosniff')
  assert.equal(health.headers['x-frame-options'], 'DENY')
  assert.equal(health.headers['referrer-policy'], 'no-referrer')
  assert.match(health.headers['permissions-policy'], /camera=\(\)/)
  assert.match(health.headers['cache-control'], /no-store/)
  assert.match(health.headers['content-security-policy'], /default-src 'none'/)
  assert.match(health.headers['content-security-policy'], /frame-ancestors 'none'/)
  assert.equal(health.headers['x-powered-by'], undefined)
  assert.equal(health.headers.etag, undefined)

  const unsupportedMethod = await rawRequest('/health', 'TRACE')
  assert.equal(unsupportedMethod.status, 405)
  assert.match(unsupportedMethod.headers.allow, /GET/)

  const malformedJson = await rawRequest(
    '/auth/login',
    'POST',
    {
      'content-type': 'application/json',
      origin: allowedOrigin,
    },
    '{"email":'
  )
  assert.equal(malformedJson.status, 400)
  assertSafeBody(malformedJson.body, 'JSON malformado expôs detalhes internos')
  const malformedBody = JSON.parse(malformedJson.body)
  assert.equal(malformedBody.erro, 'Corpo JSON inválido')
  assert.ok(malformedBody.request_id)

  const missingRoute = await rawRequest('/.git/config')
  assert.equal(missingRoute.status, 404)
  assertSafeBody(missingRoute.body, 'Rota inexistente expôs detalhes internos')

  runConfigCheck({}, true, 'Configuração segura de produção')
  runConfigCheck({ TRUST_PROXY: 'true' }, false, 'Proxy genérico')
  runConfigCheck({ TRUST_PROXY: 'false' }, false, 'Proxy ausente')
  runConfigCheck({ DB_SSL: 'false' }, false, 'Banco sem TLS')
  runConfigCheck(
    { DB_SSL_REJECT_UNAUTHORIZED: 'false' },
    false,
    'Certificado do banco sem validação'
  )
  runConfigCheck(
    { JWT_SECRET: 'k'.repeat(48) },
    false,
    'Segredo JWT sem entropia'
  )
  runConfigCheck(
    { DATA_ENCRYPTION_KEY: 'chave-invalida' },
    false,
    'Chave de criptografia inválida'
  )
  runConfigCheck(
    { DATA_INDEX_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' },
    false,
    'Chave sem entropia'
  )
  runConfigCheck(
    {
      JWT_SECRET:
        'substitua-por-um-segredo-aleatorio-com-ao-menos-32-caracteres',
    },
    false,
    'Segredo JWT de exemplo'
  )
  runConfigCheck(
    { DB_PASSWORD: 'use-uma-senha-forte-e-exclusiva' },
    false,
    'Senha de banco de exemplo'
  )
  runConfigCheck({ DB_USER: 'postgres' }, false, 'Superusuário do banco')
  runConfigCheck(
    { CORS_ORIGINS: 'http://clinicalmed.example' },
    false,
    'CORS sem HTTPS'
  )
  runConfigCheck({ CORS_ORIGINS: '*' }, false, 'CORS curinga')
  runConfigCheck(
    {
      SESSION_ABSOLUTE_MINUTES: '15',
      SESSION_IDLE_MINUTES: '15',
    },
    false,
    'Sessão sem expiração por inatividade'
  )
  runConfigCheck(
    { SESSION_MAX_CONCURRENT: '0' },
    false,
    'Limite de sessões concorrentes inválido'
  )
  runConfigCheck(
    { MFA_REQUIRED_PROFILES: '' },
    false,
    'MFA obrigatório ausente'
  )

  console.log(
    JSON.stringify({
      status: 'ok',
      apiHeadersVerified: 8,
      unsafeProductionConfigurationsBlocked: 15,
      excessiveErrorsSanitized: true,
      unsupportedMethodsBlocked: true,
      hiddenFilesNotExposed: true,
    })
  )
}

run().catch((error) => {
  console.error(`Smoke test de configuração falhou: ${error.message}`)
  process.exitCode = 1
})
