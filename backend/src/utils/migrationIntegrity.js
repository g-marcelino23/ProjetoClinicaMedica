const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const MIGRATION_FILE_PATTERN = /^\d{3}_[a-z0-9_]+\.(?:sql|js)$/
const SHA256_PATTERN = /^[a-f0-9]{64}$/

const listMigrationFiles = (directory) => {
  const entries = fs.readdirSync(directory, { withFileTypes: true })
  const migrationCandidates = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        (entry.name.endsWith('.sql') || entry.name.endsWith('.js'))
    )
    .map((entry) => entry.name)

  for (const filename of migrationCandidates) {
    if (!MIGRATION_FILE_PATTERN.test(filename)) {
      throw new Error(`Nome de migração inválido: ${filename}`)
    }
  }

  const orderedFiles = migrationCandidates.sort()
  const prefixes = new Set()

  for (const filename of orderedFiles) {
    const prefix = filename.slice(0, 3)
    if (prefixes.has(prefix)) {
      throw new Error(`Prefixo de migração duplicado: ${prefix}`)
    }
    prefixes.add(prefix)
  }

  return orderedFiles
}

const calculateMigrationDigest = (directory, filename) => {
  if (!MIGRATION_FILE_PATTERN.test(filename) || path.basename(filename) !== filename) {
    throw new Error(`Nome de migração inválido: ${filename}`)
  }

  const resolvedDirectory = path.resolve(directory)
  const resolvedFile = path.resolve(resolvedDirectory, filename)

  if (path.dirname(resolvedFile) !== resolvedDirectory) {
    throw new Error(`Caminho de migração inválido: ${filename}`)
  }

  const contents = fs.readFileSync(resolvedFile)
  return {
    filename,
    checksum: crypto.createHash('sha256').update(contents).digest('hex'),
    sizeBytes: contents.length,
  }
}

const buildMigrationInventory = (directory) =>
  listMigrationFiles(directory).map((filename) =>
    calculateMigrationDigest(directory, filename)
  )

const verifyMigrationInventory = (inventory, recordedMigrations) => {
  const currentByName = new Map(
    inventory.map((migration) => [migration.filename, migration])
  )
  const recordedByName = new Map()
  const baseline = []

  for (const recorded of recordedMigrations) {
    if (recordedByName.has(recorded.filename)) {
      throw new Error(`Migração registrada mais de uma vez: ${recorded.filename}`)
    }
    recordedByName.set(recorded.filename, recorded)

    const current = currentByName.get(recorded.filename)
    if (!current) {
      throw new Error(
        `Migração aplicada não existe mais no diretório: ${recorded.filename}`
      )
    }

    if (!recorded.checksum) {
      baseline.push(current)
      continue
    }

    if (!SHA256_PATTERN.test(recorded.checksum)) {
      throw new Error(`Hash registrado inválido: ${recorded.filename}`)
    }

    if (
      recorded.checksum !== current.checksum ||
      Number(recorded.size_bytes) !== current.sizeBytes
    ) {
      throw new Error(
        `Integridade da migração não confirmada: ${recorded.filename}`
      )
    }
  }

  return {
    baseline,
    pending: inventory.filter(
      (migration) => !recordedByName.has(migration.filename)
    ),
  }
}

module.exports = {
  MIGRATION_FILE_PATTERN,
  buildMigrationInventory,
  calculateMigrationDigest,
  listMigrationFiles,
  verifyMigrationInventory,
}
