const { protectObject } = require('../utils/dataProtection')
const {
  getClientIp,
  writeSecurityLog,
} = require('../utils/securityLogger')

const findUnexpectedFields = (source, parsed, location) =>
  Object.keys(source || {})
    .filter((field) => !Object.hasOwn(parsed, field))
    .map((field) => ({
      campo: `${location}.${field}`,
      mensagem: 'Campo não permitido',
    }))

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body || {},
    params: req.params || {},
    query: req.query || {},
  })

  if (!result.success) {
    writeSecurityLog('warn', 'input_validation_failure', {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl?.split('?')[0],
      status: 400,
      ip: getClientIp(req),
      issueCount: result.error.issues.length,
    })

    return res.status(400).json({
      erro: 'Dados inválidos',
      campos: result.error.issues.map((issue) => ({
        campo: issue.path.join('.'),
        mensagem: issue.message,
      })),
    })
  }

  const unexpectedFields = [
    ...findUnexpectedFields(req.body, result.data.body, 'body'),
    ...findUnexpectedFields(req.params, result.data.params, 'params'),
    ...findUnexpectedFields(req.query, result.data.query, 'query'),
  ]

  if (unexpectedFields.length > 0) {
    writeSecurityLog('warn', 'input_validation_failure', {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl?.split('?')[0],
      status: 400,
      ip: getClientIp(req),
      issueCount: unexpectedFields.length,
      reason: 'unexpected_fields',
    })

    return res.status(400).json({
      erro: 'Dados inválidos',
      campos: unexpectedFields,
    })
  }

  req.body = protectObject(result.data.body)
  req.params = result.data.params
  req.query = result.data.query
  next()
}

module.exports = validate
