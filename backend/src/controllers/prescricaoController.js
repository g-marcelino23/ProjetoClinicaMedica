const pool = require('../config/db')

// Listar todas as prescrições - médico e secretário
const listarPrescricoes = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                p.*,
                u_paciente.nome AS paciente_nome,
                u_medico.nome AS medico_nome
            FROM prescricoes p
            JOIN pacientes pa ON pa.id = p.paciente_id
            JOIN medicos m ON m.id = p.medico_id
            JOIN usuarios u_paciente ON u_paciente.id = pa.usuario_id
            JOIN usuarios u_medico ON u_medico.id = m.usuario_id
            ORDER BY p.data_prescricao DESC
        `)

        res.status(200).json(result.rows)
    } catch (error) {
        console.error('Erro ao listar prescrições:', error)
        res.status(500).json({ mensagem: 'Erro ao listar prescrições' })
    }
}

// Listar prescrições do paciente logado
const listarMinhasPrescricoes = async (req, res) => {
    try {
        const usuarioId = req.usuario.id

        const pacienteResult = await pool.query(
            `
            SELECT id
            FROM pacientes
            WHERE usuario_id = $1
            `,
            [usuarioId]
        )

        if (pacienteResult.rows.length === 0) {
            return res.status(404).json({ mensagem: 'Paciente não encontrado' })
        }

        const pacienteId = pacienteResult.rows[0].id

        const result = await pool.query(
            `
            SELECT 
                p.*,
                u_medico.nome AS medico_nome
            FROM prescricoes p
            JOIN medicos m ON m.id = p.medico_id
            JOIN usuarios u_medico ON u_medico.id = m.usuario_id
            WHERE p.paciente_id = $1
            ORDER BY p.data_prescricao DESC
            `,
            [pacienteId]
        )

        res.status(200).json(result.rows)
    } catch (error) {
        console.error('Erro ao listar prescrições do paciente:', error)
        res.status(500).json({ mensagem: 'Erro ao listar prescrições do paciente' })
    }
}

// Buscar prescrição por ID
const buscarPrescricaoPorId = async (req, res) => {
    try {
        const { id } = req.params

        const result = await pool.query(
            `
            SELECT 
                p.*,
                u_paciente.nome AS paciente_nome,
                u_medico.nome AS medico_nome
            FROM prescricoes p
            JOIN pacientes pa ON pa.id = p.paciente_id
            JOIN medicos m ON m.id = p.medico_id
            JOIN usuarios u_paciente ON u_paciente.id = pa.usuario_id
            JOIN usuarios u_medico ON u_medico.id = m.usuario_id
            WHERE p.id = $1
            `,
            [id]
        )

        if (result.rows.length === 0) {
            return res.status(404).json({ mensagem: 'Prescrição não encontrada' })
        }

        res.status(200).json(result.rows[0])
    } catch (error) {
        console.error('Erro ao buscar prescrição:', error)
        res.status(500).json({ mensagem: 'Erro ao buscar prescrição' })
    }
}

// Criar prescrição
const criarPrescricao = async (req, res) => {
    try {
        const {
            consulta_id,
            medicamento,
            dosagem,
            frequencia,
            duracao,
            observacoes
        } = req.body

        if (!consulta_id || !medicamento || !dosagem || !frequencia || !duracao) {
            return res.status(400).json({
                mensagem: 'consulta_id, medicamento, dosagem, frequencia e duracao são obrigatórios'
            })
        }

        const consultaResult = await pool.query(
            `
            SELECT id, paciente_id, medico_id
            FROM consultas
            WHERE id = $1
            `,
            [consulta_id]
        )

        if (consultaResult.rows.length === 0) {
            return res.status(404).json({ mensagem: 'Consulta não encontrada' })
        }

        const consulta = consultaResult.rows[0]

        const novaPrescricao = await pool.query(
            `
            INSERT INTO prescricoes
            (
                consulta_id,
                paciente_id,
                medico_id,
                medicamento,
                dosagem,
                frequencia,
                duracao,
                observacoes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            `,
            [
                consulta_id,
                consulta.paciente_id,
                consulta.medico_id,
                medicamento,
                dosagem,
                frequencia,
                duracao,
                observacoes || null
            ]
        )

        res.status(201).json({
            mensagem: 'Prescrição criada com sucesso',
            prescricao: novaPrescricao.rows[0]
        })
    } catch (error) {
        console.error('Erro ao criar prescrição:', error)
        res.status(500).json({ mensagem: 'Erro ao criar prescrição' })
    }
}

// Atualizar prescrição
const atualizarPrescricao = async (req, res) => {
    try {
        const { id } = req.params
        const {
            medicamento,
            dosagem,
            frequencia,
            duracao,
            observacoes
        } = req.body

        const result = await pool.query(
            `
            UPDATE prescricoes
            SET
                medicamento = $1,
                dosagem = $2,
                frequencia = $3,
                duracao = $4,
                observacoes = $5
            WHERE id = $6
            RETURNING *
            `,
            [
                medicamento,
                dosagem,
                frequencia,
                duracao,
                observacoes || null,
                id
            ]
        )

        if (result.rows.length === 0) {
            return res.status(404).json({ mensagem: 'Prescrição não encontrada' })
        }

        res.status(200).json({
            mensagem: 'Prescrição atualizada com sucesso',
            prescricao: result.rows[0]
        })
    } catch (error) {
        console.error('Erro ao atualizar prescrição:', error)
        res.status(500).json({ mensagem: 'Erro ao atualizar prescrição' })
    }
}

// Deletar prescrição
const deletarPrescricao = async (req, res) => {
    try {
        const { id } = req.params

        const result = await pool.query(
            'DELETE FROM prescricoes WHERE id = $1 RETURNING *',
            [id]
        )

        if (result.rows.length === 0) {
            return res.status(404).json({ mensagem: 'Prescrição não encontrada' })
        }

        res.status(200).json({ mensagem: 'Prescrição removida com sucesso' })
    } catch (error) {
        console.error('Erro ao deletar prescrição:', error)
        res.status(500).json({ mensagem: 'Erro ao deletar prescrição' })
    }
}

module.exports = {
    listarPrescricoes,
    listarMinhasPrescricoes,
    buscarPrescricaoPorId,
    criarPrescricao,
    atualizarPrescricao,
    deletarPrescricao
}