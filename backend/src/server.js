require('dotenv').config()

const app = require('./app')
const pool = require('./config/db')
const config = require('./config/env')
const {
  configureHttpServer,
  createShutdownController,
} = require('./services/serverLifecycle')

const emitLifecycleEvent = (level, event, details = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    schemaVersion: 1,
    service: 'clinicalmed-api',
    level,
    event,
    ...details,
  }
  const output = JSON.stringify(entry)

  if (level === 'error' || level === 'warn') console.error(output)
  else console.log(output)
}

const verifyDatabase = async () => {
  const client = await pool.connect()
  try {
    await client.query('SELECT 1')
  } finally {
    client.release()
  }
}

const listen = () =>
  new Promise((resolve, reject) => {
    const server = configureHttpServer(app.listen(config.port))
    server.once('listening', () => resolve(server))
    server.once('error', reject)
  })

const run = async () => {
  await verifyDatabase()
  const server = await listen()
  const shutdown = createShutdownController({
    server,
    pool,
    emit: emitLifecycleEvent,
  })

  server.on('clientError', (error, socket) => {
    emitLifecycleEvent('warn', 'malformed_http_request', {
      errorCode: error.code || 'unknown',
    })
    if (socket.writable) {
      socket.end(
        'HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n'
      )
    } else {
      socket.destroy()
    }
  })

  process.once('SIGTERM', () => void shutdown('SIGTERM', 0))
  process.once('SIGINT', () => void shutdown('SIGINT', 0))
  process.once('uncaughtException', (error) => {
    emitLifecycleEvent('error', 'uncaught_exception', {
      errorName: error.name,
    })
    void shutdown('uncaught_exception', 1)
  })
  process.once('unhandledRejection', (reason) => {
    emitLifecycleEvent('error', 'unhandled_rejection', {
      errorName: reason?.name || 'UnhandledRejection',
    })
    void shutdown('unhandled_rejection', 1)
  })

  emitLifecycleEvent('info', 'server_started', {
    port: config.port,
    environment: config.nodeEnv,
  })
}

run().catch(async (error) => {
  emitLifecycleEvent('error', 'server_startup_failure', {
    errorName: error.name,
    errorCode: error.code || 'unknown',
  })
  process.exitCode = 1
  await pool.end().catch(() => {})
})
