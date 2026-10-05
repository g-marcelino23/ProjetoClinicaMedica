const assert = require('node:assert/strict')
const pool = require('../src/config/db')
const { loginWithMfa, resetDemoMfa } = require('./smoke-auth')

const baseUrl = process.env.SECURITY_SMOKE_URL || 'http://127.0.0.1:3001'
const allowedOrigin =
  process.env.SECURITY_SMOKE_ORIGIN || 'http://localhost:5173'
const demoPassword =
  process.env.SECURITY_SMOKE_PASSWORD || process.env.DEMO_PASSWORD

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      accept: 'application/json',
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  const text = await response.text()
  let body = null

  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }

  return { response, body }
}

const login = async (email) => {
  const result = await loginWithMfa({
    baseUrl,
    origin: allowedOrigin,
    email,
    password: demoPassword,
    pool,
  })

  assert.equal(result.response.status, 200, `Falha no login de ${email}`)
  const setCookie = result.response.headers.get('set-cookie')
  assert.match(setCookie, /HttpOnly/i, 'Cookie de sessão precisa ser HttpOnly')
  assert.match(
    setCookie,
    /SameSite=Strict/i,
    'Cookie de sessão precisa usar SameSite=Strict'
  )

  return {
    cookie: setCookie.split(';', 1)[0],
    user: result.body.usuario,
  }
}

const authenticatedRequest = (session, path, options = {}) =>
  request(path, {
    ...options,
    headers: {
      origin: allowedOrigin,
      cookie: session.cookie,
      ...options.headers,
    },
  })

const assertStatus = async (resultPromise, expected, label) => {
  const result = await resultPromise
  assert.equal(
    result.response.status,
    expected,
    `${label}: esperado ${expected}, recebido ${result.response.status}; ` +
      `resposta=${JSON.stringify(result.body)}`
  )
  return result
}

const assertNoFields = (records, fields, label) => {
  for (const record of records) {
    for (const field of fields) {
      assert.equal(
        Object.hasOwn(record, field),
        false,
        `${label} expôs o campo ${field}`
      )
    }
  }
}

