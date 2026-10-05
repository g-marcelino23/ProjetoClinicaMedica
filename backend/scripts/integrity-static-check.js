const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const {
  buildMigrationInventory,
} = require('../src/utils/migrationIntegrity')

const backendRoot = path.resolve(__dirname, '..')
const projectRoot = path.resolve(backendRoot, '..')
const read = (relativePath) =>
  fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')

const migrationInventory = buildMigrationInventory(
  path.join(backendRoot, 'migrations')
)
assert.ok(migrationInventory.length > 0, 'Nenhuma migração foi inventariada')
for (const migration of migrationInventory) {
  assert.match(migration.checksum, /^[a-f0-9]{64}$/)
  assert.ok(migration.sizeBytes > 0, `${migration.filename} está vazia`)
}

const migrationRunner = read('backend/scripts/migrate.js')
for (const requiredControl of [
  'verifyMigrationInventory',
  'pg_advisory_lock',
  'checksum char(64)',
  'ALTER COLUMN checksum SET NOT NULL',
  'REVOKE ALL PRIVILEGES',
]) {
  assert.ok(
    migrationRunner.includes(requiredControl),
    `Controle ausente no executor de migrações: ${requiredControl}`
  )
}

const app = read('backend/src/app.js')
assert.match(app, /express\.json\(\{\s*limit:\s*'100kb',\s*strict:\s*true\s*\}\)/)

const validation = read('backend/src/middlewares/validate.js')
assert.ok(validation.includes('findUnexpectedFields'))
assert.ok(validation.includes('Campo não permitido'))

const dataProtection = read('backend/src/utils/dataProtection.js')
for (const requiredControl of [
  'aes-256-gcm',
  'cipher.setAAD',
  'cipher.getAuthTag',
  'decipher.setAuthTag',
]) {
  assert.ok(
    dataProtection.includes(requiredControl),
    `Controle de autenticidade ausente: ${requiredControl}`
  )
}

const authMiddleware = read('backend/src/middlewares/authMiddleware.js')
assert.match(authMiddleware, /jwt\.verify\(/)
assert.ok(authMiddleware.includes("algorithms: ['HS256']"))
assert.ok(authMiddleware.includes('issuer: config.jwt.issuer'))
assert.ok(authMiddleware.includes('audience: config.jwt.audience'))

const frontendHtml = read('frontend/index.html')
const externalExecutableResource =
  /<(?:script|iframe)\b[^>]*(?:src)=["']https?:\/\//i
assert.doesNotMatch(
  frontendHtml,
  externalExecutableResource,
  'O frontend carrega código executável externo sem controle local de integridade'
)

const runtimeFiles = [
  ...walk(path.join(backendRoot, 'src')),
  ...walk(path.join(projectRoot, 'frontend', 'src')),
]
for (const filename of runtimeFiles) {
  const source = fs.readFileSync(filename, 'utf8')
  assert.doesNotMatch(source, /\beval\s*\(/, `eval encontrado em ${filename}`)
  assert.doesNotMatch(
    source,
    /\bnew\s+Function\s*\(/,
    `new Function encontrado em ${filename}`
  )
}

console.log(
  `A08: ${migrationInventory.length} migrações com SHA-256 e 8 grupos de controles de integridade confirmados`
)

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return walk(fullPath)
    return /\.(?:js|jsx)$/.test(entry.name) ? [fullPath] : []
  })
}
