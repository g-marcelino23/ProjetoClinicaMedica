const pool = require('../config/db');

const criarNotificacao = async (req, res, next) => {
    try {
        const { usuario_id, titulo, mensagem, tipo } = req.body;

        if (!usuario_id || !titulo || !mensagem) {
            return res.status(400).json({
                erro: 'usuario_id, titulo e mensagem são obrigatórios'
            });
        }

        const usuarioExiste = await pool.query(
            'SELECT id FROM usuarios WHERE id = $1',
            [usuario_id]
        );

        if (usuarioExiste.rows.length === 0) {
            return res.status(404).json({ erro: 'Usuário não encontrado' });
        }

        const result = await pool.query(
            `INSERT INTO notificacoes (usuario_id, titulo, mensagem, tipo, lida)
       VALUES ($1, $2, $3, $4, false)
       RETURNING *`,
            [usuario_id, titulo, mensagem, tipo || null]
        );

        res.status(201).json({
            mensagem: 'Notificação criada com sucesso',
            notificacao: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
};

const listarMinhasNotificacoes = async (req, res, next) => {
    try {
        const usuarioId = req.usuario.id;

        const result = await pool.query(
            `SELECT id, usuario_id, titulo, mensagem, tipo, lida, created_at
       FROM notificacoes
       WHERE usuario_id = $1
       ORDER BY created_at DESC`,
            [usuarioId]
        );

        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

const marcarComoLida = async (req, res, next) => {
    try {
        const usuarioId = req.usuario.id;
        const { id } = req.params;

        const notificacaoExiste = await pool.query(
            'SELECT * FROM notificacoes WHERE id = $1 AND usuario_id = $2',
            [id, usuarioId]
        );

        if (notificacaoExiste.rows.length === 0) {
            return res.status(404).json({ erro: 'Notificação não encontrada' });
        }

        const notificacao = notificacaoExiste.rows[0];

        if (notificacao.usuario_id !== usuarioId) {
            return res.status(403).json({
                erro: 'Você não pode alterar uma notificação que não é sua'
            });
        }

        const result = await pool.query(
            `UPDATE notificacoes
       SET lida = true
       WHERE id = $1 AND usuario_id = $2
       RETURNING *`,
            [id, usuarioId]
        );

        res.json({
            mensagem: 'Notificação marcada como lida',
            notificacao: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    criarNotificacao,
    listarMinhasNotificacoes,
    marcarComoLida
};
