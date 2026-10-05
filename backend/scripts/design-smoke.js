require('dotenv').config({ quiet: true })

const assert = require('node:assert/strict')
const pool = require('../src/config/db')
const { encryptField } = require('../src/utils/dataProtection')
const { loginWithMfa, resetDemoMfa } = require('./smoke-auth')

const baseUrl = process.env.DESIGN_SMOKE_URL || 'http://127.0.0.1:3001'
const origin = process.env.DESIGN_SMOKE_ORIGIN || 'http://localhost:5173'
const demoPassword = process.env.DEMO_PASSWORD

const created = {
  agendas: [],
  consultas: [],
  exames: [],
  prescricoes: [],
  fila: [],
}

const request = async (pathname, options = {}) => {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      accept: 'application/json',
      origin,
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  const text = await response.text()
  return {
    status: response.status,
    headers: response.headers,
    body: text ? JSON.parse(text) : null,
  }
}

const login = async (email) => {
  const result = await loginWithMfa({
    baseUrl,
    origin,
    email,
    password: demoPassword,
    pool,
  })
  assert.equal(
    result.response.status,
    200,
    `Falha no login de ${email}`
  )
  const cookie = result.response.headers.get('set-cookie')?.split(';')[0]
  assert.ok(cookie, `Login de ${email} não retornou cookie`)
  return cookie
}

const authenticatedRequest = (cookie, pathname, options = {}) =>
  request(pathname, {
    ...options,
    headers: {
      cookie,
      ...options.headers,
    },
  })

const assertStatus = async (promise, expected, label) => {
  const result = await promise
  assert.equal(
    result.status,
    expected,
    `${label}: esperado ${expected}, recebido ${result.status}`
  )
  return result
}

const getDemoActors = async () => {
  const result = await pool.query(`
    SELECT
      u.email,
      u.perfil,
      p.id AS paciente_id,
      m.id AS medico_id
    FROM usuarios u
    LEFT JOIN pacientes p ON p.usuario_id = u.id
    LEFT JOIN medicos m ON m.usuario_id = u.id
    WHERE u.email LIKE 'demo.seed.%@clinicalmed.local'
      AND u.ativo = true
      AND u.perfil IN ('PACIENTE', 'MEDICO', 'SECRETARIO')
    ORDER BY u.id
  `)

  const patient = result.rows.find((row) => row.perfil === 'PACIENTE')
  const doctor = result.rows.find((row) => row.perfil === 'MEDICO')
  const secretary = result.rows.find((row) => row.perfil === 'SECRETARIO')
  assert.ok(patient?.paciente_id, 'Paciente de demonstração não encontrado')
  assert.ok(doctor?.medico_id, 'Médico de demonstração não encontrado')
  assert.ok(secretary, 'Secretário de demonstração não encontrado')

  const anotherDoctor = await pool.query(
    `SELECT m.id
     FROM medicos m
     WHERE m.id <> $1
     ORDER BY m.id
     LIMIT 1`,
    [doctor.medico_id]
  )
  assert.equal(anotherDoctor.rows.length, 1, 'Segundo médico não encontrado')

  return {
    patient,
    doctor,
    secretary,
    anotherDoctorId: anotherDoctor.rows[0].id,
  }
}

