require('dotenv').config({ quiet: true })

const assert = require('node:assert/strict')
const http = require('node:http')
const pool = require('../src/config/db')
const { loginWithMfa } = require('./smoke-auth')

const appBaseUrl = process.env.ZAP_TARGET_API || 'http://127.0.0.1:3001'
const appOrigin = process.env.ZAP_TARGET_ORIGIN || 'http://localhost:5173'
const zapBaseUrl = process.env.ZAP_API_URL || 'http://127.0.0.1:8090'
const requestedProfile = (process.env.ZAP_PROFILE || 'SECRETARIO').toUpperCase()

const zapAction = async (component, action, parameters = {}) => {
  const url = new URL(`/JSON/${component}/action/${action}/`, zapBaseUrl)
  for (const [name, value] of Object.entries(parameters)) {
    url.searchParams.set(name, value)
  }

  const response = await fetch(url)
  const body = await response.json()
  assert.equal(response.ok, true, JSON.stringify(body))
  return body
}

const replaceHeader = async (description, name, value) => {
  await zapAction('replacer', 'removeRule', { description }).catch(() => {})
  await zapAction('replacer', 'addRule', {
    description,
    enabled: 'true',
    matchType: 'REQ_HEADER',
    matchRegex: 'false',
    matchString: name,
    replacement: value,
  })
}

const proxyRequest = (cookie, method, pathname, body) =>
  new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : ''
    const request = http.request(
      {
        host: '127.0.0.1',
        port: 8090,
        method,
        path: `${appBaseUrl}${pathname}`,
        headers: {
          Host: new URL(appBaseUrl).host,
          Accept: 'application/json',
          Cookie: cookie,
          Origin: appOrigin,
          'X-Requested-With': 'XMLHttpRequest',
          ...(payload
            ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
              }
            : {}),
        },
      },
      (response) => {
        response.resume()
        response.on('end', () => resolve(response.statusCode))
      }
    )
    request.on('error', reject)
    request.setTimeout(20_000, () => request.destroy(new Error('Proxy timeout')))
    if (payload) request.write(payload)
    request.end()
  })

const firstId = async (table) => {
  const allowedTables = new Set([
    'agendas_medicas',
    'consultas',
    'exames',
    'lista_espera',
    'medicos',
    'notificacoes',
    'pacientes',
    'prescricoes',
    'prontuarios',
  ])
  assert.ok(allowedTables.has(table), 'Tabela de seed não permitida')
  const result = await pool.query(`SELECT id FROM ${table} ORDER BY id LIMIT 1`)
  return result.rows[0]?.id || 999999999
}

