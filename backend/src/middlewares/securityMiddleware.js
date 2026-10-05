const crypto = require('crypto')
const os = require('os')
const rateLimit = require('express-rate-limit')
const config = require('../config/env')
const ApplicationError = require('../errors/ApplicationError')
const { getClientIp, writeSecurityLog } = require('../utils/securityLogger')

const SAFE_REQUEST_ID = /^[A-Za-z0-9_-]{8,64}$/

const requestIdMiddleware = (req, res, next) => {
  const suppliedRequestId = req.get('x-request-id')
  req.id =
    suppliedRequestId && SAFE_REQUEST_ID.test(suppliedRequestId)
      ? suppliedRequestId
      : crypto.randomUUID()
  res.setHeader('x-request-id', req.id)
  next()
}

const secureResponseHeaders = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  )
  next()
}

const httpsOnlyMiddleware = (req, res, next) => {
  if (config.isProduction && !req.secure) {
    return res.status(400).json({
      erro: 'HTTPS obrigatório',
      request_id: req.id,
    })
  }

  next()
}

const allowedHttpMethodsMiddleware = (req, res, next) => {
  const allowedMethods = new Set([
    'GET',
    'HEAD',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
  ])

  if (!allowedMethods.has(req.method)) {
    res.setHeader('Allow', [...allowedMethods].join(', '))
    return res.status(405).json({ erro: 'Método HTTP não permitido' })
  }

  next()
}

const isPrivateDevelopmentOrigin = (origin) => {
  if (config.isProduction || !origin) return false

  try {
    const url = new URL(origin)
    const hostname = url.hostname.toLowerCase()
    const localHostname = os.hostname().toLowerCase()
    const validPort = ['4173', '5173', '5174'].includes(url.port)
    const localAddress =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]' ||
      hostname === '::1' ||
      hostname === localHostname ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(hostname)

    return url.protocol === 'http:' && validPort && localAddress
  } catch {
    return false
  }
}

const isAllowedOrigin = (origin) =>
  !origin ||
  config.corsOrigins.includes(origin) ||
  isPrivateDevelopmentOrigin(origin)

const corsOptions = {
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Requested-With'],
  maxAge: 600,
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true)
      return
    }

    const error = new ApplicationError('Origem não permitida', {
      status: 403,
      publicMessage: 'Origem da requisição não permitida',
      code: 'CORS_ORIGIN_REJECTED',
      alreadyLogged: true,
    })
    writeSecurityLog('warn', 'cors_origin_rejected', {
      origin,
    })
    callback(error)
  },
}

const csrfOriginGuard = (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next()
  }

  const origin = req.get('origin')
  const usesSessionCookie = Boolean(req.cookies?.[config.jwt.cookieName])

  if ((usesSessionCookie && !origin) || !isAllowedOrigin(origin)) {
    writeSecurityLog('warn', 'csrf_origin_rejected', {
      requestId: req.id,
      origin: origin || 'missing',
      ip: getClientIp(req),
    })

    return res.status(403).json({ erro: 'Origem da requisição não permitida' })
  }

  next()
}

const createRateLimitHandler = (event) => (req, res) => {
  writeSecurityLog('warn', event, {
    requestId: req.id,
    ip: getClientIp(req),
    path: req.originalUrl?.split('?')[0],
  })

  res.status(429).json({
    erro: 'Muitas tentativas. Aguarde antes de tentar novamente.',
  })
}

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: createRateLimitHandler('authentication_rate_limit'),
})

const mfaRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: createRateLimitHandler('mfa_rate_limit'),
})

const registrationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: createRateLimitHandler('registration_rate_limit'),
})

const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) =>
    req.method === 'OPTIONS' ||
    req.path === '/health' ||
    req.path === '/ready',
  handler: createRateLimitHandler('api_rate_limit'),
})

module.exports = {
  allowedHttpMethodsMiddleware,
  apiRateLimiter,
  corsOptions,
  csrfOriginGuard,
  httpsOnlyMiddleware,
  loginRateLimiter,
  mfaRateLimiter,
  registrationRateLimiter,
  requestIdMiddleware,
  secureResponseHeaders,
}