const createFutureConsultation = async (actors) => {
  const slot = await pool.query(
    `SELECT
       to_char(
         CURRENT_DATE + INTERVAL '12 years' + ($1 * INTERVAL '1 day'),
         'YYYY-MM-DD'
       ) AS data,
       make_time($2, 0, 0) AS inicio,
       make_time($2, 30, 0) AS fim`,
    [Math.floor(Math.random() * 300), 8 + Math.floor(Math.random() * 8)]
  )
  const { data, inicio, fim } = slot.rows[0]

  const agenda = await pool.query(
    `INSERT INTO agendas_medicas
       (medico_id, data_agenda, hora_inicio, hora_fim, disponivel)
     VALUES ($1, $2, $3, $4, false)
     RETURNING id`,
    [actors.doctor.medico_id, data, inicio, fim]
  )
  created.agendas.push(agenda.rows[0].id)

  const consulta = await pool.query(
    `INSERT INTO consultas
       (
         paciente_id, medico_id, agenda_id, data_consulta,
         hora_consulta, hora_fim, status, checkin_realizado
       )
     VALUES ($1, $2, $3, $4, $5, $6, 'AGENDADA', false)
     RETURNING id`,
    [
      actors.patient.paciente_id,
      actors.doctor.medico_id,
      agenda.rows[0].id,
      data,
      inicio,
      fim,
    ]
  )
  created.consultas.push(consulta.rows[0].id)

  return {
    agendaId: agenda.rows[0].id,
    consultaId: consulta.rows[0].id,
    data,
    inicio,
    fim,
  }
}

const assertDatabaseConstraint = async (work, expectedCode, label) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await assert.rejects(
      work(client),
      (error) => error.code === expectedCode,
      label
    )
  } finally {
    await client.query('ROLLBACK')
    client.release()
  }
}

const testDatabaseInvariants = async (actors) => {
  await assertDatabaseConstraint(
    async (client) => {
      const date = await client.query(
        `SELECT CURRENT_DATE + INTERVAL '15 years' AS data`
      )
      await client.query(
        `INSERT INTO agendas_medicas
           (medico_id, data_agenda, hora_inicio, hora_fim, disponivel)
         VALUES ($1, $2, '10:00', '11:00', true)`,
        [actors.doctor.medico_id, date.rows[0].data]
      )
      await client.query(
        `INSERT INTO agendas_medicas
           (medico_id, data_agenda, hora_inicio, hora_fim, disponivel)
         VALUES ($1, $2, '10:30', '11:30', true)`,
        [actors.doctor.medico_id, date.rows[0].data]
      )
    },
    '23P01',
    'Banco aceitou agendas sobrepostas'
  )

  await assertDatabaseConstraint(
    async (client) => {
      const date = await client.query(
        `SELECT CURRENT_DATE + INTERVAL '16 years' AS data`
      )
      const agendaA = await client.query(
        `INSERT INTO agendas_medicas
           (medico_id, data_agenda, hora_inicio, hora_fim, disponivel)
         VALUES ($1, $2, '13:00', '14:00', false)
         RETURNING id`,
        [actors.doctor.medico_id, date.rows[0].data]
      )
      const agendaB = await client.query(
        `INSERT INTO agendas_medicas
           (medico_id, data_agenda, hora_inicio, hora_fim, disponivel)
         VALUES ($1, $2, '13:15', '13:45', false)
         RETURNING id`,
        [actors.anotherDoctorId, date.rows[0].data]
      )
      await client.query(
        `INSERT INTO consultas
           (
             paciente_id, medico_id, agenda_id, data_consulta,
             hora_consulta, hora_fim, status, checkin_realizado
           )
         VALUES ($1, $2, $3, $4, '13:00', '14:00', 'AGENDADA', false)`,
        [
          actors.patient.paciente_id,
          actors.doctor.medico_id,
          agendaA.rows[0].id,
          date.rows[0].data,
        ]
      )
      await client.query(
        `INSERT INTO consultas
           (
             paciente_id, medico_id, agenda_id, data_consulta,
             hora_consulta, hora_fim, status, checkin_realizado
           )
         VALUES ($1, $2, $3, $4, '13:15', '13:45', 'CONFIRMADA', false)`,
        [
          actors.patient.paciente_id,
          actors.anotherDoctorId,
          agendaB.rows[0].id,
          date.rows[0].data,
        ]
      )
    },
    '23P01',
    'Banco aceitou consultas sobrepostas do mesmo paciente'
  )

  await assertDatabaseConstraint(
    (client) =>
      client.query(
        `UPDATE consultas SET status = 'INEXISTENTE' WHERE id = $1`,
        [created.consultas[0]]
      ),
    '23514',
    'Banco aceitou estado inexistente'
  )
}

