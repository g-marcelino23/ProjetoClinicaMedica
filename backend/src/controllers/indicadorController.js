const pool = require('../config/db');

const obterIndicadores = async (req, res) => {
    try {
        const { data_inicial, data_final } = req.query;

        let filtroData = '';
        const params = [];
        let index = 1;

        if (data_inicial) {
            filtroData += ` AND data_consulta >= $${index}`;
            params.push(data_inicial);
            index++;
        }

        if (data_final) {
            filtroData += ` AND data_consulta <= $${index}`;
            params.push(data_final);
            index++;
        }

        const totalConsultasResult = await pool.query(
            `SELECT COUNT(*) AS total
       FROM consultas
       WHERE 1=1 ${filtroData}`,
            params
        );

        const realizadasResult = await pool.query(
            `SELECT COUNT(*) AS total
       FROM consultas
       WHERE status = 'REALIZADA' ${filtroData}`,
            params
        );

        const canceladasResult = await pool.query(
            `SELECT COUNT(*) AS total
       FROM consultas
       WHERE status = 'CANCELADA' ${filtroData}`,
            params
        );

        const faltasResult = await pool.query(
            `SELECT COUNT(*) AS total
       FROM consultas
       WHERE status = 'FALTOU' ${filtroData}`,
            params
        );

        const checkinsResult = await pool.query(
            `SELECT COUNT(*) AS total
       FROM consultas
       WHERE checkin_realizado = true ${filtroData}`,
            params
        );

        const totalConsultas = Number(totalConsultasResult.rows[0].total);
        const realizadas = Number(realizadasResult.rows[0].total);
        const canceladas = Number(canceladasResult.rows[0].total);
        const faltas = Number(faltasResult.rows[0].total);
        const checkins = Number(checkinsResult.rows[0].total);

        const taxaFaltas = totalConsultas > 0
            ? ((faltas / totalConsultas) * 100).toFixed(2)
            : '0.00';

        const taxaCancelamentos = totalConsultas > 0
            ? ((canceladas / totalConsultas) * 100).toFixed(2)
            : '0.00';

        const taxaComparecimento = totalConsultas > 0
            ? ((realizadas / totalConsultas) * 100).toFixed(2)
            : '0.00';

        res.json({
            total_consultas: totalConsultas,
            atendimentos_realizados: realizadas,
            cancelamentos: canceladas,
            faltas,
            checkins_realizados: checkins,
            taxa_faltas: `${taxaFaltas}%`,
            taxa_cancelamentos: `${taxaCancelamentos}%`,
            taxa_comparecimento: `${taxaComparecimento}%`
        });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
};

module.exports = {
    obterIndicadores
};