const pool = require('../config/db')
const {
  rollbackTransaction,
} = require('../services/transactionService')
const {
  CHECKIN_EARLY_MINUTES,
  CHECKIN_LATE_MINUTES,
  canTransitionConsultation,
} = require('../domain/workflowPolicy')

const getConsultationSelect = (user) => `
  SELECT
    c.id,
    c.paciente_id,
    up.nome AS paciente_nome,
    c.medico_id,
    um.nome AS medico_nome,
    c.agenda_id,
    c.data_consulta,
    c.hora_consulta,
    c.hora_fim,
    c.status,
    c.checkin_realizado,
    c.data_checkin,
    c.created_at,
    c.updated_at
    ${
      user.perfil === 'SECRETARIO'
        ? ''
        : ', c.motivo, c.observacoes'
    }
  FROM consultas c
  JOIN pacientes p ON p.id = c.paciente_id
  JOIN usuarios up ON up.id = p.usuario_id
  JOIN medicos m ON m.id = c.medico_id
  JOIN usuarios um ON um.id = m.usuario_id
`

const getAccessScope = (user, parameterIndex = 1) => {
  if (user.perfil === 'SECRETARIO') {
    return { clause: '', params: [] }
  }

  if (user.perfil === 'PACIENTE' && user.paciente_id) {
    return {
      clause: ` AND c.paciente_id = $${parameterIndex}`,
      params: [user.paciente_id],
    }
  }

  if (user.perfil === 'MEDICO' && user.medico_id) {
    return {
      clause: ` AND c.medico_id = $${parameterIndex}`,
      params: [user.medico_id],
    }
  }

  return { clause: ' AND false', params: [] }
}

const criarConsulta = async (req, res, next) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const pacienteId =
      req.usuario.perfil === 'PACIENTE'
        ? req.usuario.paciente_id
        : req.body.paciente_id

    if (!pacienteId) {
      await client.query('ROLLBACK')
      return res.status(400).json({ erro: 'Paciente não informado ou não vinculado' })
    }

    const patientResult = await client.query(
      'SELECT id FROM pacientes WHERE id = $1',
      [pacienteId]
    )

    if (patientResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ erro: 'Paciente não encontrado' })
    }

    const agendaResult = await client.query(
      `SELECT
         id,
         medico_id,
         data_agenda,
         hora_inicio,
         hora_fim,
         disponivel,
         (data_agenda + hora_inicio) > LOCALTIMESTAMP AS horario_futuro
       FROM agendas_medicas
       WHERE id = $1
       FOR UPDATE`,
      [req.body.agenda_id]
    )

    if (agendaResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ erro: 'Agenda não encontrada' })
    }

    const agenda = agendaResult.rows[0]

    if (!agenda.disponivel) {
      await client.query('ROLLBACK')
      return res.status(409).json({ erro: 'Horário indisponível' })
    }

    if (!agenda.horario_futuro) {
      await client.query('ROLLBACK')
      return res.status(409).json({ erro: 'Não é permitido agendar no passado' })
    }

    const result = await client.query(
      `INSERT INTO consultas (
         paciente_id, medico_id, agenda_id, data_consulta, hora_consulta, hora_fim,
         motivo, status, observacoes, checkin_realizado, data_checkin
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'AGENDADA', $8, false, null)
       RETURNING *`,
      [
        pacienteId,
        agenda.medico_id,
        agenda.id,
        agenda.data_agenda,
        agenda.hora_inicio,
        agenda.hora_fim,
        req.body.motivo || null,
        req.body.observacoes || null,
      ]
    )

    await client.query(
      'UPDATE agendas_medicas SET disponivel = false WHERE id = $1',
      [agenda.id]
    )

    await client.query('COMMIT')
    return res.status(201).json({
      mensagem: 'Consulta agendada com sucesso',
      consulta: result.rows[0],
    })
  } catch (error) {
    const transactionError = await rollbackTransaction(client, error)
    if (transactionError !== error) return next(transactionError)

    if (error.code === '23P01') {
      return res.status(409).json({
        erro: 'O paciente já possui consulta em horário sobreposto',
      })
    }

    if (error.code === '23505') {
      return res.status(409).json({ erro: 'Horário indisponível' })
    }

    next(error)
  } finally {
    client.release()
  }
}

