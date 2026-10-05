const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const helmet = require('helmet')
const config = require('./config/env')
const pool = require('./config/db')
const {
  allowedHttpMethodsMiddleware,
  apiRateLimiter,
  corsOptions,
  csrfOriginGuard,
  httpsOnlyMiddleware,
  requestIdMiddleware,
  secureResponseHeaders,
} = require('./middlewares/securityMiddleware')
const {
  errorMiddleware,
  notFoundMiddleware,
  sanitizeServerErrors,
} = require('./middlewares/errorMiddleware')
const { securityAuditMiddleware } = require('./utils/securityLogger')
const dataProtectionResponseMiddleware = require('./middlewares/dataProtectionMiddleware')

const app = express()

app.disable('x-powered-by')
app.disable('etag')
app.set('trust proxy', config.trustProxy)
app.use(requestIdMiddleware)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'no-referrer' },
  })
)
app.use(secureResponseHeaders)
app.use(httpsOnlyMiddleware)
app.use(allowedHttpMethodsMiddleware)
app.use(cors(corsOptions))
app.use(express.json({ limit: '100kb', strict: true }))
app.use(cookieParser())
app.use(csrfOriginGuard)
app.use(dataProtectionResponseMiddleware)
app.use(sanitizeServerErrors)
app.use(securityAuditMiddleware)
app.use(apiRateLimiter)

const authRoutes = require('./routes/authRoutes')
const pacienteRoutes = require('./routes/pacienteRoutes')
const medicoRoutes = require('./routes/medicoRoutes')
const agendaRoutes = require('./routes/agendaRoutes')
const consultaRoutes = require('./routes/consultaRoutes')
const prontuarioRoutes = require('./routes/prontuarioRoutes')
const prescricaoRoutes = require('./routes/prescricaoRoutes')
const exameRoutes = require('./routes/exameRoutes')
const portalPacienteRoutes = require('./routes/portalPacienteRoutes')
const notificacaoRoutes = require('./routes/notificacaoRoutes')
const listaEsperaRoutes = require('./routes/listaEsperaRoutes')
const dashboardRoutes = require('./routes/dashboardRoutes')
const relatorioRoutes = require('./routes/relatorioRoutes')
const indicadorRoutes = require('./routes/indicadorRoutes')

app.use('/auth', authRoutes)
app.use('/pacientes', pacienteRoutes)
app.use('/medicos', medicoRoutes)
app.use('/agendas', agendaRoutes)
app.use('/consultas', consultaRoutes)
app.use('/prontuarios', prontuarioRoutes)
app.use('/prescricoes', prescricaoRoutes)
app.use('/exames', exameRoutes)
app.use('/portal/paciente', portalPacienteRoutes)
app.use('/notificacoes', notificacaoRoutes)
app.use('/lista-espera', listaEsperaRoutes)
app.use('/dashboard', dashboardRoutes)
app.use('/relatorios', relatorioRoutes)
app.use('/indicadores', indicadorRoutes)

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.get('/ready', async (req, res, next) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ready' })
  } catch (error) {
    next(error)
  }
})

app.use(notFoundMiddleware)
app.use(errorMiddleware)

module.exports = app
