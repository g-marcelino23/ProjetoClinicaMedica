const pool = require('../config/db')
const {
  rollbackTransaction,
} = require('../services/transactionService')

const getAgendaAccess = (user, requestedDoctorId = null) => {
  if (user.perfil === 'SECRETARIO') {
    return {
      clause: requestedDoctorId ? 'a.medico_id = $1' : 'true',
      params: requestedDoctorId ? [requestedDoctorId] : [],
      includeObservation: true,
    }
  }

  if (user.perfil === 'MEDICO' && user.medico_id) {
    if (requestedDoctorId && Number(requestedDoctorId) !== Number(user.medico_id)) {
      return { clause: 'false', params: [], includeObservation: false }
    }

    return {
      clause: 'a.medico_id = $1',
      params: [user.medico_id],
      includeObservation: true,
    }
  }

  if (user.perfil === 'PACIENTE' && user.paciente_id) {
    const doctorFilter = requestedDoctorId ? ' AND a.medico_id = $1' : ''
    return {
      clause: `a.disponivel = true
               AND (a.data_agenda + a.hora_inicio) > LOCALTIMESTAMP${doctorFilter}`,
      params: requestedDoctorId ? [requestedDoctorId] : [],
      includeObservation: false,
    }
  }

  return { clause: 'false', params: [], includeObservation: false }
}

const listAgendas = async (req, res, next, requestedDoctorId = null) => {
  try {
    const access = getAgendaAccess(req.usuario, requestedDoctorId)
    const observationField = access.includeObservation
      ? ', a.observacao'
      : ''
    const result = await pool.query(
      `SELECT
         a.id,
         a.medico_id,
         u.nome AS medico_nome,
         m.especialidade,
         a.data_agenda,
         a.hora_inicio,
         a.hora_fim,
         a.disponivel
         ${observationField}
       FROM agendas_medicas a
       JOIN medicos m ON m.id = a.medico_id
       JOIN usuarios u ON u.id = m.usuario_id
       WHERE ${access.clause}
       ORDER BY a.data_agenda, a.hora_inicio`,
      access.params
    )

    res.json(result.rows)
  } catch (error) {
    next(error)
  }
}

const criarAgenda = async (req, res, next) => {
  try {
    const doctor = await pool.query(
      'SELECT id FROM medicos WHERE id = $1',
      [req.body.medico_id]
    )

    if (doctor.rows.length === 0) {
      return res.status(404).json({ erro: 'Médico não encontrado' })
    }

    const futureSlot = await pool.query(
      `SELECT ($1::date + $2::time) > LOCALTIMESTAMP AS valido`,
      [req.body.data_agenda, req.body.hora_inicio]
    )

    if (!futureSlot.rows[0].valido) {
      return res.status(409).json({
        erro: 'Não é permitido criar horário no passado',
      })
    }

    const result = await pool.query(
      `INSERT INTO agendas_medicas (
         medico_id, data_agenda, hora_inicio, hora_fim, disponivel, observacao
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.body.medico_id,
        req.body.data_agenda,
        req.body.hora_inicio,
        req.body.hora_fim,
        req.body.disponivel ?? true,
        req.body.observacao || null,
      ]
    )

    res.status(201).json({
      mensagem: 'Agenda criada com sucesso',
      agenda: result.rows[0],
    })
  } catch (error) {
    if (['23505', '23P01'].includes(error.code)) {
      return res.status(409).json({
        erro: 'O horário se sobrepõe a outro horário deste médico',
      })
    }

    next(error)
  }
}

const listarAgendas = (req, res, next) => listAgendas(req, res, next)

const listarAgendaPorMedico = (req, res, next) =>
  listAgendas(req, res, next, req.params.medicoId)

const atualizarAgenda = async (req, res, next) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const currentResult = await client.query(
      `SELECT
         a.id,
         EXISTS (
           SELECT 1 FROM consultas c WHERE c.agenda_id = a.id
         ) AS possui_consulta
       FROM agendas_medicas a
       WHERE a.id = $1
       FOR UPDATE`,
      [req.params.id]
    )

    if (currentResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ erro: 'Agenda não encontrada' })
    }

    if (currentResult.rows[0].possui_consulta) {
      await client.query('ROLLBACK')
      return res.status(409).json({
        erro: 'Agenda vinculada a consulta não pode ter horário alterado',
      })
    }

    const futureSlot = await client.query(
      `SELECT ($1::date + $2::time) > LOCALTIMESTAMP AS valido`,
      [req.body.data_agenda, req.body.hora_inicio]
    )

    if (!futureSlot.rows[0].valido) {
      await client.query('ROLLBACK')
      return res.status(409).json({
        erro: 'Não é permitido mover o horário para o passado',
      })
    }

    const result = await client.query(
      `UPDATE agendas_medicas
       SET data_agenda = $1,
           hora_inicio = $2,
           hora_fim = $3,
           disponivel = $4,
           observacao = $5
       WHERE id = $6
       RETURNING *`,
      [
        req.body.data_agenda,
        req.body.hora_inicio,
        req.body.hora_fim,
        req.body.disponivel,
        req.body.observacao || null,
        req.params.id,
      ]
    )

    await client.query('COMMIT')
    res.json({
      mensagem: 'Agenda atualizada com sucesso',
      agenda: result.rows[0],
    })
  } catch (error) {
    const transactionError = await rollbackTransaction(client, error)
    if (transactionError !== error) return next(transactionError)

    if (['23505', '23P01'].includes(error.code)) {
      return res.status(409).json({
        erro: 'O horário se sobrepõe a outro horário deste médico',
      })
    }

    next(error)
  } finally {
    client.release()
  }
}

const deletarAgenda = async (req, res, next) => {
  try {
    const schedule = await pool.query(
      `SELECT a.id, EXISTS (
         SELECT 1 FROM consultas c WHERE c.agenda_id = a.id
       ) AS possui_consulta
       FROM agendas_medicas a
       WHERE a.id = $1`,
      [req.params.id]
    )

    if (schedule.rows.length === 0) {
      return res.status(404).json({ erro: 'Agenda não encontrada' })
    }

    if (schedule.rows[0].possui_consulta) {
      return res.status(409).json({
        erro: 'Agenda vinculada a consulta deve ser preservada',
      })
    }

    await pool.query('DELETE FROM agendas_medicas WHERE id = $1', [req.params.id])
    res.json({ mensagem: 'Agenda removida com sucesso' })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  atualizarAgenda,
  criarAgenda,
  deletarAgenda,
  listarAgendaPorMedico,
  listarAgendas,
}
