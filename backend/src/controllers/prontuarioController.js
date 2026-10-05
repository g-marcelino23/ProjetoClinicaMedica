const pool = require('../config/db')
const {
  rollbackTransaction,
} = require('../services/transactionService')

const RECORD_SELECT = `
  SELECT
    pr.id,
    pr.consulta_id,
    pr.paciente_id,
    up.nome AS paciente_nome,
    pr.medico_id,
    um.nome AS medico_nome,
    pr.queixa_principal,
    pr.anamnese,
    pr.diagnostico,
    pr.observacoes,
    pr.created_at,
    pr.updated_at
  FROM prontuarios pr
  JOIN pacientes pa ON pa.id = pr.paciente_id
  JOIN usuarios up ON up.id = pa.usuario_id
  JOIN medicos m ON m.id = pr.medico_id
  JOIN usuarios um ON um.id = m.usuario_id
`

const getRecordScope = (user, parameterIndex = 1) => {
  if (user.perfil === 'PACIENTE' && user.paciente_id) {
    return {
      clause: `pr.paciente_id = $${parameterIndex}`,
      params: [user.paciente_id],
    }
  }

  if (user.perfil === 'MEDICO' && user.medico_id) {
    return {
      clause: `pr.medico_id = $${parameterIndex}`,
      params: [user.medico_id],
    }
  }

  return { clause: 'false', params: [] }
}

const criarProntuario = async (req, res, next) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const consultationResult = await client.query(
      `SELECT
         id,
         paciente_id,
         medico_id,
         status,
         (data_consulta + hora_consulta) <= LOCALTIMESTAMP
           AS horario_iniciado
       FROM consultas
       WHERE id = $1 AND medico_id = $2
       FOR UPDATE`,
      [req.body.consulta_id, req.usuario.medico_id]
    )

    if (consultationResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ erro: 'Consulta vinculada ao médico não encontrada' })
    }

    const consultation = consultationResult.rows[0]

    if (consultation.status !== 'CONFIRMADA') {
      await client.query('ROLLBACK')
      return res.status(409).json({
        erro: 'Prontuário só pode ser criado para consulta confirmada',
      })
    }

    if (!consultation.horario_iniciado) {
      await client.query('ROLLBACK')
      return res.status(409).json({
        erro: 'Prontuário não pode ser criado antes do horário da consulta',
      })
    }

    const result = await client.query(
      `INSERT INTO prontuarios (
         consulta_id, paciente_id, medico_id, queixa_principal,
         anamnese, diagnostico, observacoes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        consultation.id,
        consultation.paciente_id,
        consultation.medico_id,
        req.body.queixa_principal || null,
        req.body.anamnese || null,
        req.body.diagnostico || null,
        req.body.observacoes || null,
      ]
    )

    await client.query(
      `UPDATE consultas
       SET status = 'REALIZADA', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [consultation.id]
    )

    await client.query('COMMIT')
    res.status(201).json({
      mensagem: 'Prontuário criado com sucesso',
      prontuario: result.rows[0],
    })
  } catch (error) {
    const transactionError = await rollbackTransaction(client, error)
    if (transactionError !== error) return next(transactionError)

    if (error.code === '23505') {
      return res.status(409).json({ erro: 'Já existe prontuário para esta consulta' })
    }

    next(error)
  } finally {
    client.release()
  }
}

const listarProntuarios = async (req, res, next) => {
  try {
    const scope = getRecordScope(req.usuario)
    const result = await pool.query(
      `${RECORD_SELECT}
       WHERE ${scope.clause}
       ORDER BY pr.created_at DESC`,
      scope.params
    )
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
}

const buscarProntuarioPorId = async (req, res, next) => {
  try {
    const scope = getRecordScope(req.usuario, 2)
    const result = await pool.query(
      `${RECORD_SELECT}
       WHERE pr.id = $1 AND ${scope.clause}`,
      [req.params.id, ...scope.params]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Prontuário não encontrado' })
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
}

const atualizarProntuario = async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE prontuarios
       SET queixa_principal = $1,
           anamnese = $2,
           diagnostico = $3,
           observacoes = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND medico_id = $6
       RETURNING *`,
      [
        req.body.queixa_principal || null,
        req.body.anamnese || null,
        req.body.diagnostico || null,
        req.body.observacoes || null,
        req.params.id,
        req.usuario.medico_id,
      ]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Prontuário não encontrado' })
    }

    res.json({
      mensagem: 'Prontuário atualizado com sucesso',
      prontuario: result.rows[0],
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  atualizarProntuario,
  buscarProntuarioPorId,
  criarProntuario,
  listarProntuarios,
}