const run = async () => {
  const health = await request('/health')
  assert.equal(health.response.status, 200)
  assert.equal(health.body.status, 'ok')

  for (const path of [
    '/consultas',
    '/exames',
    '/prontuarios',
    '/prescricoes',
    '/pacientes',
    '/agendas',
    '/dashboard/resumo',
  ]) {
    await assertStatus(request(path), 401, `Acesso anônimo a ${path}`)
  }

  const invalidLogin = await request('/auth/login', {
    method: 'POST',
    headers: { origin: allowedOrigin },
    body: JSON.stringify({
      email: 'usuario-inexistente@example.invalid',
      senha: 'Senha@123456',
    }),
  })
  assert.equal(invalidLogin.response.status, 401)
  assert.equal(invalidLogin.body.erro, 'E-mail ou senha inválidos')

  const privilegedRegistration = await request('/auth/register', {
    method: 'POST',
    headers: { origin: allowedOrigin },
    body: JSON.stringify({
      nome: 'Cadastro bloqueado',
      email: 'blocked@example.invalid',
      senha: 'Senha@123456',
      perfil: 'SECRETARIO',
    }),
  })
  assert.equal(privilegedRegistration.response.status, 400)

  const patient = await login(
    'demo.seed.20260716.patient.000001@clinicalmed.local'
  )
  const doctor = await login(
    'demo.seed.20260716.doctor.000001@clinicalmed.local'
  )
  const secretary = await login(
    'demo.seed.20260716.secretary.000001@clinicalmed.local'
  )

  assert.equal(patient.user.perfil, 'PACIENTE')
  assert.ok(patient.user.paciente_id)
  assert.equal(doctor.user.perfil, 'MEDICO')
  assert.ok(doctor.user.medico_id)
  assert.equal(secretary.user.perfil, 'SECRETARIO')
  assert.ok(secretary.user.secretario_id)

  const patientConsultations = await assertStatus(
    authenticatedRequest(patient, '/consultas'),
    200,
    'Listagem de consultas do paciente'
  )
  const doctorConsultations = await assertStatus(
    authenticatedRequest(doctor, '/consultas'),
    200,
    'Listagem de consultas do médico'
  )
  const secretaryConsultations = await assertStatus(
    authenticatedRequest(secretary, '/consultas'),
    200,
    'Listagem operacional de consultas'
  )

  assert.ok(
    patientConsultations.body.every(
      (consultation) => consultation.paciente_id === patient.user.paciente_id
    ),
    'Paciente recebeu consulta de outro paciente'
  )
  assert.ok(
    doctorConsultations.body.every(
      (consultation) => consultation.medico_id === doctor.user.medico_id
    ),
    'Médico recebeu consulta de outro médico'
  )
  assertNoFields(
    secretaryConsultations.body,
    ['motivo', 'observacoes'],
    'Listagem de consultas do secretário'
  )

  const foreignPatientConsultation = secretaryConsultations.body.find(
    (consultation) => consultation.paciente_id !== patient.user.paciente_id
  )
  const foreignDoctorConsultation = secretaryConsultations.body.find(
    (consultation) => consultation.medico_id !== doctor.user.medico_id
  )

  if (foreignPatientConsultation) {
    await assertStatus(
      authenticatedRequest(
        patient,
        `/consultas/${foreignPatientConsultation.id}`
      ),
      404,
      'Leitura de consulta alheia pelo paciente'
    )
  }

  if (foreignDoctorConsultation) {
    await assertStatus(
      authenticatedRequest(
        doctor,
        `/consultas/${foreignDoctorConsultation.id}`
      ),
      404,
      'Leitura de consulta alheia pelo médico'
    )
  }

  const patientExams = await assertStatus(
    authenticatedRequest(patient, '/exames'),
    200,
    'Listagem de exames do paciente'
  )
  const doctorExams = await assertStatus(
    authenticatedRequest(doctor, '/exames'),
    200,
    'Listagem de exames do médico'
  )
  const secretaryExams = await assertStatus(
    authenticatedRequest(secretary, '/exames'),
    200,
    'Listagem operacional de exames'
  )

  assert.ok(
    patientExams.body.every(
      (exam) => exam.paciente_id === patient.user.paciente_id
    ),
    'Paciente recebeu exame de outro paciente'
  )
  assert.ok(
    doctorExams.body.every((exam) => exam.medico_id === doctor.user.medico_id),
    'Médico recebeu exame de outro médico'
  )
  assertNoFields(
    secretaryExams.body,
    ['descricao', 'resultado', 'observacoes'],
    'Listagem de exames do secretário'
  )

  const foreignPatientExam = secretaryExams.body.find(
    (exam) => exam.paciente_id !== patient.user.paciente_id
  )
  const foreignDoctorExam = secretaryExams.body.find(
    (exam) => exam.medico_id !== doctor.user.medico_id
  )

  if (foreignPatientExam) {
    await assertStatus(
      authenticatedRequest(patient, `/exames/${foreignPatientExam.id}`),
      404,
      'Leitura de exame alheio pelo paciente'
    )
  }

  if (foreignDoctorExam) {
    await assertStatus(
      authenticatedRequest(doctor, `/exames/${foreignDoctorExam.id}`),
      404,
      'Leitura de exame alheio pelo médico'
    )
  }

  if (secretaryExams.body[0]) {
    const secretaryExam = await assertStatus(
      authenticatedRequest(secretary, `/exames/${secretaryExams.body[0].id}`),
      200,
      'Detalhe operacional de exame do secretário'
    )
    assertNoFields(
      [secretaryExam.body],
      ['descricao', 'resultado', 'observacoes'],
      'Detalhe de exame do secretário'
    )
  }

  const patientSchedules = await assertStatus(
    authenticatedRequest(patient, '/agendas'),
    200,
    'Agendas visíveis ao paciente'
  )
  const doctorSchedules = await assertStatus(
    authenticatedRequest(doctor, '/agendas'),
    200,
    'Agendas visíveis ao médico'
  )
  const secretarySchedules = await assertStatus(
    authenticatedRequest(secretary, '/agendas'),
    200,
    'Agendas visíveis ao secretário'
  )

  assert.ok(
    patientSchedules.body.every((schedule) => schedule.disponivel === true),
    'Paciente recebeu horário indisponível'
  )
  assertNoFields(
    patientSchedules.body,
    ['observacao'],
    'Agenda pública para paciente'
  )
  assert.ok(
    doctorSchedules.body.every(
      (schedule) => schedule.medico_id === doctor.user.medico_id
    ),
    'Médico recebeu agenda de outro médico'
  )

  const otherDoctorSchedule = secretarySchedules.body.find(
    (schedule) => schedule.medico_id !== doctor.user.medico_id
  )

  if (otherDoctorSchedule) {
    const otherScheduleRead = await assertStatus(
      authenticatedRequest(
        doctor,
        `/agendas/medico/${otherDoctorSchedule.medico_id}`
      ),
      200,
      'Agenda de outro médico'
    )
    assert.deepEqual(otherScheduleRead.body, [])
  }

  const patientDoctors = await assertStatus(
    authenticatedRequest(patient, '/medicos'),
    200,
    'Diretório médico do paciente'
  )
  assertNoFields(
    patientDoctors.body,
    ['usuario_id', 'email', 'telefone'],
    'Diretório médico do paciente'
  )

  const waitingList = await assertStatus(
    authenticatedRequest(patient, '/lista-espera'),
    200,
    'Lista de espera do paciente'
  )
  assert.ok(
    waitingList.body.every(
      (entry) => entry.paciente_id === patient.user.paciente_id
    ),
    'Paciente recebeu item de lista de espera alheio'
  )

  const records = await pool.query(
    'SELECT id, paciente_id, medico_id FROM prontuarios'
  )
  const foreignPatientRecord = records.rows.find(
    (record) => record.paciente_id !== patient.user.paciente_id
  )
  const foreignDoctorRecord = records.rows.find(
    (record) => record.medico_id !== doctor.user.medico_id
  )

  if (foreignPatientRecord) {
    await assertStatus(
      authenticatedRequest(patient, `/prontuarios/${foreignPatientRecord.id}`),
      404,
      'Leitura de prontuário alheio pelo paciente'
    )
  }

  if (foreignDoctorRecord) {
    await assertStatus(
      authenticatedRequest(doctor, `/prontuarios/${foreignDoctorRecord.id}`),
      404,
      'Leitura de prontuário alheio pelo médico'
    )
  }

  const prescriptions = await pool.query(
    'SELECT id, paciente_id, medico_id FROM prescricoes'
  )
  const foreignPatientPrescription = prescriptions.rows.find(
    (record) => record.paciente_id !== patient.user.paciente_id
  )
  const foreignDoctorPrescription = prescriptions.rows.find(
    (record) => record.medico_id !== doctor.user.medico_id
  )

  if (foreignPatientPrescription) {
    await assertStatus(
      authenticatedRequest(
        patient,
        `/prescricoes/${foreignPatientPrescription.id}`
      ),
      404,
      'Leitura de prescrição alheia pelo paciente'
    )
  }

  if (foreignDoctorPrescription) {
    await assertStatus(
      authenticatedRequest(
        doctor,
        `/prescricoes/${foreignDoctorPrescription.id}`
      ),
      404,
      'Leitura de prescrição alheia pelo médico'
    )
  }

  const forbiddenCases = [
    [patient, '/pacientes', {}, 'Paciente acessando cadastro de pacientes'],
    [patient, '/dashboard/resumo', {}, 'Paciente acessando dashboard administrativo'],
    [patient, '/relatorios/exames', {}, 'Paciente acessando relatório administrativo'],
    [patient, '/exames', { method: 'POST', body: '{}' }, 'Paciente criando exame'],
    [patient, '/prontuarios', { method: 'POST', body: '{}' }, 'Paciente criando prontuário'],
    [patient, '/agendas', { method: 'POST', body: '{}' }, 'Paciente criando agenda'],
    [doctor, '/pacientes', {}, 'Médico acessando cadastro de pacientes'],
    [doctor, '/dashboard/resumo', {}, 'Médico acessando dashboard administrativo'],
    [secretary, '/prontuarios', {}, 'Secretário acessando prontuários'],
    [secretary, '/prescricoes', {}, 'Secretário acessando prescrições'],
  ]

  for (const [session, path, options, label] of forbiddenCases) {
    await assertStatus(
      authenticatedRequest(session, path, options),
      403,
      label
    )
  }

  await assertStatus(
    authenticatedRequest(patient, '/auth/staff', {
      method: 'POST',
      body: JSON.stringify({
        nome: 'Cadastro bloqueado',
        email: 'blocked@example.invalid',
        senha: 'Senha@123456',
        perfil: 'SECRETARIO',
      }),
    }),
    403,
    'Paciente cadastrando equipe'
  )

  await assertStatus(
    authenticatedRequest(patient, '/checkin/1', {
      method: 'PUT',
      body: '{}',
    }),
    404,
    'Endpoint de check-in duplicado'
  )

  await assertStatus(
    request('/auth/logout', {
      method: 'POST',
      headers: { cookie: patient.cookie },
    }),
    403,
    'Operação com cookie sem Origin'
  )

  const foreignNotification = await pool.query(
    `SELECT id FROM notificacoes
     WHERE usuario_id <> $1
     ORDER BY id
     LIMIT 1`,
    [patient.user.id]
  )

  if (foreignNotification.rows[0]) {
    await assertStatus(
      authenticatedRequest(
        patient,
        `/notificacoes/${foreignNotification.rows[0].id}/lida`,
        { method: 'PUT', body: '{}' }
      ),
      404,
      'Alteração de notificação alheia'
    )
  }

  const secretaryExamReport = await assertStatus(
    authenticatedRequest(secretary, '/relatorios/exames'),
    200,
    'Relatório operacional de exames'
  )
  assertNoFields(
    secretaryExamReport.body,
    ['resultado'],
    'Relatório de exames do secretário'
  )

  const secretaryConsultationReport = await assertStatus(
    authenticatedRequest(secretary, '/relatorios/consultas'),
    200,
    'Relatório operacional de consultas'
  )
  assertNoFields(
    secretaryConsultationReport.body,
    ['motivo'],
    'Relatório de consultas do secretário'
  )

  const untrustedOrigin = await request('/health', {
    headers: { origin: 'https://evil.example' },
  })
  assert.equal(untrustedOrigin.response.status, 403)

  const roleResult = await pool.query(
    `SELECT current_user, rolsuper, rolcreaterole, rolcreatedb,
            rolreplication, rolbypassrls
     FROM pg_roles
     WHERE rolname = current_user`
  )
  const role = roleResult.rows[0]
  assert.equal(role.current_user, 'clinicalmed_app')
  assert.equal(role.rolsuper, false)
  assert.equal(role.rolcreaterole, false)
  assert.equal(role.rolcreatedb, false)
  assert.equal(role.rolreplication, false)
  assert.equal(role.rolbypassrls, false)

  console.log(
    JSON.stringify({
      status: 'ok',
      anonymousRoutesBlocked: 7,
      verticalAccessCasesBlocked: forbiddenCases.length + 2,
      patientConsultations: patientConsultations.body.length,
      doctorConsultations: doctorConsultations.body.length,
      secretaryConsultations: secretaryConsultations.body.length,
      patientExams: patientExams.body.length,
      doctorExams: doctorExams.body.length,
      secretaryExams: secretaryExams.body.length,
      foreignConsultationBlocked: Boolean(foreignPatientConsultation),
      foreignExamBlocked: Boolean(foreignPatientExam),
      databaseRole: role.current_user,
    })
  )
}

run()
  .catch((error) => {
    console.error(`Smoke test de segurança falhou: ${error.message}`)
    process.exitCode = 1
  })
  .finally(async () => {
    await resetDemoMfa(pool)
    await pool.end()
  })
