const pool = require('../config/db');

const criarAgenda = async (req, res) => {
    try {
        const {
            medico_id,
            data_agenda,
            hora_inicio,
            hora_fim,
            disponivel,
            observacao
        } = req.body;

        if (!medico_id || !data_agenda || !hora_inicio || !hora_fim) {
            return res.status(400).json({
                erro: 'medico_id, data_agenda, hora_inicio e hora_fim são obrigatórios'
            });
        }

        const medicoExiste = await pool.query(
            'SELECT id FROM medicos WHERE id = $1',
            [medico_id]
        );

        if (medicoExiste.rows.length === 0) {
            return res.status(404).json({ erro: 'Médico não encontrado' });
        }

        const result = await pool.query(
            `INSERT INTO agendas_medicas
      (medico_id, data_agenda, hora_inicio, hora_fim, disponivel, observacao)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
            [
                medico_id,
                data_agenda,
                hora_inicio,
                hora_fim,
                disponivel ?? true,
                observacao
            ]
        );

        res.status(201).json({
            mensagem: 'Agenda criada com sucesso',
            agenda: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
};

const listarAgendas = async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT
        a.id,
        a.medico_id,
        u.nome AS medico_nome,
        m.especialidade,
        a.data_agenda,
        a.hora_inicio,
        a.hora_fim,
        a.disponivel,
        a.observacao
      FROM agendas_medicas a
      JOIN medicos m ON m.id = a.medico_id
      JOIN usuarios u ON u.id = m.usuario_id
      ORDER BY a.data_agenda, a.hora_inicio
    `);

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
};

const listarAgendaPorMedico = async (req, res) => {
    try {
        const { medicoId } = req.params;

        const result = await pool.query(`
      SELECT
        a.id,
        a.medico_id,
        u.nome AS medico_nome,
        m.especialidade,
        a.data_agenda,
        a.hora_inicio,
        a.hora_fim,
        a.disponivel,
        a.observacao
      FROM agendas_medicas a
      JOIN medicos m ON m.id = a.medico_id
      JOIN usuarios u ON u.id = m.usuario_id
      WHERE a.medico_id = $1
      ORDER BY a.data_agenda, a.hora_inicio
    `, [medicoId]);

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
};

const atualizarAgenda = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            data_agenda,
            hora_inicio,
            hora_fim,
            disponivel,
            observacao
        } = req.body;

        const agendaExiste = await pool.query(
            'SELECT * FROM agendas_medicas WHERE id = $1',
            [id]
        );

        if (agendaExiste.rows.length === 0) {
            return res.status(404).json({ erro: 'Agenda não encontrada' });
        }

        const result = await pool.query(
            `UPDATE agendas_medicas
       SET data_agenda = $1,
           hora_inicio = $2,
           hora_fim = $3,
           disponivel = $4,
           observacao = $5
       WHERE id = $6
       RETURNING *`,
            [data_agenda, hora_inicio, hora_fim, disponivel, observacao, id]
        );

        res.json({
            mensagem: 'Agenda atualizada com sucesso',
            agenda: result.rows[0]
        });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
};

const deletarAgenda = async (req, res) => {
    try {
        const { id } = req.params;

        const agendaExiste = await pool.query(
            'SELECT * FROM agendas_medicas WHERE id = $1',
            [id]
        );

        if (agendaExiste.rows.length === 0) {
            return res.status(404).json({ erro: 'Agenda não encontrada' });
        }

        await pool.query('DELETE FROM agendas_medicas WHERE id = $1', [id]);

        res.json({ mensagem: 'Agenda deletada com sucesso' });
    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
};

module.exports = {
    criarAgenda,
    listarAgendas,
    listarAgendaPorMedico,
    atualizarAgenda,
    deletarAgenda
};