const seedRequests = async (cookie, profile, email) => {
  const [
    agendaId,
    consultationId,
    examId,
    waitingId,
    doctorId,
    notificationId,
    patientId,
    prescriptionId,
    recordId,
  ] = await Promise.all([
    firstId('agendas_medicas'),
    firstId('consultas'),
    firstId('exames'),
    firstId('lista_espera'),
    firstId('medicos'),
    firstId('notificacoes'),
    firstId('pacientes'),
    firstId('prescricoes'),
    firstId('prontuarios'),
  ])

  const commonGets = [
    '/health',
    '/ready',
    '/auth/me',
    '/agendas',
    `/agendas/medico/${doctorId}`,
    '/consultas',
    `/consultas/${consultationId}`,
    '/exames',
    `/exames/${examId}`,
    '/medicos',
    `/medicos/${doctorId}`,
    '/notificacoes/minhas',
  ]
  const profileGets = {
    SECRETARIO: [
      '/dashboard/resumo',
      '/pacientes',
      `/pacientes/${patientId}`,
      '/lista-espera',
      `/lista-espera/${waitingId}`,
      '/indicadores?data_inicial=2026-01-01&data_final=2026-12-31',
      '/relatorios/consultas?data_inicial=2026-01-01&data_final=2026-12-31',
      '/relatorios/exames?data_inicial=2026-01-01&data_final=2026-12-31',
      '/relatorios/atendimentos-medico?data_inicial=2026-01-01&data_final=2026-12-31',
    ],
    MEDICO: [
      '/prontuarios',
      `/prontuarios/${recordId}`,
      '/prescricoes',
      `/prescricoes/${prescriptionId}`,
    ],
    PACIENTE: [
      '/portal/paciente/me',
      '/portal/paciente/consultas',
      '/portal/paciente/exames',
      '/portal/paciente/prescricoes',
      '/prontuarios',
      `/prontuarios/${recordId}`,
      '/prescricoes/minhas',
      `/prescricoes/${prescriptionId}`,
      '/lista-espera',
    ],
  }

  const writes = {
    SECRETARIO: [
      ['POST', '/agendas', { medico_id: doctorId, data_agenda: '2038-01-01', hora_inicio: '08:00', hora_fim: '08:30', disponivel: true, observacao: 'ZAP' }],
      ['PUT', '/agendas/999999999', { data_agenda: '2038-01-01', hora_inicio: '08:00', hora_fim: '08:30', disponivel: true, observacao: 'ZAP' }],
      ['DELETE', '/agendas/999999999'],
      ['POST', '/consultas', { paciente_id: patientId, agenda_id: 999999999, motivo: 'ZAP', observacoes: 'ZAP' }],
      ['PUT', '/consultas/999999999', { status: 'CANCELADA', observacoes: 'ZAP' }],
      ['DELETE', '/consultas/999999999'],
      ['DELETE', '/exames/999999999'],
      ['POST', '/lista-espera', { paciente_id: patientId, medico_id: doctorId, especialidade: 'ZAP', data_desejada: '2038-01-01' }],
      ['PUT', '/lista-espera/999999999/chamar'],
      ['PUT', '/lista-espera/999999999/encerrar'],
      ['PUT', '/lista-espera/999999999/cancelar'],
      ['POST', '/notificacoes', { usuario_id: 999999999, titulo: 'ZAP', mensagem: 'ZAP', tipo: 'TESTE' }],
      ['POST', '/pacientes', { usuario_id: 999999999, cpf: '52998224725', data_nascimento: '1990-01-01', telefone: '000000000', endereco: 'ZAP', convenio: 'ZAP', numero_convenio: 'ZAP' }],
      ['PUT', '/pacientes/999999999', { cpf: '52998224725', data_nascimento: '1990-01-01', telefone: '000000000', endereco: 'ZAP', convenio: 'ZAP', numero_convenio: 'ZAP' }],
      ['DELETE', '/pacientes/999999999'],
      ['POST', '/medicos', { usuario_id: 999999999, crm: '123456-CE', especialidade: 'ZAP', telefone: '000000000' }],
      ['PUT', '/medicos/999999999', { crm: '123456-CE', especialidade: 'ZAP', telefone: '000000000' }],
      ['DELETE', '/medicos/999999999'],
    ],
    MEDICO: [
      ['PUT', `/consultas/${consultationId}`, { status: 'CONFIRMADA', observacoes: 'ZAP' }],
      ['POST', '/exames', { consulta_id: consultationId, nome_exame: 'ZAP', descricao: 'ZAP', status: 'SOLICITADO', data_exame: '2038-01-01', resultado: 'ZAP', observacoes: 'ZAP' }],
      ['PUT', '/exames/999999999', { nome_exame: 'ZAP', descricao: 'ZAP', status: 'SOLICITADO', data_exame: '2038-01-01', resultado: 'ZAP', observacoes: 'ZAP' }],
      ['POST', '/prontuarios', { consulta_id: consultationId, queixa_principal: 'ZAP', anamnese: 'ZAP', diagnostico: 'ZAP', observacoes: 'ZAP' }],
      ['PUT', '/prontuarios/999999999', { queixa_principal: 'ZAP', anamnese: 'ZAP', diagnostico: 'ZAP', observacoes: 'ZAP' }],
      ['POST', '/prescricoes', { consulta_id: consultationId, medicamento: 'ZAP', dosagem: 'ZAP', frequencia: 'ZAP', duracao: 'ZAP', observacoes: 'ZAP' }],
      ['PUT', '/prescricoes/999999999', { medicamento: 'ZAP', dosagem: 'ZAP', frequencia: 'ZAP', duracao: 'ZAP', observacoes: 'ZAP' }],
      ['DELETE', '/prescricoes/999999999'],
    ],
    PACIENTE: [
      ['POST', '/consultas', { agenda_id: 999999999, motivo: 'ZAP', observacoes: 'ZAP' }],
      ['PATCH', '/consultas/999999999/check-in'],
    ],
  }

  const requests = [
    ...commonGets.map((pathname) => ['GET', pathname]),
    ...(profileGets[profile] || []).map((pathname) => ['GET', pathname]),
    ['POST', '/auth/login', {
      email: 'zap-invalid@example.invalid',
      senha: 'Uma frase segura exclusiva para o teste ZAP 2026!',
    }],
    ['POST', '/auth/register', {
      nome: 'Teste ZAP',
      email,
      senha: 'Uma frase segura exclusiva para o teste ZAP 2026!',
      perfil: 'PACIENTE',
      cpf: '52998224725',
      telefone: '000000000',
      data_nascimento: '1990-01-01',
      endereco: 'ZAP',
    }],
    ['POST', '/auth/mfa/verify', {
      challenge_id: '00000000-0000-4000-8000-000000000000',
      codigo: '000000',
    }],
    ['POST', '/auth/change-password', {
      senha_atual: 'Senha atual inválida para o teste ZAP',
      nova_senha: 'Outra frase segura exclusiva para o teste ZAP 2026!',
    }],
    ...(writes[profile] || []),
    ['PUT', `/notificacoes/${notificationId}/lida`],
  ]

  const statuses = {}
  for (const [method, pathname, body] of requests) {
    const status = await proxyRequest(cookie, method, pathname, body)
    statuses[status] = (statuses[status] || 0) + 1
  }
  return { requests: requests.length, statuses }
}

