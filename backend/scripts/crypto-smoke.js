require('dotenv').config({ quiet: true })

const assert = require('node:assert/strict')
const pool = require('../src/config/db')
const {
  CIPHERTEXT_PREFIX,
  decryptField,
} = require('../src/utils/dataProtection')

const protectedColumns = {
  agendas_medicas: ['observacao'],
  consultas: ['motivo', 'observacoes'],
  exames: ['nome_exame', 'descricao', 'resultado', 'observacoes'],
  medicos: ['telefone'],
  notificacoes: ['titulo', 'mensagem'],
  pacientes: [
    'cpf',
    'data_nascimento',
    'telefone',
    'endereco',
    'convenio',
    'numero_convenio',
  ],
  prescricoes: [
    'medicamento',
    'dosagem',
    'frequencia',
    'duracao',
    'observacoes',
  ],
  prontuarios: [
    'queixa_principal',
    'anamnese',
    'diagnostico',
    'observacoes',
  ],
  secretarios: ['telefone'],
}

const quoteIdentifier = (value) => `"${value.replaceAll('"', '""')}"`

const run = async () => {
  let encryptedValues = 0

  for (const [table, columns] of Object.entries(protectedColumns)) {
    const result = await pool.query(
      `SELECT ${columns.map(quoteIdentifier).join(', ')}
       FROM ${quoteIdentifier(table)}`
    )

    for (const row of result.rows) {
      for (const column of columns) {
        const value = row[column]
        if (value === null) continue

        assert.match(
          value,
          new RegExp(`^${CIPHERTEXT_PREFIX.replaceAll('.', '\\.') }\\.`),
          `${table}.${column} contém texto legível`
        )
        assert.doesNotThrow(() => decryptField(column, value))
        encryptedValues += 1
      }
    }
  }

  const cpfIndexes = await pool.query(`
    SELECT COUNT(*)::int AS total
    FROM pacientes
    WHERE cpf IS NOT NULL
      AND cpf_lookup ~ '^[a-f0-9]{64}$'
  `)
  const patients = await pool.query(
    'SELECT COUNT(*)::int AS total FROM pacientes WHERE cpf IS NOT NULL'
  )
  assert.equal(cpfIndexes.rows[0].total, patients.rows[0].total)

  const passwordCosts = await pool.query(`
    SELECT
      COUNT(*) FILTER (
        WHERE senha !~ '^\\$2[aby]\\$(1[0-9]|[2-9][0-9])\\$'
      )::int AS weak,
      COUNT(*) FILTER (
        WHERE senha ~ '^\\$2[aby]\\$1[01]\\$'
      )::int AS below_target
    FROM usuarios
  `)
  assert.equal(passwordCosts.rows[0].weak, 0, 'Há hashes de senha abaixo do custo mínimo 10')

  const constraints = await pool.query(`
    SELECT COUNT(*)::int AS total
    FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace
      AND conname LIKE '%_encrypted'
  `)
  const expectedConstraints = Object.values(protectedColumns).flat().length
  assert.equal(constraints.rows[0].total, expectedConstraints)

  const samplePatient = await pool.query('SELECT id FROM pacientes LIMIT 1')
  let plaintextWriteRejected = false

  if (samplePatient.rows.length > 0) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query('UPDATE pacientes SET cpf = $1 WHERE id = $2', [
        '12345678909',
        samplePatient.rows[0].id,
      ])
    } catch (error) {
      plaintextWriteRejected = error.code === '23514'
    } finally {
      await client.query('ROLLBACK')
      client.release()
    }
  }
  assert.equal(plaintextWriteRejected, true)

  console.log(
    JSON.stringify({
      status: 'ok',
      algorithm: 'AES-256-GCM',
      encryptedValuesVerified: encryptedValues,
      blindIndexesVerified: cpfIndexes.rows[0].total,
      databasePlaintextGuards: constraints.rows[0].total,
      weakPasswordHashes: passwordCosts.rows[0].weak,
      legacyHashesPendingAutomaticUpgrade:
        passwordCosts.rows[0].below_target,
      plaintextWriteRejected,
    })
  )
}

run()
  .catch((error) => {
    console.error(`Verificação criptográfica falhou: ${error.message}`)
    process.exitCode = 1
  })
  .finally(() => pool.end())
