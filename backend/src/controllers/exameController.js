const pool = require('../config/db');

const listarExames = async (req, res) => {
  try {
    const { perfil, paciente_id } = req.usuario;

    let result;

    if (perfil === 'PACIENTE') {
      if (!paciente_id) {
        return res.status(403).json({
          erro: 'Paciente não vinculado corretamente ao usuário.'
        });
      }

      result = await pool.query(
        `
        SELECT 
          e.*,
          p.nome AS paciente_nome,
          m.nome AS medico_nome
        FROM exames e
        LEFT JOIN pacientes p ON p.id = e.paciente_id
        LEFT JOIN medicos m ON m.id = e.medico_id
        WHERE e.paciente_id = $1
        ORDER BY e.id DESC
        `,
        [paciente_id]
      );
    } else {
      result = await pool.query(
        `
        SELECT 
          e.*,
          p.nome AS paciente_nome,
          m.nome AS medico_nome
        FROM exames e
        LEFT JOIN pacientes p ON p.id = e.paciente_id
        LEFT JOIN medicos m ON m.id = e.medico_id
        ORDER BY e.id DESC
        `
      );
    }

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar exames:', error);
    res.status(500).json({ erro: 'Erro ao listar exames.' });
  }
};

const buscarExamePorId = async (req, res) => {
  try {
    const { id } = req.params;
    const { perfil, paciente_id } = req.usuario;

    let result;

    if (perfil === 'PACIENTE') {
      if (!paciente_id) {
        return res.status(403).json({
          erro: 'Paciente não vinculado corretamente ao usuário.'
        });
      }

      result = await pool.query(
        `
        SELECT 
          e.*,
          p.nome AS paciente_nome,
          m.nome AS medico_nome
        FROM exames e
        LEFT JOIN pacientes p ON p.id = e.paciente_id
        LEFT JOIN medicos m ON m.id = e.medico_id
        WHERE e.id = $1 AND e.paciente_id = $2
        `,
        [id, paciente_id]
      );
    } else {
      result = await pool.query(
        `
        SELECT 
          e.*,
          p.nome AS paciente_nome,
          m.nome AS medico_nome
        FROM exames e
        LEFT JOIN pacientes p ON p.id = e.paciente_id
        LEFT JOIN medicos m ON m.id = e.medico_id
        WHERE e.id = $1
        `,
        [id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ erro: 'Exame não encontrado.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar exame:', error);
    res.status(500).json({ erro: 'Erro ao buscar exame.' });
  }
};

const criarExame = async (req, res) => {
  try {
    const { perfil } = req.usuario;

    // 🔒 proteção extra (mesmo com middleware)
    if (perfil === 'PACIENTE') {
      return res.status(403).json({
        erro: 'Paciente não pode cadastrar exames'
      });
    }

    const {
      consulta_id,
      paciente_id,
      medico_id,
      nome_exame,
      descricao,
      status,
      data_exame,
      resultado,
      observacoes
    } = req.body;

    if (!consulta_id || !paciente_id || !medico_id || !nome_exame) {
      return res.status(400).json({
        erro: 'consulta_id, paciente_id, medico_id e nome_exame são obrigatórios'
      });
    }

    const result = await pool.query(
      `
      INSERT INTO exames
      (consulta_id, paciente_id, medico_id, nome_exame, descricao, status, data_exame, resultado, observacoes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
      `,
      [
        consulta_id,
        paciente_id,
        medico_id,
        nome_exame,
        descricao,
        status,
        data_exame,
        resultado,
        observacoes
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar exame:', error);
    res.status(500).json({ erro: 'Erro ao criar exame.' });
  }
};

const atualizarExame = async (req, res) => {
  try {
    const { perfil } = req.usuario;

    if (perfil === 'PACIENTE') {
      return res.status(403).json({
        erro: 'Paciente não pode editar exames'
      });
    }

    const { id } = req.params;
    const {
      nome_exame,
      descricao,
      status,
      data_exame,
      resultado,
      observacoes
    } = req.body;

    const exameExiste = await pool.query(
      'SELECT * FROM exames WHERE id = $1',
      [id]
    );

    if (exameExiste.rows.length === 0) {
      return res.status(404).json({ erro: 'Exame não encontrado.' });
    }

    if ((status === 'REALIZADO' || status === 'ENTREGUE') && !resultado) {
      return res.status(400).json({
        erro: 'Resultado é obrigatório para exames REALIZADO ou ENTREGUE.'
      });
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
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar exame:', error);
    res.status(500).json({ erro: 'Erro ao atualizar exame.' });
  }
};

const deletarExame = async (req, res) => {
  try {
    const { perfil } = req.usuario;

    // 🔒 só secretário pode deletar
    if (perfil !== 'SECRETARIO') {
      return res.status(403).json({
        erro: 'Apenas secretários podem excluir exames'
      });
    }

    const { id } = req.params;

    const exameExiste = await pool.query(
      'SELECT * FROM exames WHERE id = $1',
      [id]
    );

    if (exameExiste.rows.length === 0) {
      return res.status(404).json({ erro: 'Exame não encontrado.' });
    }

    await pool.query('DELETE FROM exames WHERE id = $1', [id]);

    res.json({ mensagem: 'Exame excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao deletar exame:', error);
    res.status(500).json({ erro: 'Erro ao deletar exame.' });
  }
};

module.exports = {
  listarExames,
  buscarExamePorId,
  criarExame,
  atualizarExame,
  deletarExame
};