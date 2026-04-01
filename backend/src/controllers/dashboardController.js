const pool = require('../config/db');

const obterResumoDashboard = async (req, res) => {
    try {
        const totalPacientes = await pool.query(
            'SELECT COUNT(*) AS total FROM pacientes'
        );

        const totalMedicos = await pool.query(
            'SELECT COUNT(*) AS total FROM medicos'
        );

        const totalConsultas = await pool.query(
            'SELECT COUNT(*) AS total FROM consultas'
        );

        const totalExames = await pool.query(
            'SELECT COUNT(*) AS total FROM exames'
        );

        const totalListaEspera = await pool.query(
            "SELECT COUNT(*) AS total FROM lista_espera WHERE status = 'ATIVO'"
        );

        const consultasPorStatus = await pool.query(`
      SELECT status, COUNT(*) AS total
      FROM consultas
      GROUP BY status
      ORDER BY status
    `);

        const examesPorStatus = await pool.query(`
      SELECT status, COUNT(*) AS total
      FROM exames
      GROUP BY status
      ORDER BY status
    `);

        res.json({
            pacientes: Number(totalPacientes.rows[0].total),
            medicos: Number(totalMedicos.rows[0].total),
            consultas: Number(totalConsultas.rows[0].total),
            exames: Number(totalExames.rows[0].total),
            lista_espera_ativa: Number(totalListaEspera.rows[0].total),
            consultas_por_status: consultasPorStatus.rows,
            exames_por_status: examesPorStatus.rows
        });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
};

module.exports = {
    obterResumoDashboard
};