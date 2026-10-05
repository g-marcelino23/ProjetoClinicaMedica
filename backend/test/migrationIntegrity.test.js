const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const test = require('node:test')
const {
  buildMigrationInventory,
  listMigrationFiles,
  verifyMigrationInventory,
} = require('../src/utils/migrationIntegrity')

const withMigrationDirectory = (files, callback) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'clinicalmed-a08-'))

  try {
    for (const [filename, contents] of Object.entries(files)) {
      fs.writeFileSync(path.join(directory, filename), contents)
    }
    callback(directory)
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
}

test('inventário registra SHA-256 e tamanho das migrações', () => {
  withMigrationDirectory(
    {
      '001_initial.sql': 'SELECT 1;\n',
      '002_encrypt.js': 'module.exports.up = async () => {}\n',
    },
    (directory) => {
      const inventory = buildMigrationInventory(directory)

      assert.deepEqual(
        inventory.map((migration) => migration.filename),
        ['001_initial.sql', '002_encrypt.js']
      )
      assert.match(inventory[0].checksum, /^[a-f0-9]{64}$/)
      assert.equal(inventory[0].sizeBytes, Buffer.byteLength('SELECT 1;\n'))
    }
  )
})

test('migração aplicada e posteriormente adulterada é rejeitada', () => {
  withMigrationDirectory({ '001_initial.sql': 'SELECT 1;\n' }, (directory) => {
    const original = buildMigrationInventory(directory)
    fs.writeFileSync(path.join(directory, '001_initial.sql'), 'SELECT 2;\n')
    const altered = buildMigrationInventory(directory)

    assert.throws(
      () =>
        verifyMigrationInventory(altered, [
          {
            filename: original[0].filename,
            checksum: original[0].checksum,
            size_bytes: original[0].sizeBytes,
          },
        ]),
      /Integridade da migração não confirmada/
    )
  })
})

test('migração aplicada e removida do repositório é rejeitada', () => {
  assert.throws(
    () =>
      verifyMigrationInventory([], [
        {
          filename: '001_initial.sql',
          checksum: 'a'.repeat(64),
          size_bytes: 10,
        },
      ]),
    /não existe mais/
  )
})

test('migrações antigas sem hash entram em baseline controlado', () => {
  withMigrationDirectory({ '001_initial.sql': 'SELECT 1;\n' }, (directory) => {
    const inventory = buildMigrationInventory(directory)
    const result = verifyMigrationInventory(inventory, [
      { filename: '001_initial.sql', checksum: null, size_bytes: null },
    ])

    assert.equal(result.baseline.length, 1)
    assert.equal(result.pending.length, 0)
  })
})

test('nomes ambíguos e prefixos duplicados são rejeitados', () => {
  withMigrationDirectory(
    {
      '001_first.sql': 'SELECT 1;',
      '001_second.sql': 'SELECT 2;',
    },
    (directory) => {
      assert.throws(() => listMigrationFiles(directory), /Prefixo.+duplicado/)
    }
  )
})
