const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ erro: 'Token não fornecido' });
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ erro: 'Token não fornecido' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const usuario = {
            id: decoded.id,
            perfil: decoded.perfil,
            nome: decoded.nome || null,
            email: decoded.email || null,
            paciente_id: null,
            medico_id: null
        };

        if (decoded.perfil === 'PACIENTE') {
            const pacienteResult = await pool.query(
                'SELECT id FROM pacientes WHERE usuario_id = $1',
                [decoded.id]
            );

            if (pacienteResult.rows.length > 0) {
                usuario.paciente_id = pacienteResult.rows[0].id;
            }
        }

        if (decoded.perfil === 'MEDICO') {
            const medicoResult = await pool.query(
                'SELECT id FROM medicos WHERE usuario_id = $1',
                [decoded.id]
            );

            if (medicoResult.rows.length > 0) {
                usuario.medico_id = medicoResult.rows[0].id;
            }
        }

        req.usuario = usuario;

        next();
    } catch (error) {
        console.error('Erro no authMiddleware:', error);
        return res.status(401).json({ erro: 'Token inválido' });
    }
};

module.exports = authMiddleware;