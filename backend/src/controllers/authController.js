const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    const client = await pool.connect();

    try {
        const {
            nome,
            email,
            senha,
            perfil,
            cpf,
            telefone,
            data_nascimento,
            endereco,
            crm,
            especialidade
        } = req.body;

        if (!nome || !email || !senha || !perfil) {
            return res.status(400).json({
                erro: 'Nome, email, senha e perfil são obrigatórios'
            });
        }

        if (!['PACIENTE', 'MEDICO', 'SECRETARIO'].includes(perfil)) {
            return res.status(400).json({
                erro: 'Perfil inválido'
            });
        }

        if (perfil === 'PACIENTE' && !cpf) {
            return res.status(400).json({
                erro: 'CPF é obrigatório para paciente'
            });
        }

        if (perfil === 'MEDICO' && (!crm || !especialidade)) {
            return res.status(400).json({
                erro: 'CRM e especialidade são obrigatórios para médico'
            });
        }

        const usuarioExiste = await client.query(
            'SELECT id FROM usuarios WHERE email = $1',
            [email]
        );

        if (usuarioExiste.rows.length > 0) {
            return res.status(400).json({
                erro: 'Já existe um usuário com este e-mail'
            });
        }

        // verifica CPF duplicado apenas para paciente
        if (perfil === 'PACIENTE' && cpf) {
            const cpfPacienteExiste = await client.query(
                'SELECT id FROM pacientes WHERE cpf = $1',
                [cpf]
            );

            if (cpfPacienteExiste.rows.length > 0) {
                return res.status(400).json({
                    erro: 'Já existe cadastro com este CPF'
                });
            }
        }

        // verifica CRM duplicado apenas para médico
        if (perfil === 'MEDICO' && crm) {
            const crmExiste = await client.query(
                'SELECT id FROM medicos WHERE crm = $1',
                [crm]
            );

            if (crmExiste.rows.length > 0) {
                return res.status(400).json({
                    erro: 'Já existe médico cadastrado com este CRM'
                });
            }
        }

        await client.query('BEGIN');

        const senhaHash = await bcrypt.hash(senha, 10);

        const usuarioResult = await client.query(
            `INSERT INTO usuarios (nome, email, senha, perfil)
             VALUES ($1, $2, $3, $4)
             RETURNING id, nome, email, perfil`,
            [nome, email, senhaHash, perfil]
        );

        const usuario = usuarioResult.rows[0];

        if (perfil === 'PACIENTE') {
            await client.query(
                `INSERT INTO pacientes (usuario_id, cpf, telefone, data_nascimento, endereco)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    usuario.id,
                    cpf,
                    telefone || null,
                    data_nascimento || null,
                    endereco || null
                ]
            );
        }

        if (perfil === 'MEDICO') {
            await client.query(
                `INSERT INTO medicos (usuario_id, crm, especialidade)
                 VALUES ($1, $2, $3)`,
                [
                    usuario.id,
                    crm,
                    especialidade
                ]
            );
        }

        await client.query('COMMIT');

        return res.status(201).json({
            mensagem: 'Usuário criado com sucesso',
            usuario
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro no register:', error);
        return res.status(500).json({
            erro: 'Erro ao cadastrar usuário'
        });
    } finally {
        client.release();
    }
};

const login = async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                erro: 'Email e senha são obrigatórios'
            });
        }

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

        return res.json({
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
        return res.status(500).json({ erro: 'Erro ao realizar login' });
    }
};

module.exports = {
    register,
    login
};