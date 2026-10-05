class ApplicationError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = 'ApplicationError'
    this.status = options.status || 400
    this.publicMessage = options.publicMessage || 'Requisição inválida'
    this.code = options.code || 'APPLICATION_ERROR'
    this.isOperational = true
    this.alreadyLogged = options.alreadyLogged === true
  }
}

module.exports = ApplicationError
