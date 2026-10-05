const ApplicationError = require('../errors/ApplicationError')

const DATABASE_CONFLICT_CODES = new Set([
  '23503',
  '23505',
  '23514',
  '23P01',
])
const DATABASE_RETRY_CODES = new Set(['40001', '40P01'])
const DEPENDENCY_FAILURE_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ENETUNREACH',
  'ETIMEDOUT',
  '57P01',
  '57P02',
  '57P03',
  '57014',
])

const isBodyParserFailure = (error) =>
  ['entity.parse.failed', 'entity.too.large'].includes(error?.type)

const isIntegrityFailure = (error) =>
  [
    'Integridade do dado protegido não pôde ser confirmada',
    'Formato de dado protegido inválido',
  ].includes(error?.message)

const isDependencyFailure = (error) =>
  DEPENDENCY_FAILURE_CODES.has(error?.code) ||
  /connection terminated|connection timeout|connect econn|timeout exceeded when trying to connect/i.test(
    error?.message || ''
  )

const classifyException = (error) => {
  if (error instanceof ApplicationError && error.isOperational) {
    return {
      status: error.status,
      publicMessage: error.publicMessage,
      event: error.code.toLowerCase(),
      level: error.status >= 500 ? 'error' : 'warn',
      retryAfterSeconds: null,
    }
  }

  if (isBodyParserFailure(error)) {
    const tooLarge = error.type === 'entity.too.large'
    return {
      status: tooLarge ? 413 : 400,
      publicMessage: tooLarge
        ? 'Corpo da requisição excede o limite permitido'
        : 'Corpo JSON inválido',
      event: 'input_validation_failure',
      level: 'warn',
      retryAfterSeconds: null,
    }
  }

  if (isIntegrityFailure(error)) {
    return {
      status: 500,
      publicMessage: 'Erro interno do servidor',
      event: 'data_integrity_failure',
      level: 'error',
      retryAfterSeconds: null,
    }
  }

  if (error?.name === 'TransactionRollbackError') {
    return {
      status: 500,
      publicMessage: 'Erro interno do servidor',
      event: 'transaction_rollback_failure',
      level: 'error',
      retryAfterSeconds: null,
    }
  }

  if (isDependencyFailure(error)) {
    return {
      status: 503,
      publicMessage: 'Serviço temporariamente indisponível',
      event: 'dependency_unavailable',
      level: 'error',
      retryAfterSeconds: 5,
    }
  }

  if (DATABASE_RETRY_CODES.has(error?.code)) {
    return {
      status: 409,
      publicMessage:
        'A operação encontrou um conflito temporário. Tente novamente.',
      event: 'transaction_concurrency_failure',
      level: 'warn',
      retryAfterSeconds: 1,
    }
  }

  if (DATABASE_CONFLICT_CODES.has(error?.code)) {
    return {
      status: 409,
      publicMessage: 'A operação viola uma regra de integridade',
      event: 'data_conflict',
      level: 'warn',
      retryAfterSeconds: null,
    }
  }

  return {
    status: 500,
    publicMessage: 'Erro interno do servidor',
    event: 'unhandled_application_error',
    level: 'error',
    retryAfterSeconds: null,
  }
}

module.exports = {
  classifyException,
  isBodyParserFailure,
  isDependencyFailure,
  isIntegrityFailure,
}
