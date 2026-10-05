const HTTP_LIMITS = Object.freeze({
  requestTimeoutMs: 15_000,
  headersTimeoutMs: 10_000,
  keepAliveTimeoutMs: 5_000,
  socketTimeoutMs: 15_000,
  shutdownTimeoutMs: 10_000,
  maxHeadersCount: 100,
  maxRequestsPerSocket: 100,
})

const configureHttpServer = (server) => {
  server.requestTimeout = HTTP_LIMITS.requestTimeoutMs
  server.headersTimeout = HTTP_LIMITS.headersTimeoutMs
  server.keepAliveTimeout = HTTP_LIMITS.keepAliveTimeoutMs
  server.timeout = HTTP_LIMITS.socketTimeoutMs
  server.maxHeadersCount = HTTP_LIMITS.maxHeadersCount
  server.maxRequestsPerSocket = HTTP_LIMITS.maxRequestsPerSocket
  return server
}

const closeHttpServer = (server) =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error)
      else resolve()
    })
    server.closeIdleConnections?.()
  })

const createShutdownController = ({
  server,
  pool,
  emit,
  exit = process.exit,
  timeoutMs = HTTP_LIMITS.shutdownTimeoutMs,
}) => {
  let shutdownPromise = null

  return (reason, requestedExitCode = 0) => {
    if (shutdownPromise) return shutdownPromise

    shutdownPromise = (async () => {
      emit('warn', 'server_shutdown_started', { reason })
      let finalExitCode = requestedExitCode
      let timeoutHandle

      const timeout = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
          const error = new Error('Tempo limite de encerramento excedido')
          error.code = 'SHUTDOWN_TIMEOUT'
          reject(error)
        }, timeoutMs)
        timeoutHandle.unref?.()
      })

      try {
        await Promise.race([closeHttpServer(server), timeout])
      } catch (error) {
        finalExitCode = 1
        server.closeAllConnections?.()
        emit('error', 'server_shutdown_http_failure', {
          errorName: error.name,
          errorCode: error.code || 'unknown',
        })
      } finally {
        clearTimeout(timeoutHandle)
      }

      try {
        await pool.end()
      } catch (error) {
        finalExitCode = 1
        emit('error', 'server_shutdown_database_failure', {
          errorName: error.name,
        })
      }

      emit(
        finalExitCode === 0 ? 'info' : 'error',
        'server_shutdown_completed',
        { reason, exitCode: finalExitCode }
      )
      exit(finalExitCode)
    })()

    return shutdownPromise
  }
}

module.exports = {
  HTTP_LIMITS,
  configureHttpServer,
  createShutdownController,
}