const cleanup = async () => {
  if (created.prescricoes.length > 0) {
    await pool.query('DELETE FROM prescricoes WHERE id = ANY($1::int[])', [
      created.prescricoes,
    ])
  }
  if (created.exames.length > 0) {
    await pool.query('DELETE FROM exames WHERE id = ANY($1::int[])', [
      created.exames,
    ])
  }
  if (created.fila.length > 0) {
    await pool.query('DELETE FROM lista_espera WHERE id = ANY($1::int[])', [
      created.fila,
    ])
  }
  if (created.consultas.length > 0) {
    await pool.query('DELETE FROM consultas WHERE id = ANY($1::int[])', [
      created.consultas,
    ])
  }
  if (created.agendas.length > 0) {
    await pool.query('DELETE FROM agendas_medicas WHERE id = ANY($1::int[])', [
      created.agendas,
    ])
  }
}

const run = async () => {
  const health = await request('/health')
  assert.equal(health.status, 200, 'API não está disponível')

  const actors = await getDemoActors()
  const [patientCookie, doctorCookie, secretaryCookie] = await Promise.all([
    login(actors.patient.email),
    login(actors.doctor.email),
    login(actors.secretary.email),
  ])
  const fixture = await createFutureConsultation(actors)

  await assertStatus(
    authenticatedRequest(patientCookie, `/consultas/${fixture.consultaId}/check-in`, {
      method: 'PATCH',
      body: '{}',
    }),
    409,
    'Check-in antecipado'
  )
  await assertStatus(
    authenticatedRequest(secretaryCookie, `/consultas/${fixture.consultaId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'REALIZADA' }),
    }),
    409,
    'Secretário concluindo consulta'
  )
  await assertStatus(
    authenticatedRequest(doctorCookie, `/consultas/${fixture.consultaId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'REALIZADA' }),
    }),
    409,
    'Médico concluindo consulta futura'
  )
  await assertStatus(
    authenticatedRequest(doctorCookie, '/prontuarios', {
      method: 'POST',
      body: JSON.stringify({
        consulta_id: fixture.consultaId,
        diagnostico: 'Registro antecipado bloqueado',
      }),
    }),
    409,
    'Prontuário antecipado'
  )
  await assertStatus(
    authenticatedRequest(doctorCookie, '/exames', {
      method: 'POST',
      body: JSON.stringify({
        consulta_id: fixture.consultaId,
        nome_exame: 'Exame antecipado',
      }),
    }),
    409,
    'Exame em consulta apenas agendada'
  )
  await assertStatus(
    authenticatedRequest(doctorCookie, '/prescricoes', {
      method: 'POST',
      body: JSON.stringify({
        consulta_id: fixture.consultaId,
        medicamento: 'Medicamento de teste',
        dosagem: '1 unidade',
        frequencia: '1 vez',
        duracao: '1 dia',
      }),
    }),
    409,
    'Prescrição em consulta apenas agendada'
  )
  await assertStatus(
    authenticatedRequest(secretaryCookie, `/agendas/${fixture.agendaId}`, {
      method: 'PUT',
      body: JSON.stringify({
        data_agenda: fixture.data,
        hora_inicio: '09:00',
        hora_fim: '09:30',
        disponivel: false,
      }),
    }),
    409,
    'Alteração de agenda vinculada'
  )
  await assertStatus(
    authenticatedRequest(secretaryCookie, '/agendas', {
      method: 'POST',
      body: JSON.stringify({
        medico_id: actors.doctor.medico_id,
        data_agenda: '2020-01-01',
        hora_inicio: '09:00',
        hora_fim: '09:30',
      }),
    }),
    409,
    'Criação de agenda passada'
  )

  await assertStatus(
    authenticatedRequest(secretaryCookie, `/consultas/${fixture.consultaId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'CONFIRMADA' }),
    }),
    200,
    'Confirmação válida'
  )

  const prescription = await assertStatus(
    authenticatedRequest(doctorCookie, '/prescricoes', {
      method: 'POST',
      body: JSON.stringify({
        consulta_id: fixture.consultaId,
        medicamento: 'Medicamento de teste A06',
        dosagem: '1 unidade',
        frequencia: '1 vez ao dia',
        duracao: '2 dias',
      }),
    }),
    201,
    'Criação de prescrição válida'
  )
  created.prescricoes.push(prescription.body.prescricao.id)

  await assertStatus(
    authenticatedRequest(
      doctorCookie,
      `/prescricoes/${prescription.body.prescricao.id}`,
      { method: 'DELETE', body: '{}' }
    ),
    200,
    'Cancelamento lógico da prescrição'
  )
  const preservedPrescription = await pool.query(
    `SELECT status, cancelada_em
     FROM prescricoes
     WHERE id = $1`,
    [prescription.body.prescricao.id]
  )
  assert.equal(preservedPrescription.rows.length, 1)
  assert.equal(preservedPrescription.rows[0].status, 'CANCELADA')
  assert.ok(preservedPrescription.rows[0].cancelada_em)

  const exam = await pool.query(
    `INSERT INTO exames
       (
         consulta_id, paciente_id, medico_id,
         nome_exame, status
       )
     VALUES ($1, $2, $3, $4, 'CANCELADO')
     RETURNING id`,
    [
      fixture.consultaId,
      actors.patient.paciente_id,
      actors.doctor.medico_id,
      encryptField('nome_exame', 'Exame terminal A06'),
    ]
  )
  created.exames.push(exam.rows[0].id)
  await assertStatus(
    authenticatedRequest(doctorCookie, `/exames/${exam.rows[0].id}`, {
      method: 'PUT',
      body: JSON.stringify({
        nome_exame: 'Exame terminal A06',
        status: 'ENTREGUE',
        resultado: 'Tentativa inválida',
      }),
    }),
    409,
    'Reabertura de exame cancelado'
  )

  const waiting = await pool.query(
    `INSERT INTO lista_espera
       (paciente_id, especialidade, status)
     VALUES ($1, $2, 'ATIVO')
     RETURNING id`,
    [
      actors.patient.paciente_id,
      `A06-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ]
  )
  created.fila.push(waiting.rows[0].id)
  await assertStatus(
    authenticatedRequest(
      secretaryCookie,
      `/lista-espera/${waiting.rows[0].id}/chamar`,
      { method: 'PUT', body: '{}' }
    ),
    200,
    'Chamada válida da fila'
  )
  await assertStatus(
    authenticatedRequest(
      secretaryCookie,
      `/lista-espera/${waiting.rows[0].id}/chamar`,
      { method: 'PUT', body: '{}' }
    ),
    409,
    'Chamada repetida da fila'
  )
  await assertStatus(
    authenticatedRequest(
      secretaryCookie,
      `/lista-espera/${waiting.rows[0].id}/encerrar`,
      { method: 'PUT', body: '{}' }
    ),
    200,
    'Encerramento válido da fila'
  )
  await assertStatus(
    authenticatedRequest(
      secretaryCookie,
      `/lista-espera/${waiting.rows[0].id}/cancelar`,
      { method: 'PUT', body: '{}' }
    ),
    409,
    'Alteração de item terminal da fila'
  )

  await testDatabaseInvariants(actors)

  console.log(
    JSON.stringify({
      status: 'ok',
      apiAbuseCasesBlocked: 11,
      validStateTransitionsAccepted: 4,
      databaseInvariantsEnforced: 3,
      clinicalHistoryPreserved: true,
    })
  )
}

run()
  .catch((error) => {
    console.error(`Smoke test A06 falhou: ${error.message}`)
    process.exitCode = 1
  })
  .finally(async () => {
    try {
      await cleanup()
    } catch (error) {
      console.error(`Falha ao limpar dados do smoke A06: ${error.message}`)
      process.exitCode = 1
    }
    await resetDemoMfa(pool)
    await pool.end()
  })
