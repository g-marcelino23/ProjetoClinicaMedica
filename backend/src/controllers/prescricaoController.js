const pool = require('../config/db')
const {
  canCreateClinicalArtifact,
} = require('../domain/workflowPolicy')

const PRESCRIPTION_SELECT = `
  SELECT
    p.*,
    u_paciente.nome AS paciente_nome,
    u_medico.nome AS medico_nome
  FROM prescricoes p
  JOIN pacientes pa ON pa.id = p.paciente_id
  JOIN medicos m ON m.id = p.medico_id
  JOIN usuarios u_paciente ON u_paciente.id = pa.usuario_id
  JOIN usuarios u_medico ON u_medico.id = m.usuario_id
`

const listarPrescricoes = async (req, res, next) => {
  try {
    const result = await pool.query(
      `${PRESCRIPTION_SELECT}
       WHERE p.medico_id = $1 AND p.status = 'ATIVA'
       ORDER BY p.data_prescricao DESC`,
      [req.usuario.medico_id]
    )
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
}

const listarMinhasPrescricoes = async (req, res, next) => {
  try {
    const result = await pool.query(
      `${PRESCRIPTION_SELECT}
       WHERE p.paciente_id = $1
       ORDER BY p.data_prescricao DESC`,
      [req.usuario.paciente_id]
    )
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
}

const buscarPrescricaoPorId = async (req, res, next) => {
  try {
    const field = req.usuario.perfil === 'PACIENTE' ? 'p.paciente_id' : 'p.medico_id'
    const ownerId =
      req.usuario.perfil === 'PACIENTE'
        ? req.usuario.paciente_id
        : req.usuario.medico_id
    const result = await pool.query(
      `${PRESCRIPTION_SELECT}
       WHERE p.id = $1 AND ${field} = $2`,
      [req.params.id, ownerId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Prescrição não encontrada' })
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
}

const criarPrescricao = async (req, res, next) => {
  try {
    const consultationResult = await pool.query(
      `SELECT id, paciente_id, medico_id, status
       FROM consultas
       WHERE id = $1 AND medico_id = $2`,
      [req.body.consulta_id, req.usuario.medico_id]
    )

    if (consultationResult.rows.length === 0) {
      return res.status(404).json({ erro: 'Consulta vinculada ao médico não encontrada' })
    }

    const consultation = consultationResult.rows[0]

    if (!canCreateClinicalArtifact(consultation.status)) {
      return res.status(409).json({
        erro: 'Prescrição só pode ser emitida em consulta confirmada ou realizada',
      })
    }

    const result = await pool.query(
      `INSERT INTO prescricoes (
         consulta_id, paciente_id, medico_id, medicamento,
         dosagem, frequencia, duracao, observacoes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        consultation.id,
        consultation.paciente_id,
        consultation.medico_id,
        req.body.medicamento,
        req.body.dosagem,
        req.body.frequencia,
        req.body.duracao,
        req.body.observacoes || null,
      ]
    )

    res.status(201).json({
      mensagem: 'Prescrição criada com sucesso',
      prescricao: result.rows[0],
    })
  } catch (error) {
    next(error)
  }
}

const atualizarPrescricao = async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE prescricoes
       SET medicamento = $1,
           dosagem = $2,
           frequencia = $3,
           duracao = $4,
           observacoes = $5
       WHERE id = $6 AND medico_id = $7 AND status = 'ATIVA'
       RETURNING *`,
      [
        req.body.medicamento,
        req.body.dosagem,
        req.body.frequencia,
        req.body.duracao,
        req.body.observacoes || null,
        req.params.id,
        req.usuario.medico_id,
      ]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Prescrição não encontrada' })
    }

    res.json({
      mensagem: 'Prescrição atualizada com sucesso',
      prescricao: result.rows[0],
    })
  } catch (error) {
    next(error)
  }
}

const deletarPrescricao = async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE prescricoes
       SET status = 'CANCELADA',
           cancelada_em = CURRENT_TIMESTAMP
       WHERE id = $1 AND medico_id = $2 AND status = 'ATIVA'
       RETURNING id`,
      [req.params.id, req.usuario.medico_id]
    )

    if (result.rows.length === 0) {
      return res.status(409).json({
        erro: 'Prescrição não encontrada ou já cancelada',
      })
    }

    res.json({ mensagem: 'Prescrição cancelada com sucesso' })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  atualizarPrescricao,
  buscarPrescricaoPorId,
  criarPrescricao,
  deletarPrescricao,
  listarMinhasPrescricoes,
  listarPrescricoes,
}
