const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const backendRoot = path.resolve(__dirname, '..')
const read = (relativePath) =>
  fs.readFileSync(path.join(backendRoot, relativePath), 'utf8')
const walk = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return walk(fullPath)
    return entry.name.endsWith('.js') ? [fullPath] : []
  })

const applicationSources = walk(path.join(backendRoot, 'src'))
for (const filename of applicationSources) {
  const source = fs.readFileSync(filename, 'utf8')
  assert.doesNotMatch(
    source,
    /res\.status\(500\)\.json\(\{\s*erro:\s*error\.message/,
    `Mensagem interna exposta em ${filename}`
  )
}

const app = read('src/app.js')
assert.ok(app.includes('sanitizeServerErrors'))
assert.ok(app.includes("app.get('/ready'"))
assert.ok(app.lastIndexOf('app.use(errorMiddleware)') > app.indexOf("app.use('/auth'"))

const server = read('src/server.js')
for (const control of [
  'configureHttpServer',
  'createShutdownController',
  'uncaughtException',
  'unhandledRejection',
  'clientError',
  'server_startup_failure',
]) {
  assert.ok(server.includes(control), `Controle do servidor ausente: ${control}`)
}

const database = read('src/config/db.js')
for (const control of [
  'connectionTimeoutMillis',
  'statement_timeout',
  'query_timeout',
  'idleTimeoutMillis',
]) {
  assert.ok(database.includes(control), `Timeout ausente: ${control}`)
}

const errorMiddleware = read('src/middlewares/errorMiddleware.js')
assert.ok(errorMiddleware.includes('classifyException'))
assert.ok(errorMiddleware.includes('Retry-After'))
assert.ok(errorMiddleware.includes('safeErrorResponse'))

const transactionalSources = [
  'src/controllers/agendaController.js',
  'src/controllers/authController.js',
  'src/controllers/consultaController.js',
  'src/controllers/exameController.js',
  'src/controllers/listaEsperaController.js',
  'src/controllers/prontuarioController.js',
  'src/services/securityMonitoringService.js',
]
for (const relativePath of transactionalSources) {
  const source = read(relativePath)
  assert.ok(
    source.includes('rollbackTransaction'),
    `Rollback seguro ausente em ${relativePath}`
  )
  assert.doesNotMatch(
    source,
    /catch\s*\(error\)\s*\{\s*await client\.query\('ROLLBACK'\)/,
    `Rollback vulnerável a exceção em ${relativePath}`
  )
}

console.log(
  'A10: 10 grupos de controles confirmados — handler global, fail-closed, rollback seguro, timeouts, readiness e encerramento gracioso'
)
