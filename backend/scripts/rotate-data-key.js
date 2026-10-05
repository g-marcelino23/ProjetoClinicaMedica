require('dotenv').config({ quiet: true })

const pool = require('../src/config/db')
const {
  createBlindIndex,
  decryptField,
  encryptField,
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
  const client = await pool.connect()
  let rotatedValues = 0

  try {
    await client.query('BEGIN')

    for (const [table, columns] of Object.entries(protectedColumns)) {
      const result = await client.query(
        `SELECT id, ${columns.map(quoteIdentifier).join(', ')}
         FROM ${quoteIdentifier(table)}
         FOR UPDATE`
      )

      for (const row of result.rows) {
        const plaintext = Object.fromEntries(
          columns.map((column) => [column, decryptField(column, row[column])])
        )
        const values = columns.map((column) =>
          encryptField(column, plaintext[column])
        )
        const assignments = columns
          .map((column, index) => `${quoteIdentifier(column)} = $${index + 1}`)
          .join(', ')

        if (table === 'pacientes') {
          values.push(createBlindIndex('cpf', plaintext.cpf))
        }

        const blindIndexAssignment =
          table === 'pacientes' ? `, cpf_lookup = $${values.length}` : ''

        await client.query(
          `UPDATE ${quoteIdentifier(table)}
           SET ${assignments}${blindIndexAssignment}
           WHERE id = $${values.length + 1}`,
          [...values, row.id]
        )

        rotatedValues += columns.filter(
          (column) => plaintext[column] !== null
        ).length
      }
    }

    await client.query('COMMIT')
    console.log(
      JSON.stringify({
        status: 'ok',
        valuesRotated: rotatedValues,
      })
    )
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

run()
  .catch((error) => {
    console.error(`Rotação cancelada e revertida: ${error.message}`)
    process.exitCode = 1
  })
  .finally(() => pool.end())
