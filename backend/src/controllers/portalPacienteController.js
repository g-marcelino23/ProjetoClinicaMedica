const pool = require('../config/db');

const buscarMeuPerfilPaciente = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;

        const result = await pool.query(
            `SELECT
         p.id,
         p.usuario_id,
         u.nome,
         u.email,
         p.cpf,
         p.data_nascimento,
         p.telefone,
         p.endereco,
         p.convenio,
         p.numero_convenio
       FROM pacientes p
       JOIN usuarios u ON u.id = p.usuario_id
       WHERE p.usuario_id = $1`,
            [usuarioId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ erro: 'Paciente não encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
};

const listarMinhasConsultas = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;

        const pacienteResult = await pool.query(
            'SELECT id FROM pacientes WHERE usuario_id = $1',
            [usuarioId]
        );

        if (pacienteResult.rows.length === 0) {
            return res.status(404).json({ erro: 'Paciente não encontrado' });
        }

        const pacienteId = pacienteResult.rows[0].id;

        const result = await pool.query(
            `SELECT
         c.id,
         c.data_consulta,
         c.hora_consulta,
         c.motivo,
         c.status,
         c.observacoes,
         c.checkin_realizado,
         u.nome AS medico_nome,
         m.especialidade
       FROM consultas c
       JOIN medicos m ON m.id = c.medico_id
       JOIN usuarios u ON u.id = m.usuario_id
       WHERE c.paciente_id = $1
       ORDER BY c.data_consulta DESC, c.hora_consulta DESC`,
            [pacienteId]
        );

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
};

const listarMeusExames = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;

        const pacienteResult = await pool.query(
            'SELECT id FROM pacientes WHERE usuario_id = $1',
            [usuarioId]
        );

        if (pacienteResult.rows.length === 0) {
            return res.status(404).json({ erro: 'Paciente não encontrado' });
        }

        const pacienteId = pacienteResult.rows[0].id;

        const result = await pool.query(
            `SELECT
         e.id,
         e.nome_exame,
         e.descricao,
         e.status,
         e.data_exame,
         e.resultado,
         e.observacoes,
         u.nome AS medico_nome
       FROM exames e
       JOIN medicos m ON m.id = e.medico_id
       JOIN usuarios u ON u.id = m.usuario_id
       WHERE e.paciente_id = $1
       ORDER BY e.created_at DESC`,
            [pacienteId]
        );

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
};

const listarMinhasPrescricoes = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;

        const pacienteResult = await pool.query(
            'SELECT id FROM pacientes WHERE usuario_id = $1',
            [usuarioId]
        );

        if (pacienteResult.rows.length === 0) {
            return res.status(404).json({ erro: 'Paciente não encontrado' });
        }

        const pacienteId = pacienteResult.rows[0].id;

        const result = await pool.query(
            `SELECT
         pr.id,
         pr.consulta_id,
         pr.descricao,
         pr.orientacoes,
         pr.created_at,
         u.nome AS medico_nome
       FROM prescricoes pr
       JOIN medicos m ON m.id = pr.medico_id
       JOIN usuarios u ON u.id = m.usuario_id
       WHERE pr.paciente_id = $1
       ORDER BY pr.created_at DESC`,
            [pacienteId]
        );

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
};

module.exports = {
    buscarMeuPerfilPaciente,
    listarMinhasConsultas,
    listarMeusExames,
    listarMinhasPrescricoes
};