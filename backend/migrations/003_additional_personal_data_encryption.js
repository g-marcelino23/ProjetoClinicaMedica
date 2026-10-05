const {
  CIPHERTEXT_PREFIX,
  encryptField,
} = require('../src/utils/dataProtection')

const columns = ['data_nascimento', 'convenio']

const up = async (client) => {
  for (const column of columns) {
    await client.query(
      `ALTER TABLE pacientes ALTER COLUMN ${column} TYPE text USING ${column}::text`
    )
  }

  const result = await client.query(
    'SELECT id, data_nascimento, convenio FROM pacientes FOR UPDATE'
  )

  for (const row of result.rows) {
    await client.query(
      `UPDATE pacientes
       SET data_nascimento = $1, convenio = $2
       WHERE id = $3`,
      [
        encryptField('data_nascimento', row.data_nascimento),
        encryptField('convenio', row.convenio),
        row.id,
      ]
    )
  }

  for (const column of columns) {
    await client.query(`
      ALTER TABLE pacientes
      ADD CONSTRAINT pacientes_${column}_encrypted
      CHECK (
        ${column} IS NULL
        OR ${column} LIKE '${CIPHERTEXT_PREFIX}.%'
      )
    `)
  }
}

module.exports = { up }