const listarConsultas = async (req, res, next) => {
  try {
    const scope = getAccessScope(req.usuario)
    const result = await pool.query(
      `${getConsultationSelect(req.usuario)}
       WHERE true ${scope.clause}
       ORDER BY c.data_consulta, c.hora_consulta`,
      scope.params
    )
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
}

const buscarConsultaPorId = async (req, res, next) => {
  try {
    const scope = getAccessScope(req.usuario, 2)
    const result = await pool.query(
      `${getConsultationSelect(req.usuario)}
       WHERE c.id = $1 ${scope.clause}`,
      [req.params.id, ...scope.params]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Consulta não encontrada' })
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
}

const realizarCheckIn = async (req, res, next) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const result = await client.query(
      `SELECT
         c.*,
         LOCALTIMESTAMP BETWEEN
           (c.data_consulta + c.hora_consulta - ($3 * INTERVAL '1 minute'))
           AND
           (c.data_consulta + c.hora_consulta + ($4 * INTERVAL '1 minute'))
           AS dentro_janela_checkin
       FROM consultas c
       WHERE c.id = $1 AND c.paciente_id = $2
       FOR UPDATE`,
      [
        req.params.id,
        req.usuario.paciente_id,
        CHECKIN_EARLY_MINUTES,
        CHECKIN_LATE_MINUTES,
      ]
    )

    if (result.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ erro: 'Consulta não encontrada' })
    }

    const consulta = result.rows[0]

    if (consulta.checkin_realizado) {
      await client.query('ROLLBACK')
      return res.status(409).json({ erro: 'Check-in já realizado' })
    }

    if (!['AGENDADA', 'CONFIRMADA'].includes(consulta.status)) {
      await client.query('ROLLBACK')
      return res.status(409).json({ erro: 'Consulta indisponível para check-in' })
    }

    if (!consulta.dentro_janela_checkin) {
      await client.query('ROLLBACK')
      return res.status(409).json({
        erro: `Check-in permitido somente entre ${CHECKIN_EARLY_MINUTES} minutos antes e ${CHECKIN_LATE_MINUTES} minutos após o horário`,
      })
    }

    const update = await client.query(
      `UPDATE consultas
       SET checkin_realizado = true,
           data_checkin = CURRENT_TIMESTAMP,
           status = 'CONFIRMADA',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [consulta.id]
    )

    await client.query('COMMIT')
    res.json({
      mensagem: 'Check-in realizado com sucesso',
      consulta: update.rows[0],
    })
  } catch (error) {
    next(await rollbackTransaction(client, error))
  } finally {
    client.release()
  }
}

const atualizarStatusConsulta = async (req, res, next) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const scope = getAccessScope(req.usuario, 2)
    const currentResult = await client.query(
      `SELECT
         c.*,
         (c.data_consulta + c.hora_consulta) <= LOCALTIMESTAMP
           AS horario_iniciado,
         (c.data_consulta + c.hora_fim) <= LOCALTIMESTAMP
           AS horario_encerrado
       FROM consultas c
       WHERE c.id = $1 ${scope.clause}
       FOR UPDATE`,
      [req.params.id, ...scope.params]
    )

    if (currentResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ erro: 'Consulta não encontrada' })
    }

    const current = currentResult.rows[0]

    if (!canTransitionConsultation(
      req.usuario.perfil,
      current.status,
      req.body.status
    )) {
      await client.query('ROLLBACK')
      return res.status(409).json({ erro: 'Transição de status não permitida' })
    }

    if (req.body.status === 'REALIZADA' && !current.horario_iniciado) {
      await client.query('ROLLBACK')
      return res.status(409).json({
        erro: 'A consulta não pode ser concluída antes do horário agendado',
      })
    }

    if (req.body.status === 'FALTOU' && !current.horario_encerrado) {
      await client.query('ROLLBACK')
      return res.status(409).json({
        erro: 'A falta só pode ser registrada após o fim do horário',
      })
    }

    const result = await client.query(
      `UPDATE consultas
       SET status = $1,
           observacoes = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [
        req.body.status,
        req.usuario.perfil === 'MEDICO'
          ? req.body.observacoes ?? current.observacoes
          : current.observacoes,
        current.id,
      ]
    )

    if (current.agenda_id && req.body.status === 'CANCELADA') {
      await client.query(
        `UPDATE agendas_medicas
         SET disponivel = true
         WHERE id = $1
           AND (data_agenda + hora_inicio) > LOCALTIMESTAMP`,
        [current.agenda_id]
      )
    }

    await client.query('COMMIT')
    res.json({
      mensagem: 'Consulta atualizada com sucesso',
      consulta: result.rows[0],
    })
  } catch (error) {
    next(await rollbackTransaction(client, error))
  } finally {
    client.release()
  }
}

const deletarConsulta = async (req, res, next) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const result = await client.query(
      `SELECT id, agenda_id, status
       FROM consultas
       WHERE id = $1
       FOR UPDATE`,
      [req.params.id]
    )

    if (result.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ erro: 'Consulta não encontrada' })
    }

    const consultation = result.rows[0]

    if (!['AGENDADA', 'CONFIRMADA'].includes(consultation.status)) {
      await client.query('ROLLBACK')
      return res.status(409).json({
        erro: 'Somente consultas ativas podem ser canceladas',
      })
    }

    await client.query(
      `UPDATE consultas
       SET status = 'CANCELADA', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [consultation.id]
    )

    if (consultation.agenda_id) {
      await client.query(
        `UPDATE agendas_medicas
         SET disponivel = true
         WHERE id = $1
           AND (data_agenda + hora_inicio) > LOCALTIMESTAMP`,
        [consultation.agenda_id]
      )
    }

    await client.query('COMMIT')
    res.json({ mensagem: 'Consulta cancelada com sucesso' })
  } catch (error) {
    next(await rollbackTransaction(client, error))
  } finally {
    client.release()
  }
}

module.exports = {
  atualizarStatusConsulta,
  buscarConsultaPorId,
  criarConsulta,
  deletarConsulta,
  listarConsultas,
  realizarCheckIn,
}