const main = async () => {
  const userResult = await pool.query(
    `SELECT email
     FROM usuarios
     WHERE email LIKE 'demo.seed.%@clinicalmed.local'
       AND perfil = $1
       AND ativo = true
     ORDER BY id
     LIMIT 1`,
    [requestedProfile]
  )
  assert.equal(userResult.rows.length, 1, 'Usuário de demonstração não encontrado')
  assert.ok(process.env.DEMO_PASSWORD, 'DEMO_PASSWORD não configurada')

  const login = await loginWithMfa({
    baseUrl: appBaseUrl,
    origin: appOrigin,
    email: userResult.rows[0].email,
    password: process.env.DEMO_PASSWORD,
    pool,
  })
  assert.equal(login.response.status, 200, 'Falha ao autenticar a sessão do ZAP')

  const setCookie = login.response.headers.get('set-cookie')
  assert.ok(setCookie, 'O login não retornou cookie de sessão')
  const cookie = setCookie.split(';', 1)[0]

  await replaceHeader('ClinicalMed authenticated session', 'Cookie', cookie)
  await replaceHeader('ClinicalMed allowed origin', 'Origin', appOrigin)
  await replaceHeader(
    'ClinicalMed AJAX request marker',
    'X-Requested-With',
    'XMLHttpRequest'
  )
  const seed = await seedRequests(
    cookie,
    requestedProfile,
    userResult.rows[0].email
  )

  console.log(
    JSON.stringify({
      configured: true,
      profile: login.body.usuario.perfil,
      email: userResult.rows[0].email,
      seed,
    })
  )
}

main()
  .catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(() => pool.end())
