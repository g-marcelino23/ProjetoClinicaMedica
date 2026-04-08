const pool = require('../config/db')

// Listar exames
const listarExames = async (req, res) => {
  try {
    const { perfil, id: usuarioId } = req.usuario

    let result

    if (perfil === 'PACIENTE') {
      const pacienteResult = await pool.query(
        `
        SELECT id
        FROM pacientes
        WHERE usuario_id = $1
        `,
        [usuarioId]
      )

      if (pacienteResult.rows.length === 0) {
        return res.status(404).json({
          erro: 'Paciente não encontrado.'
        })
      }

      const pacienteId = pacienteResult.rows[0].id

      result = await pool.query(
        `
        SELECT
          e.*,
          u_paciente.nome AS paciente_nome,
          u_medico.nome AS medico_nome
        FROM exames e
        LEFT JOIN pacientes p ON p.id = e.paciente_id
        LEFT JOIN usuarios u_paciente ON u_paciente.id = p.usuario_id
        LEFT JOIN medicos m ON m.id = e.medico_id
        LEFT JOIN usuarios u_medico ON u_medico.id = m.usuario_id
        WHERE e.paciente_id = $1
        ORDER BY e.id DESC
        `,
        [pacienteId]
      )
    } else if (perfil === 'MEDICO') {
      const medicoResult = await pool.query(
        `
        SELECT id
        FROM medicos
        WHERE usuario_id = $1
        `,
        [usuarioId]
      )

      if (medicoResult.rows.length === 0) {
        return res.status(404).json({
          erro: 'Médico não encontrado.'
        })
      }

      const medicoId = medicoResult.rows[0].id

      result = await pool.query(
        `
        SELECT
          e.*,
          u_paciente.nome AS paciente_nome,
          u_medico.nome AS medico_nome
        FROM exames e
        LEFT JOIN pacientes p ON p.id = e.paciente_id
        LEFT JOIN usuarios u_paciente ON u_paciente.id = p.usuario_id
        LEFT JOIN medicos m ON m.id = e.medico_id
        LEFT JOIN usuarios u_medico ON u_medico.id = m.usuario_id
        WHERE e.medico_id = $1
        ORDER BY e.id DESC
        `,
        [medicoId]
      )
    } else {
      result = await pool.query(
        `
        SELECT
          e.*,
          u_paciente.nome AS paciente_nome,
          u_medico.nome AS medico_nome
        FROM exames e
        LEFT JOIN pacientes p ON p.id = e.paciente_id
        LEFT JOIN usuarios u_paciente ON u_paciente.id = p.usuario_id
        LEFT JOIN medicos m ON m.id = e.medico_id
        LEFT JOIN usuarios u_medico ON u_medico.id = m.usuario_id
        ORDER BY e.id DESC
        `
      )
    }

    res.json(result.rows)
  } catch (error) {
    console.error('Erro ao listar exames:', error)
    res.status(500).json({ erro: 'Erro ao listar exames.' })
  }
}

// Buscar exame por ID
const buscarExamePorId = async (req, res) => {
  try {
    const { id } = req.params
    const { perfil, id: usuarioId } = req.usuario

    let result

    if (perfil === 'PACIENTE') {
      const pacienteResult = await pool.query(
        `
        SELECT id
        FROM pacientes
        WHERE usuario_id = $1
        `,
        [usuarioId]
      )

      if (pacienteResult.rows.length === 0) {
        return res.status(404).json({ erro: 'Paciente não encontrado.' })
      }

      const pacienteId = pacienteResult.rows[0].id

      result = await pool.query(
        `
        SELECT
          e.*,
          u_paciente.nome AS paciente_nome,
          u_medico.nome AS medico_nome
        FROM exames e
        LEFT JOIN pacientes p ON p.id = e.paciente_id
        LEFT JOIN usuarios u_paciente ON u_paciente.id = p.usuario_id
        LEFT JOIN medicos m ON m.id = e.medico_id
        LEFT JOIN usuarios u_medico ON u_medico.id = m.usuario_id
        WHERE e.id = $1 AND e.paciente_id = $2
        `,
        [id, pacienteId]
      )
    } else {
      result = await pool.query(
        `
        SELECT
          e.*,
          u_paciente.nome AS paciente_nome,
          u_medico.nome AS medico_nome
        FROM exames e
        LEFT JOIN pacientes p ON p.id = e.paciente_id
        LEFT JOIN usuarios u_paciente ON u_paciente.id = p.usuario_id
        LEFT JOIN medicos m ON m.id = e.medico_id
        LEFT JOIN usuarios u_medico ON u_medico.id = m.usuario_id
        WHERE e.id = $1
        `,
        [id]
      )
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Exame não encontrado.' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Erro ao buscar exame:', error)
    res.status(500).json({ erro: 'Erro ao buscar exame.' })
  }
}

