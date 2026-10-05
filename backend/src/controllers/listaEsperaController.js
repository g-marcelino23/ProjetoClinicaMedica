const pool = require('../config/db');
const {
    rollbackTransaction,
} = require('../services/transactionService');
const {
    canTransitionWaitingList
} = require('../domain/workflowPolicy');

const criarEntradaListaEspera = async (req, res, next) => {
    try {
        const {
            paciente_id,
            medico_id,
            especialidade,
            data_desejada
        } = req.body;

        if (!paciente_id) {
            return res.status(400).json({
                erro: 'paciente_id é obrigatório'
            });
        }

        const pacienteExiste = await pool.query(
            'SELECT id FROM pacientes WHERE id = $1',
            [paciente_id]
        );

        if (pacienteExiste.rows.length === 0) {
            return res.status(404).json({
                erro: 'Paciente não encontrado'
            });
        }

        if (medico_id) {
            const medicoExiste = await pool.query(
                'SELECT id, especialidade FROM medicos WHERE id = $1',
                [medico_id]
            );

            if (medicoExiste.rows.length === 0) {
                return res.status(404).json({
                    erro: 'Médico não encontrado'
                });
            }

            if (
                especialidade &&
                medicoExiste.rows[0].especialidade !== especialidade
            ) {
                return res.status(409).json({
                    erro: 'A especialidade informada não corresponde ao médico'
                });
            }
        }

        const result = await pool.query(
            `INSERT INTO lista_espera
            (paciente_id, medico_id, especialidade, data_desejada, status)
            VALUES ($1, $2, $3, $4, 'ATIVO')
            RETURNING *`,
            [
                paciente_id,
                medico_id || null,
                especialidade || null,
                data_desejada || null
            ]
        );

        res.status(201).json({
            mensagem: 'Paciente adicionado à lista de espera com sucesso',
            item: result.rows[0]
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({
                erro: 'Paciente já possui entrada ativa equivalente na fila'
            });
        }

        next(error);
    }
};

const listarListaEspera = async (req, res, next) => {
    try {
        const perfil = req.usuario?.perfil;
        const usuarioId = req.usuario?.id;

        if (perfil === 'PACIENTE') {
            const pacienteResult = await pool.query(
                'SELECT id FROM pacientes WHERE usuario_id = $1',
                [usuarioId]
            );

            if (pacienteResult.rows.length === 0) {
                return res.status(404).json({
                    erro: 'Paciente não encontrado para este usuário'
                });
            }

            const pacienteId = pacienteResult.rows[0].id;

            const result = await pool.query(`
                SELECT
                    l.id,
                    l.paciente_id,
                    u.nome AS paciente_nome,
                    l.medico_id,
                    um.nome AS medico_nome,
                    l.especialidade,
                    l.data_desejada,
                    l.status,
                    l.created_at
                FROM lista_espera l
                JOIN pacientes p ON p.id = l.paciente_id
                JOIN usuarios u ON u.id = p.usuario_id
                LEFT JOIN medicos m ON m.id = l.medico_id
                LEFT JOIN usuarios um ON um.id = m.usuario_id
                WHERE l.paciente_id = $1
                ORDER BY l.created_at DESC
            `, [pacienteId]);

            return res.json(result.rows);
        }

        const result = await pool.query(`
            SELECT
                l.id,
                l.paciente_id,
                u.nome AS paciente_nome,
                l.medico_id,
                um.nome AS medico_nome,
                l.especialidade,
                l.data_desejada,
                l.status,
                l.created_at
            FROM lista_espera l
            JOIN pacientes p ON p.id = l.paciente_id
            JOIN usuarios u ON u.id = p.usuario_id
            LEFT JOIN medicos m ON m.id = l.medico_id
            LEFT JOIN usuarios um ON um.id = m.usuario_id
            ORDER BY l.created_at ASC
        `);

        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

const buscarItemListaEsperaPorId = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT
                l.id,
                l.paciente_id,
                u.nome AS paciente_nome,
                l.medico_id,
                um.nome AS medico_nome,
                l.especialidade,
                l.data_desejada,
                l.status,
                l.created_at
            FROM lista_espera l
            JOIN pacientes p ON p.id = l.paciente_id
            JOIN usuarios u ON u.id = p.usuario_id
            LEFT JOIN medicos m ON m.id = l.medico_id
            LEFT JOIN usuarios um ON um.id = m.usuario_id
            WHERE l.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                erro: 'Item da lista de espera não encontrado'
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

const transitionWaitingList = async (
    req,
    res,
    next,
    nextStatus,
    successMessage
) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const { id } = req.params;

        const itemExiste = await client.query(
            'SELECT * FROM lista_espera WHERE id = $1 FOR UPDATE',
            [id]
        );

        if (itemExiste.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                erro: 'Item da lista de espera não encontrado'
            });
        }

        const item = itemExiste.rows[0];

        if (!canTransitionWaitingList(item.status, nextStatus)) {
            await client.query('ROLLBACK');
            return res.status(409).json({
                erro: `Transição de ${item.status} para ${nextStatus} não permitida`
            });
        }

        const result = await client.query(
            `UPDATE lista_espera
             SET status = $1
             WHERE id = $2
             RETURNING *`,
            [nextStatus, id]
        );

        await client.query('COMMIT');
        res.json({
            mensagem: successMessage,
            item: result.rows[0]
        });
    } catch (error) {
        next(await rollbackTransaction(client, error));
    } finally {
        client.release();
    }
};

const chamarProximoDaFila = (req, res, next) =>
    transitionWaitingList(
        req,
        res,
        next,
        'CHAMADO',
        'Paciente chamado com sucesso'
    );

const encerrarItemListaEspera = (req, res, next) =>
    transitionWaitingList(
        req,
        res,
        next,
        'ENCERRADO',
        'Item da lista de espera encerrado com sucesso'
    );

const cancelarItemListaEspera = (req, res, next) =>
    transitionWaitingList(
        req,
        res,
        next,
        'CANCELADO',
        'Item da lista de espera cancelado com sucesso'
    );

module.exports = {
    criarEntradaListaEspera,
    listarListaEspera,
    buscarItemListaEsperaPorId,
    chamarProximoDaFila,
    encerrarItemListaEspera,
    cancelarItemListaEspera
};
