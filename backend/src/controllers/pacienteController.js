const pool = require('../config/db');

const criarPaciente = async (req, res, next) => {
    try {
        const {
            usuario_id,
            cpf,
            data_nascimento,
            telefone,
            endereco,
            convenio,
            numero_convenio
        } = req.body;

        if (!usuario_id || !cpf) {
            return res.status(400).json({
                erro: 'usuario_id e cpf são obrigatórios'
            });
        }

        const usuarioExiste = await pool.query(
            'SELECT id, perfil FROM usuarios WHERE id = $1',
            [usuario_id]
        );

        if (usuarioExiste.rows.length === 0) {
            return res.status(404).json({ erro: 'Usuário não encontrado' });
        }

        if (usuarioExiste.rows[0].perfil !== 'PACIENTE') {
            return res.status(400).json({
                erro: 'O usuário informado não possui perfil PACIENTE'
            });
        }

        const pacienteExiste = await pool.query(
            'SELECT id FROM pacientes WHERE usuario_id = $1',
            [usuario_id]
        );

        if (pacienteExiste.rows.length > 0) {
            return res.status(400).json({
                erro: 'Já existe um paciente vinculado a esse usuário'
            });
        }

        const result = await pool.query(
            `INSERT INTO pacientes
      (usuario_id, cpf, cpf_lookup, data_nascimento, telefone, endereco, convenio, numero_convenio)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
            [
                usuario_id,
                cpf,
                req.body.cpf_lookup,
                data_nascimento,
                telefone,
                endereco,
                convenio,
                numero_convenio
            ]
        );

        res.status(201).json({
            mensagem: 'Paciente criado com sucesso',
            paciente: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
};

const listarPacientes = async (req, res, next) => {
    try {
        const result = await pool.query(`
      SELECT
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
      ORDER BY p.id
    `);

        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

const buscarPacientePorId = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
      SELECT
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
      WHERE p.id = $1
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ erro: 'Paciente não encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

const atualizarPaciente = async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            cpf,
            data_nascimento,
            telefone,
            endereco,
            convenio,
            numero_convenio
        } = req.body;

        const pacienteExiste = await pool.query(
            'SELECT id, usuario_id FROM pacientes WHERE id = $1',
            [id]
        );

        if (pacienteExiste.rows.length === 0) {
            return res.status(404).json({ erro: 'Paciente não encontrado' });
        }

        const result = await pool.query(
            `UPDATE pacientes
       SET cpf = $1,
           cpf_lookup = $2,
           data_nascimento = $3,
           telefone = $4,
           endereco = $5,
           convenio = $6,
           numero_convenio = $7
       WHERE id = $8
       RETURNING *`,
            [
                cpf,
                req.body.cpf_lookup,
                data_nascimento,
                telefone,
                endereco,
                convenio,
                numero_convenio,
                id
            ]
        );

        res.json({
            mensagem: 'Paciente atualizado com sucesso',
            paciente: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
};

const deletarPaciente = async (req, res, next) => {
    try {
        const { id } = req.params;

        const pacienteExiste = await pool.query(
            'SELECT * FROM pacientes WHERE id = $1',
            [id]
        );

        if (pacienteExiste.rows.length === 0) {
            return res.status(404).json({ erro: 'Paciente não encontrado' });
        }

        await pool.query(
            `UPDATE usuarios
             SET ativo = false, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [pacienteExiste.rows[0].usuario_id]
        );

        res.json({ mensagem: 'Acesso do paciente desativado com sucesso' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    criarPaciente,
    listarPacientes,
    buscarPacientePorId,
    atualizarPaciente,
    deletarPaciente
};
