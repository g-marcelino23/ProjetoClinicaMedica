const assert = require('node:assert/strict')
const test = require('node:test')
const ApplicationError = require('../src/errors/ApplicationError')
const {
  classifyException,
} = require('../src/domain/exceptionPolicy')
const {
  HTTP_LIMITS,
  configureHttpServer,
  createShutdownController,
} = require('../src/services/serverLifecycle')
const {
  rollbackTransaction,
} = require('../src/services/transactionService')

test('erro desconhecido falha fechado sem expor mensagem interna', () => {
  const error = new Error(
    'password=secret; SELECT * FROM usuarios; C:\\internal\\server.js'
  )
  error.status = 418
  error.publicMessage = error.message
  const result = classifyException(error)

  assert.equal(result.status, 500)
  assert.equal(result.publicMessage, 'Erro interno do servidor')
  assert.doesNotMatch(result.publicMessage, /secret|SELECT|internal/)
})

test('somente erro operacional explícito mantém status e mensagem pública', () => {
  const error = new ApplicationError('Detalhe interno', {
    status: 403,
    publicMessage: 'Operação não permitida',
    code: 'ACCESS_CONTROL_FAILURE',
  })
  const result = classifyException(error)

  assert.equal(result.status, 403)
  assert.equal(result.publicMessage, 'Operação não permitida')
  assert.equal(result.event, 'access_control_failure')
})

test('JSON inválido e payload excedido recebem respostas distintas', () => {
  const malformed = classifyException({
    type: 'entity.parse.failed',
    message: 'Unexpected token containing input',
  })
  const oversized = classifyException({
    type: 'entity.too.large',
    message: 'request entity too large',
  })

  assert.deepEqual(
    {
      status: malformed.status,
      message: malformed.publicMessage,
    },
    { status: 400, message: 'Corpo JSON inválido' }
  )
  assert.deepEqual(
    {
      status: oversized.status,
      message: oversized.publicMessage,
    },
    {
      status: 413,
      message: 'Corpo da requisição excede o limite permitido',
    }
  )
})

test('timeout, concorrência, integridade e privilégio falham com segurança', () => {
  const timeout = classifyException({ code: '57014' })
  const deadlock = classifyException({ code: '40P01' })
  const conflict = classifyException({ code: '23505' })
  const privilege = classifyException({
    code: '42501',
    message: 'permission denied for secret_table',
  })

  assert.equal(timeout.status, 503)
  assert.equal(timeout.retryAfterSeconds, 5)
  assert.equal(deadlock.status, 409)
  assert.equal(deadlock.retryAfterSeconds, 1)
  assert.equal(conflict.status, 409)
  assert.equal(privilege.status, 500)
  assert.doesNotMatch(privilege.publicMessage, /permission|secret_table/)
})

test('rollback bem-sucedido preserva o erro original', async () => {
  const queries = []
  const client = {
    query: async (sql) => {
      queries.push(sql)
    },
  }
  const original = new Error('Falha da operação')

  const result = await rollbackTransaction(client, original)

  assert.equal(result, original)
  assert.deepEqual(queries, ['ROLLBACK'])
})

test('falha do rollback é escalada e nunca tratada como sucesso', async () => {
  const client = {
    query: async () => {
      throw new Error('Conexão perdida durante rollback')
    },
  }
  const result = await rollbackTransaction(
    client,
    new Error('Falha da operação')
  )
  const classification = classifyException(result)

  assert.equal(result.name, 'TransactionRollbackError')
  assert.equal(classification.status, 500)
  assert.equal(classification.event, 'transaction_rollback_failure')
})

test('servidor HTTP recebe limites finitos e coerentes', () => {
  const server = {}
  configureHttpServer(server)

  assert.equal(server.requestTimeout, HTTP_LIMITS.requestTimeoutMs)
  assert.equal(server.headersTimeout, HTTP_LIMITS.headersTimeoutMs)
  assert.equal(server.keepAliveTimeout, HTTP_LIMITS.keepAliveTimeoutMs)
  assert.equal(server.maxHeadersCount, HTTP_LIMITS.maxHeadersCount)
  assert.equal(
    server.maxRequestsPerSocket,
    HTTP_LIMITS.maxRequestsPerSocket
  )
  assert.ok(server.headersTimeout < server.requestTimeout)
  assert.ok(server.keepAliveTimeout < server.requestTimeout)
})

test('encerramento é idempotente, fecha HTTP e banco antes de sair', async () => {
  const actions = []
  const server = {
    close: (callback) => {
      actions.push('http-close')
      callback()
    },
    closeIdleConnections: () => actions.push('idle-close'),
  }
  const pool = {
    end: async () => actions.push('pool-close'),
  }
  const shutdown = createShutdownController({
    server,
    pool,
    emit: (_level, event) => actions.push(event),
    exit: (code) => actions.push(`exit-${code}`),
    timeoutMs: 100,
  })

  const first = shutdown('SIGTERM', 0)
  const second = shutdown('SIGTERM', 0)
  assert.equal(first, second)
  await first

  assert.equal(actions.filter((item) => item === 'http-close').length, 1)
  assert.ok(actions.indexOf('http-close') < actions.indexOf('pool-close'))
  assert.ok(actions.indexOf('pool-close') < actions.indexOf('exit-0'))
})
