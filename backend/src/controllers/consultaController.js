const pool = require('../config/db')

const criarConsulta = async (req, res) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const {
      paciente_id,
      agenda_id,
      motivo,
      observacoes
    } = req.body

    if (!paciente_id || !agenda_id) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        erro: 'paciente_id e agenda_id são obrigatórios'
      })
    }

    const pacienteExiste = await client.query(
      'SELECT * FROM pacientes WHERE id = $1',
      [paciente_id]
    )

    if (pacienteExiste.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ erro: 'Paciente não encontrado' })
    }

    const agendaExiste = await client.query(
      'SELECT * FROM agendas_medicas WHERE id = $1',
      [agenda_id]
    )

    if (agendaExiste.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ erro: 'Agenda não encontrada' })
    }

    const agenda = agendaExiste.rows[0]

    if (!agenda.disponivel) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        erro: 'Essa agenda não está disponível'
      })
    }

    const result = await client.query(
      `INSERT INTO consultas
      (paciente_id, medico_id, agenda_id, data_consulta, hora_consulta, motivo, status, observacoes, checkin_realizado)
      VALUES ($1, $2, $3, $4, $5, $6, 'AGENDADA', $7, false)
      RETURNING *`,
      [
        paciente_id,
        agenda.medico_id,
        agenda_id,
        agenda.data_agenda,
        agenda.hora_inicio,
        motivo || null,
        observacoes || null
      ]
    )

    await client.query(
      'UPDATE agendas_medicas SET disponivel = false WHERE id = $1',
      [agenda_id]
    )

    await client.query('COMMIT')

    return res.status(201).json({
      mensagem: 'Consulta agendada com sucesso',
      consulta: result.rows[0]
    })
  } catch (error) {
    await client.query('ROLLBACK')
    return res.status(500).json({ erro: error.message })
  } finally {
    client.release()
  }
}

const listarConsultas = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id,
        c.paciente_id,
        up.nome AS paciente_nome,
        c.medico_id,
        um.nome AS medico_nome,
        c.agenda_id,
        c.data_consulta,
        c.hora_consulta,
        c.motivo,
        c.status,
        c.observacoes,
        c.checkin_realizado,
        c.created_at
      FROM consultas c
      JOIN pacientes p ON p.id = c.paciente_id
      JOIN usuarios up ON up.id = p.usuario_id
      JOIN medicos m ON m.id = c.medico_id
      JOIN usuarios um ON um.id = m.usuario_id
      ORDER BY c.data_consulta, c.hora_consulta
    `)

    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ erro: error.message })
  }
}

const buscarConsultaPorId = async (req, res) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      `
      SELECT
        c.id,
        c.paciente_id,
        up.nome AS paciente_nome,
        c.medico_id,
        um.nome AS medico_nome,
        c.agenda_id,
        c.data_consulta,
        c.hora_consulta,
        c.motivo,
        c.status,
        c.observacoes,
        c.checkin_realizado,
        c.created_at
      FROM consultas c
      JOIN pacientes p ON p.id = c.paciente_id
      JOIN usuarios up ON up.id = p.usuario_id
      JOIN medicos m ON m.id = c.medico_id
      JOIN usuarios um ON um.id = m.usuario_id
      WHERE c.id = $1
    `,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Consulta não encontrada' })
    }

    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ erro: error.message })
  }
}

const atualizarStatusConsulta = async (req, res) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const { id } = req.params
    const { status, observacoes, checkin_realizado } = req.body

    const consultaExiste = await client.query(
      'SELECT * FROM consultas WHERE id = $1',
      [id]
    )

    if (consultaExiste.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ erro: 'Consulta não encontrada' })
    }

    const consulta = consultaExiste.rows[0]

    const result = await client.query(
      `UPDATE consultas
       SET status = $1,
           observacoes = $2,
           checkin_realizado = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, observacoes, checkin_realizado, id]
    )

    if (consulta.agenda_id) {
      if (status === 'CANCELADA' || status === 'FALTOU') {
        await client.query(
          'UPDATE agendas_medicas SET disponivel = true WHERE id = $1',
          [consulta.agenda_id]
        )
      }

      if (status === 'AGENDADA' || status === 'CONFIRMADA') {
        await client.query(
          'UPDATE agendas_medicas SET disponivel = false WHERE id = $1',
          [consulta.agenda_id]
        )
      }
    }

    await client.query('COMMIT')

    res.json({
      mensagem: 'Consulta atualizada com sucesso',
      consulta: result.rows[0]
    })
  } catch (error) {
    await client.query('ROLLBACK')
    res.status(500).json({ erro: error.message })
  } finally {
    client.release()
  }
}

const deletarConsulta = async (req, res) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const { id } = req.params

    const consultaExiste = await client.query(
      'SELECT * FROM consultas WHERE id = $1',
      [id]
    )

    if (consultaExiste.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ erro: 'Consulta não encontrada' })
    }

    const consulta = consultaExiste.rows[0]

    await client.query('DELETE FROM consultas WHERE id = $1', [id])

    if (consulta.agenda_id) {
      await client.query(
        'UPDATE agendas_medicas SET disponivel = true WHERE id = $1',
        [consulta.agenda_id]
      )
    }

    await client.query('COMMIT')

    res.json({ mensagem: 'Consulta deletada com sucesso' })
  } catch (error) {
    await client.query('ROLLBACK')
    res.status(500).json({ erro: error.message })
  } finally {
    client.release()
  }
}

module.exports = {
  criarConsulta,
  listarConsultas,
  buscarConsultaPorId,
  atualizarStatusConsulta,
  deletarConsulta
}