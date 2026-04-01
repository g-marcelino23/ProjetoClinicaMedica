const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    try {
        const { nome, email, senha, perfil } = req.body;

        const usuarioExiste = await pool.query(
            'SELECT id FROM usuarios WHERE email = $1',
            [email]
        );

        if (usuarioExiste.rows.length > 0) {
            return res.status(400).json({ erro: 'Já existe um usuário com este e-mail' });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const usuarioResult = await pool.query(
            `INSERT INTO usuarios (nome, email, senha, perfil)
             VALUES ($1, $2, $3, $4)
             RETURNING id, nome, email, perfil`,
            [nome, email, senhaHash, perfil]
        );

        const usuario = usuarioResult.rows[0];

        // 🔥 CRIA AUTOMATICAMENTE PACIENTE
        if (perfil === 'PACIENTE') {
            await pool.query(
                `INSERT INTO pacientes (usuario_id, cpf)
                 VALUES ($1, $2)`,
                [usuario.id, '00000000000'] // pode ajustar depois
            );
        }

        // 🔥 CRIA AUTOMATICAMENTE MEDICO
        if (perfil === 'MEDICO') {
            await pool.query(
                `INSERT INTO medicos (usuario_id, crm, especialidade)
                 VALUES ($1, $2, $3)`,
                [usuario.id, '0000', 'Clínico Geral']
            );
        }

        res.status(201).json({
            mensagem: 'Usuário criado com sucesso',
            usuario
        });

    } catch (error) {
        console.error('Erro no register:', error);
        res.status(500).json({ erro: 'Erro ao cadastrar usuário' });
    }
};

const login = async (req, res) => {
    try {
        const { email, senha } = req.body;

        const result = await pool.query(
            'SELECT * FROM usuarios WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ erro: 'Usuário não encontrado' });
        }

        const usuario = result.rows[0];

        const senhaValida = await bcrypt.compare(senha, usuario.senha);

        if (!senhaValida) {
            return res.status(401).json({ erro: 'Senha inválida' });
        }

        let paciente_id = null;
        let medico_id = null;

        if (usuario.perfil === 'PACIENTE') {
            const pacienteResult = await pool.query(
                'SELECT id FROM pacientes WHERE usuario_id = $1',
                [usuario.id]
            );

            if (pacienteResult.rows.length > 0) {
                paciente_id = pacienteResult.rows[0].id;
            }
        }

        if (usuario.perfil === 'MEDICO') {
            const medicoResult = await pool.query(
                'SELECT id FROM medicos WHERE usuario_id = $1',
                [usuario.id]
            );

            if (medicoResult.rows.length > 0) {
                medico_id = medicoResult.rows[0].id;
            }
        }

        const token = jwt.sign(
            {
                id: usuario.id,
                perfil: usuario.perfil
            },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            mensagem: 'Login realizado com sucesso',
            token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                perfil: usuario.perfil,
                paciente_id,
                medico_id
            }
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ erro: 'Erro ao realizar login' });
    }
};

module.exports = {
    register,
    login
};