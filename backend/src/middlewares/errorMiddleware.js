const { writeSecurityLog } = require('../utils/securityLogger')
const {
  classifyException,
} = require('../domain/exceptionPolicy')

const notFoundMiddleware = (req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada' })
}

const sanitizeServerErrors = (req, res, next) => {
  const originalJson = res.json.bind(res)

  res.json = (body) => {
    if (res.statusCode >= 500 && !res.locals.safeErrorResponse) {
      return originalJson({
        erro: 'Erro interno do servidor',
        request_id: req.id,
      })
    }

    return originalJson(body)
  }

  next()
}

const errorMiddleware = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error)
  }

  const classification = classifyException(error)

  if (!error.alreadyLogged) {
    writeSecurityLog(classification.level, classification.event, {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl?.split('?')[0],
      status: classification.status,
      errorName: error.name,
      errorCode: error.code || 'unknown',
      ip: req.ip,
    })
  }

  if (classification.retryAfterSeconds) {
    res.setHeader(
      'Retry-After',
      String(classification.retryAfterSeconds)
    )
  }

  res.locals.safeErrorResponse = true
  res.status(classification.status).json({
    erro: classification.publicMessage,
    request_id: req.id,
  })
}

module.exports = {
  errorMiddleware,
  notFoundMiddleware,
  sanitizeServerErrors,
}
