const pool = require('../config/db');

const realizarCheckin = async (req, res) => {
    try {
        const usuarioId = req.usuario.id;
        const { consultaId } = req.params;

        const pacienteResult = await pool.query(
            'SELECT id FROM pacientes WHERE usuario_id = $1',
            [usuarioId]
        );

        if (pacienteResult.rows.length === 0) {
            return res.status(404).json({ erro: 'Paciente não encontrado' });
        }

        const pacienteId = pacienteResult.rows[0].id;

        const consultaResult = await pool.query(
            'SELECT * FROM consultas WHERE id = $1',
            [consultaId]
        );

        if (consultaResult.rows.length === 0) {
            return res.status(404).json({ erro: 'Consulta não encontrada' });
        }

        const consulta = consultaResult.rows[0];

        if (consulta.paciente_id !== pacienteId) {
            return res.status(403).json({
                erro: 'Você não pode fazer check-in em uma consulta que não é sua'
            });
        }

        if (!['AGENDADA', 'CONFIRMADA'].includes(consulta.status)) {
            return res.status(400).json({
                erro: 'Check-in só pode ser feito em consultas agendadas ou confirmadas'
            });
        }

        if (consulta.checkin_realizado) {
            return res.status(400).json({
                erro: 'Check-in já realizado para esta consulta'
            });
        }

        const result = await pool.query(
            `UPDATE consultas
       SET checkin_realizado = true,
           status = 'CONFIRMADA',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
            [consultaId]
        );

        res.json({
            mensagem: 'Check-in realizado com sucesso',
            consulta: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
};

module.exports = {
    realizarCheckin
};