const pool = require('../config/db')

const obterIndicadores = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'REALIZADA')::int AS realizadas,
         COUNT(*) FILTER (WHERE status = 'CANCELADA')::int AS canceladas,
         COUNT(*) FILTER (WHERE status = 'FALTOU')::int AS faltas,
         COUNT(*) FILTER (WHERE checkin_realizado = true)::int AS checkins
       FROM consultas
       WHERE ($1::date IS NULL OR data_consulta >= $1::date)
         AND ($2::date IS NULL OR data_consulta <= $2::date)`,
      [req.query.data_inicial || null, req.query.data_final || null]
    )
    const indicators = result.rows[0]
    const total = indicators.total
    const percentage = (value) =>
      total > 0 ? `${((value / total) * 100).toFixed(2)}%` : '0.00%'

    res.json({
      total_consultas: total,
      atendimentos_realizados: indicators.realizadas,
      cancelamentos: indicators.canceladas,
      faltas: indicators.faltas,
      checkins_realizados: indicators.checkins,
      taxa_faltas: percentage(indicators.faltas),
      taxa_cancelamentos: percentage(indicators.canceladas),
      taxa_comparecimento: percentage(indicators.realizadas),
    })
  } catch (error) {
    next(error)
  }
}

module.exports = { obterIndicadores }
