const pool = require('../config/db');

const relatorioConsultas = async (req, res) => {
    try {
        const { data_inicial, data_final, status } = req.query;

        let query = `
      SELECT
        c.id,
        c.data_consulta,
        c.hora_consulta,
        c.status,
        c.motivo,
        up.nome AS paciente_nome,
        um.nome AS medico_nome,
        m.especialidade
      FROM consultas c
      JOIN pacientes p ON p.id = c.paciente_id
      JOIN usuarios up ON up.id = p.usuario_id
      JOIN medicos m ON m.id = c.medico_id
      JOIN usuarios um ON um.id = m.usuario_id
      WHERE 1=1
    `;

        const params = [];
        let index = 1;

        if (data_inicial) {
            query += ` AND c.data_consulta >= $${index}`;
            params.push(data_inicial);
            index++;
        }

        if (data_final) {
            query += ` AND c.data_consulta <= $${index}`;
            params.push(data_final);
            index++;
        }

        if (status) {
            query += ` AND c.status = $${index}`;
            params.push(status);
            index++;
        }

        query += ` ORDER BY c.data_consulta DESC, c.hora_consulta DESC`;

        const result = await pool.query(query, params);

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
};

const relatorioExames = async (req, res) => {
    try {
        const { data_inicial, data_final, status } = req.query;

        let query = `
      SELECT
        e.id,
        e.nome_exame,
        e.status,
        e.data_exame,
        up.nome AS paciente_nome,
        um.nome AS medico_nome,
        e.resultado
      FROM exames e
      JOIN pacientes p ON p.id = e.paciente_id
      JOIN usuarios up ON up.id = p.usuario_id
      JOIN medicos m ON m.id = e.medico_id
      JOIN usuarios um ON um.id = m.usuario_id
      WHERE 1=1
    `;

        const params = [];
        let index = 1;

        if (data_inicial) {
            query += ` AND e.data_exame >= $${index}`;
            params.push(data_inicial);
            index++;
        }

        if (data_final) {
            query += ` AND e.data_exame <= $${index}`;
            params.push(data_final);
            index++;
        }

        if (status) {
            query += ` AND e.status = $${index}`;
            params.push(status);
            index++;
        }

        query += ` ORDER BY e.data_exame DESC NULLS LAST`;

        const result = await pool.query(query, params);

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
};

const relatorioAtendimentosPorMedico = async (req, res) => {
    try {
        const { data_inicial, data_final } = req.query;

        let query = `
      SELECT
        m.id AS medico_id,
        u.nome AS medico_nome,
        m.especialidade,
        COUNT(c.id) AS total_atendimentos
      FROM medicos m
      JOIN usuarios u ON u.id = m.usuario_id
      LEFT JOIN consultas c ON c.medico_id = m.id
      WHERE 1=1
    `;

        const params = [];
        let index = 1;

        if (data_inicial) {
            query += ` AND c.data_consulta >= $${index}`;
            params.push(data_inicial);
            index++;
        }

        if (data_final) {
            query += ` AND c.data_consulta <= $${index}`;
            params.push(data_final);
            index++;
        }

        query += `
      GROUP BY m.id, u.nome, m.especialidade
      ORDER BY total_atendimentos DESC, u.nome ASC
    `;

        const result = await pool.query(query, params);

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
};

module.exports = {
    relatorioConsultas,
    relatorioExames,
    relatorioAtendimentosPorMedico
};