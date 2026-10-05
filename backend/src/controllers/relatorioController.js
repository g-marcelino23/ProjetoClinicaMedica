const pool = require('../config/db')

const getDateRange = (query) => [
  query.data_inicial || null,
  query.data_final || null,
]

const relatorioConsultas = async (req, res, next) => {
  try {
    const [startDate, endDate] = getDateRange(req.query)
    const result = await pool.query(
      `SELECT
         c.id,
         c.data_consulta,
         c.hora_consulta,
         c.status,
         up.nome AS paciente_nome,
         um.nome AS medico_nome,
         m.especialidade
       FROM consultas c
       JOIN pacientes p ON p.id = c.paciente_id
       JOIN usuarios up ON up.id = p.usuario_id
       JOIN medicos m ON m.id = c.medico_id
       JOIN usuarios um ON um.id = m.usuario_id
       WHERE ($1::date IS NULL OR c.data_consulta >= $1::date)
         AND ($2::date IS NULL OR c.data_consulta <= $2::date)
         AND ($3::varchar IS NULL OR c.status = $3::varchar)
       ORDER BY c.data_consulta DESC, c.hora_consulta DESC`,
      [startDate, endDate, req.query.status || null]
    )

    res.json(result.rows)
  } catch (error) {
    next(error)
  }
}

const relatorioExames = async (req, res, next) => {
  try {
    const [startDate, endDate] = getDateRange(req.query)
    const result = await pool.query(
      `SELECT
         e.id,
         e.nome_exame,
         e.status,
         e.data_exame,
         up.nome AS paciente_nome,
         um.nome AS medico_nome
       FROM exames e
       JOIN pacientes p ON p.id = e.paciente_id
       JOIN usuarios up ON up.id = p.usuario_id
       JOIN medicos m ON m.id = e.medico_id
       JOIN usuarios um ON um.id = m.usuario_id
       WHERE ($1::date IS NULL OR e.data_exame >= $1::date)
         AND ($2::date IS NULL OR e.data_exame <= $2::date)
         AND ($3::varchar IS NULL OR e.status = $3::varchar)
       ORDER BY e.data_exame DESC NULLS LAST`,
      [startDate, endDate, req.query.status || null]
    )

    res.json(result.rows)
  } catch (error) {
    next(error)
  }
}

const relatorioAtendimentosPorMedico = async (req, res, next) => {
  try {
    const [startDate, endDate] = getDateRange(req.query)
    const result = await pool.query(
      `SELECT
         m.id AS medico_id,
         u.nome AS medico_nome,
         m.especialidade,
         COUNT(c.id) AS total_atendimentos
       FROM medicos m
       JOIN usuarios u ON u.id = m.usuario_id
       LEFT JOIN consultas c
         ON c.medico_id = m.id
        AND ($1::date IS NULL OR c.data_consulta >= $1::date)
        AND ($2::date IS NULL OR c.data_consulta <= $2::date)
       GROUP BY m.id, u.nome, m.especialidade
       ORDER BY total_atendimentos DESC, u.nome ASC`,
      [startDate, endDate]
    )

    res.json(result.rows)
  } catch (error) {
    next(error)
  }
}

module.exports = {
  relatorioConsultas,
  relatorioExames,
  relatorioAtendimentosPorMedico,
}