// Criar exame
const criarExame = async (req, res) => {
  try {
    const { perfil, id: usuarioId } = req.usuario

    if (perfil === 'PACIENTE') {
      return res.status(403).json({
        erro: 'Paciente não pode cadastrar exames'
      })
    }

    const {
      consulta_id,
      nome_exame,
      descricao,
      status,
      data_exame,
      resultado,
      observacoes
    } = req.body

    if (!consulta_id || !nome_exame) {
      return res.status(400).json({
        erro: 'consulta_id e nome_exame são obrigatórios'
      })
    }

    const consultaResult = await pool.query(
      `
      SELECT id, paciente_id, medico_id
      FROM consultas
      WHERE id = $1
      `,
      [consulta_id]
    )

    if (consultaResult.rows.length === 0) {
      return res.status(404).json({ erro: 'Consulta não encontrada.' })
    }

    const consulta = consultaResult.rows[0]

    if (perfil === 'MEDICO') {
      const medicoResult = await pool.query(
        `
        SELECT id
        FROM medicos
        WHERE usuario_id = $1
        `,
        [usuarioId]
      )

      if (medicoResult.rows.length === 0) {
        return res.status(404).json({ erro: 'Médico não encontrado.' })
      }

      const medicoIdLogado = medicoResult.rows[0].id

      if (Number(consulta.medico_id) !== Number(medicoIdLogado)) {
        return res.status(403).json({
          erro: 'Você só pode cadastrar exame para consultas vinculadas a você.'
        })
      }
    }

    if ((status === 'REALIZADO' || status === 'ENTREGUE') && !resultado) {
      return res.status(400).json({
        erro: 'Resultado é obrigatório para exames REALIZADO ou ENTREGUE.'
      })
    }

    const result = await pool.query(
      `
      INSERT INTO exames
      (
        consulta_id,
        paciente_id,
        medico_id,
        nome_exame,
        descricao,
        status,
        data_exame,
        resultado,
        observacoes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
      `,
      [
        consulta.id,
        consulta.paciente_id,
        consulta.medico_id,
        nome_exame,
        descricao || null,
        status || 'SOLICITADO',
        data_exame || null,
        resultado || null,
        observacoes || null
      ]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Erro ao criar exame:', error)
    res.status(500).json({ erro: 'Erro ao criar exame.' })
  }
}

// Atualizar exame
const atualizarExame = async (req, res) => {
  try {
    const { perfil } = req.usuario

    if (perfil === 'PACIENTE') {
      return res.status(403).json({
        erro: 'Paciente não pode editar exames'
      })
    }

    const { id } = req.params
    const {
      nome_exame,
      descricao,
      status,
      data_exame,
      resultado,
      observacoes
    } = req.body

    const exameExiste = await pool.query(
      'SELECT * FROM exames WHERE id = $1',
      [id]
    )

    if (exameExiste.rows.length === 0) {
      return res.status(404).json({ erro: 'Exame não encontrado.' })
    }

    if ((status === 'REALIZADO' || status === 'ENTREGUE') && !resultado) {
      return res.status(400).json({
        erro: 'Resultado é obrigatório para exames REALIZADO ou ENTREGUE.'
      })
    }

    const result = await pool.query(
      `
      UPDATE exames
      SET
        nome_exame = $1,
        descricao = $2,
        status = $3,
        data_exame = $4,
        resultado = $5,
        observacoes = $6
      WHERE id = $7
      RETURNING *
      `,
      [
        nome_exame,
        descricao,
        status,
        data_exame,
        resultado,
        observacoes,
        id
      ]
    )

    res.json(result.rows[0])
  } catch (error) {
    console.error('Erro ao atualizar exame:', error)
    res.status(500).json({ erro: 'Erro ao atualizar exame.' })
  }
}

// Deletar exame
const deletarExame = async (req, res) => {
  try {
    const { perfil } = req.usuario

    if (perfil !== 'SECRETARIO') {
      return res.status(403).json({
        erro: 'Apenas secretários podem excluir exames'
      })
    }

    const { id } = req.params

    const exameExiste = await pool.query(
      'SELECT * FROM exames WHERE id = $1',
      [id]
    )

    if (exameExiste.rows.length === 0) {
      return res.status(404).json({ erro: 'Exame não encontrado.' })
    }

    await pool.query('DELETE FROM exames WHERE id = $1', [id])

    res.json({ mensagem: 'Exame excluído com sucesso.' })
  } catch (error) {
    console.error('Erro ao deletar exame:', error)
    res.status(500).json({ erro: 'Erro ao deletar exame.' })
  }
}

module.exports = {
  listarExames,
  buscarExamePorId,
  criarExame,
  atualizarExame,
  deletarExame
}