const {
  CIPHERTEXT_PREFIX,
  createBlindIndex,
  encryptField,
} = require('../src/utils/dataProtection')

const protectedColumns = {
  agendas_medicas: ['observacao'],
  consultas: ['motivo', 'observacoes'],
  exames: ['nome_exame', 'descricao', 'resultado', 'observacoes'],
  medicos: ['telefone'],
  notificacoes: ['titulo', 'mensagem'],
  pacientes: ['cpf', 'telefone', 'endereco', 'numero_convenio'],
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

const widenEncryptedColumns = async (client) => {
  for (const [table, columns] of Object.entries(protectedColumns)) {
    for (const column of columns) {
      await client.query(
        `ALTER TABLE ${quoteIdentifier(table)}
         ALTER COLUMN ${quoteIdentifier(column)} TYPE text`
      )
    }
  }

  await client.query(
    'ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS cpf_lookup char(64)'
  )
  await client.query(
    'ALTER TABLE pacientes DROP CONSTRAINT IF EXISTS pacientes_cpf_key'
  )
}

const encryptExistingRows = async (client) => {
  for (const [table, columns] of Object.entries(protectedColumns)) {
    const selectedColumns = ['id', ...columns].map(quoteIdentifier).join(', ')
    const result = await client.query(
      `SELECT ${selectedColumns} FROM ${quoteIdentifier(table)} FOR UPDATE`
    )

    for (const row of result.rows) {
      const assignments = columns
        .map((column, index) => `${quoteIdentifier(column)} = $${index + 1}`)
        .join(', ')
      const values = columns.map((column) =>
        row[column] === '' ? null : encryptField(column, row[column])
      )

      if (table === 'pacientes') {
        values.push(createBlindIndex('cpf', row.cpf))
      }

      const patientLookupAssignment =
        table === 'pacientes' ? `, cpf_lookup = $${values.length}` : ''

      await client.query(
        `UPDATE ${quoteIdentifier(table)}
         SET ${assignments}${patientLookupAssignment}
         WHERE id = $${values.length + 1}`,
        [...values, row.id]
      )
    }
  }
}

const addDatabaseGuards = async (client) => {
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS pacientes_cpf_lookup_key
      ON pacientes (cpf_lookup)
      WHERE cpf_lookup IS NOT NULL
  `)

  for (const [table, columns] of Object.entries(protectedColumns)) {
    for (const column of columns) {
      const constraint = `${table}_${column}_encrypted`
      await client.query(`
        ALTER TABLE ${quoteIdentifier(table)}
        ADD CONSTRAINT ${quoteIdentifier(constraint)}
        CHECK (
          ${quoteIdentifier(column)} IS NULL
          OR ${quoteIdentifier(column)} LIKE '${CIPHERTEXT_PREFIX}.%'
        )
      `)
    }
  }

  await client.query(`
    ALTER TABLE pacientes
    ADD CONSTRAINT pacientes_cpf_lookup_required
    CHECK (cpf IS NULL OR cpf_lookup IS NOT NULL)
  `)
}

const up = async (client) => {
  await widenEncryptedColumns(client)
  await encryptExistingRows(client)
  await addDatabaseGuards(client)
}

module.exports = { up }
