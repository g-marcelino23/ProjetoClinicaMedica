const pool = require('../config/db');

const criarEntradaListaEspera = async (req, res) => {
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
            return res.status(404).json({ erro: 'Paciente não encontrado' });
        }

        const result = await pool.query(
            `INSERT INTO lista_espera
      (paciente_id, medico_id, especialidade, data_desejada, status)
      VALUES ($1, $2, $3, $4, 'ATIVO')
      RETURNING *`,
            [paciente_id, medico_id || null, especialidade || null, data_desejada || null]
        );

        res.status(201).json({
            mensagem: 'Paciente adicionado à lista de espera com sucesso',
            item: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
};

const listarListaEspera = async (req, res) => {
    try {
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
        res.status(500).json({ erro: error.message });
    }
};

const buscarItemListaEsperaPorId = async (req, res) => {
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
            return res.status(404).json({ erro: 'Item da lista de espera não encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
};

const chamarProximoDaFila = async (req, res) => {
    try {
        const { id } = req.params;

        const itemExiste = await pool.query(
            'SELECT * FROM lista_espera WHERE id = $1',
            [id]
        );

        if (itemExiste.rows.length === 0) {
            return res.status(404).json({ erro: 'Item da lista de espera não encontrado' });
        }

        const item = itemExiste.rows[0];

        if (item.status !== 'ATIVO') {
            return res.status(400).json({
                erro: 'Apenas itens com status ATIVO podem ser chamados'
            });
        }

        const result = await pool.query(
            `UPDATE lista_espera
       SET status = 'CHAMADO'
       WHERE id = $1
       RETURNING *`,
            [id]
        );

        res.json({
            mensagem: 'Paciente chamado com sucesso',
            item: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
};

const encerrarItemListaEspera = async (req, res) => {
    try {
        const { id } = req.params;

        const itemExiste = await pool.query(
            'SELECT * FROM lista_espera WHERE id = $1',
            [id]
        );

        if (itemExiste.rows.length === 0) {
            return res.status(404).json({ erro: 'Item da lista de espera não encontrado' });
        }

        const result = await pool.query(
            `UPDATE lista_espera
       SET status = 'ENCERRADO'
       WHERE id = $1
       RETURNING *`,
            [id]
        );

        res.json({
            mensagem: 'Item da lista de espera encerrado com sucesso',
            item: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
};

module.exports = {
    criarEntradaListaEspera,
    listarListaEspera,
    buscarItemListaEsperaPorId,
    chamarProximoDaFila,
    encerrarItemListaEspera
};