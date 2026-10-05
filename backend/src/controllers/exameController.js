const pool = require('../config/db')
const {
  rollbackTransaction,
} = require('../services/transactionService')
const {
  canCreateClinicalArtifact,
  canTransitionExam,
} = require('../domain/workflowPolicy')

const getExamSelect = (user) => `
  SELECT
    e.id,
    e.consulta_id,
    e.paciente_id,
    e.medico_id,
    e.nome_exame,
    e.status,
    e.data_exame,
    e.created_at,
    e.updated_at,
    u_paciente.nome AS paciente_nome,
    u_medico.nome AS medico_nome
    ${
      user.perfil === 'SECRETARIO'
        ? ''
        : ', e.descricao, e.resultado, e.observacoes'
    }
  FROM exames e
  JOIN pacientes p ON p.id = e.paciente_id
  JOIN usuarios u_paciente ON u_paciente.id = p.usuario_id
  JOIN medicos m ON m.id = e.medico_id
  JOIN usuarios u_medico ON u_medico.id = m.usuario_id
`

const getExamScope = (user, parameterIndex = 1) => {
  if (user.perfil === 'SECRETARIO') {
    return { clause: 'true', params: [] }
  }

  if (user.perfil === 'PACIENTE' && user.paciente_id) {
    return {
      clause: `e.paciente_id = $${parameterIndex}`,
      params: [user.paciente_id],
    }
  }

  if (user.perfil === 'MEDICO' && user.medico_id) {
    return {
      clause: `e.medico_id = $${parameterIndex}`,
      params: [user.medico_id],
    }
  }

  return { clause: 'false', params: [] }
}

const listarExames = async (req, res, next) => {
  try {
    const scope = getExamScope(req.usuario)
    const result = await pool.query(
      `${getExamSelect(req.usuario)}
       WHERE ${scope.clause}
       ORDER BY e.id DESC`,
      scope.params
    )
    res.json(result.rows)
  } catch (error) {
    next(error)
  }
}

const buscarExamePorId = async (req, res, next) => {
  try {
    const scope = getExamScope(req.usuario, 2)
    const result = await pool.query(
      `${getExamSelect(req.usuario)}
       WHERE e.id = $1 AND ${scope.clause}`,
      [req.params.id, ...scope.params]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Exame não encontrado' })
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
}

const criarExame = async (req, res, next) => {
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
        erro: 'Exame só pode ser solicitado em consulta confirmada ou realizada',
      })
    }

    if (req.body.status && req.body.status !== 'SOLICITADO') {
      return res.status(409).json({
        erro: 'Todo novo exame deve iniciar com status SOLICITADO',
      })
    }

    if (
      ['REALIZADO', 'ENTREGUE'].includes(req.body.status) &&
      !req.body.resultado
    ) {
      return res.status(400).json({
        erro: 'Resultado é obrigatório para exame realizado ou entregue',
      })
    }

    const result = await pool.query(
      `INSERT INTO exames (
         consulta_id, paciente_id, medico_id, nome_exame, descricao,
         status, data_exame, resultado, observacoes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        consultation.id,
        consultation.paciente_id,
        consultation.medico_id,
        req.body.nome_exame,
        req.body.descricao || null,
        req.body.status || 'SOLICITADO',
        req.body.data_exame || null,
        req.body.resultado || null,
        req.body.observacoes || null,
      ]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    next(error)
  }
}

const atualizarExame = async (req, res, next) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const currentResult = await client.query(
      `SELECT id, status
       FROM exames
       WHERE id = $1 AND medico_id = $2
       FOR UPDATE`,
      [req.params.id, req.usuario.medico_id]
    )

    if (currentResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ erro: 'Exame não encontrado' })
    }

    if (!canTransitionExam(currentResult.rows[0].status, req.body.status)) {
      await client.query('ROLLBACK')
      return res.status(409).json({
        erro: 'Transição de status do exame não permitida',
      })
    }

    if (
      ['REALIZADO', 'ENTREGUE'].includes(req.body.status) &&
      !req.body.resultado
    ) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        erro: 'Resultado é obrigatório para exame realizado ou entregue',
      })
    }

    const result = await client.query(
      `UPDATE exames
       SET nome_exame = $1,
           descricao = $2,
           status = $3,
           data_exame = $4,
           resultado = $5,
           observacoes = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND medico_id = $8
       RETURNING *`,
      [
        req.body.nome_exame,
        req.body.descricao || null,
        req.body.status,
        req.body.data_exame || null,
        req.body.resultado || null,
        req.body.observacoes || null,
        req.params.id,
        req.usuario.medico_id,
      ]
    )

    await client.query('COMMIT')
    res.json(result.rows[0])
  } catch (error) {
    next(await rollbackTransaction(client, error))
  } finally {
    client.release()
  }
}

const deletarExame = async (req, res, next) => {
  try {
    const result = await pool.query(
      `UPDATE exames
       SET status = 'CANCELADO', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status IN ('SOLICITADO', 'AGENDADO')
       RETURNING id`,
      [req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(409).json({
        erro: 'Somente exames solicitados ou agendados podem ser cancelados',
      })
    }

    res.json({ mensagem: 'Exame cancelado com sucesso' })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  atualizarExame,
  buscarExamePorId,
  criarExame,
  deletarExame,
  listarExames,
}
