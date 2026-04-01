const pool = require('../config/db');

const criarMedico = async (req, res) => {
    try {
        const {
            usuario_id,
            crm,
            especialidade,
            telefone
        } = req.body;

        if (!usuario_id || !crm || !especialidade) {
            return res.status(400).json({
                erro: 'usuario_id, crm e especialidade são obrigatórios'
            });
        }

        const usuarioExiste = await pool.query(
            'SELECT id, perfil FROM usuarios WHERE id = $1',
            [usuario_id]
        );

        if (usuarioExiste.rows.length === 0) {
            return res.status(404).json({ erro: 'Usuário não encontrado' });
        }

        if (usuarioExiste.rows[0].perfil !== 'MEDICO') {
            return res.status(400).json({
                erro: 'O usuário informado não possui perfil MEDICO'
            });
        }

        const medicoExiste = await pool.query(
            'SELECT id FROM medicos WHERE usuario_id = $1',
            [usuario_id]
        );

        if (medicoExiste.rows.length > 0) {
            return res.status(400).json({
                erro: 'Já existe um médico vinculado a esse usuário'
            });
        }

        const crmExiste = await pool.query(
            'SELECT id FROM medicos WHERE crm = $1',
            [crm]
        );

        if (crmExiste.rows.length > 0) {
            return res.status(400).json({
                erro: 'Já existe um médico cadastrado com esse CRM'
            });
        }

        const result = await pool.query(
            `INSERT INTO medicos (usuario_id, crm, especialidade, telefone)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
            [usuario_id, crm, especialidade, telefone]
        );

        res.status(201).json({
            mensagem: 'Médico criado com sucesso',
            medico: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
};

const listarMedicos = async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT
        m.id,
        m.usuario_id,
        u.nome,
        u.email,
        m.crm,
        m.especialidade,
        m.telefone
      FROM medicos m
      JOIN usuarios u ON u.id = m.usuario_id
      ORDER BY m.id
    `);

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
};

const buscarMedicoPorId = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
      SELECT
        m.id,
        m.usuario_id,
        u.nome,
        u.email,
        m.crm,
        m.especialidade,
        m.telefone
      FROM medicos m
      JOIN usuarios u ON u.id = m.usuario_id
      WHERE m.id = $1
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ erro: 'Médico não encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
};

const atualizarMedico = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            crm,
            especialidade,
            telefone
        } = req.body;

        const medicoExiste = await pool.query(
            'SELECT * FROM medicos WHERE id = $1',
            [id]
        );

        if (medicoExiste.rows.length === 0) {
            return res.status(404).json({ erro: 'Médico não encontrado' });
        }

        const crmDuplicado = await pool.query(
            'SELECT id FROM medicos WHERE crm = $1 AND id <> $2',
            [crm, id]
        );

        if (crmDuplicado.rows.length > 0) {
            return res.status(400).json({
                erro: 'Já existe outro médico com esse CRM'
            });
        }

        const result = await pool.query(
            `UPDATE medicos
       SET crm = $1,
           especialidade = $2,
           telefone = $3
       WHERE id = $4
       RETURNING *`,
            [crm, especialidade, telefone, id]
        );

        res.json({
            mensagem: 'Médico atualizado com sucesso',
            medico: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
};

const deletarMedico = async (req, res) => {
    try {
        const { id } = req.params;

        const medicoExiste = await pool.query(
            'SELECT * FROM medicos WHERE id = $1',
            [id]
        );

        if (medicoExiste.rows.length === 0) {
            return res.status(404).json({ erro: 'Médico não encontrado' });
        }

        await pool.query('DELETE FROM medicos WHERE id = $1', [id]);

        res.json({ mensagem: 'Médico deletado com sucesso' });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
};

module.exports = {
    criarMedico,
    listarMedicos,
    buscarMedicoPorId,
    atualizarMedico,
    deletarMedico
};