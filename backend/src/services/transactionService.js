class TransactionRollbackError extends Error {
  constructor(originalError, rollbackError) {
    super('A transação falhou e não foi possível confirmar o rollback', {
      cause: originalError,
    })
    this.name = 'TransactionRollbackError'
    this.originalErrorName = originalError?.name || 'Error'
    this.rollbackErrorName = rollbackError?.name || 'Error'
  }
}

const rollbackTransaction = async (client, originalError) => {
  try {
    await client.query('ROLLBACK')
    return originalError
  } catch (rollbackError) {
    return new TransactionRollbackError(originalError, rollbackError)
  }
}

module.exports = {
  TransactionRollbackError,
  rollbackTransaction,
}
