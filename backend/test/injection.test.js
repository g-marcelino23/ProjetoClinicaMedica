const test = require('node:test')
const assert = require('node:assert/strict')

Object.assign(process.env, {
  NODE_ENV: 'test',
  DB_HOST: 'localhost',
  DB_PORT: '5432',
  DB_NAME: 'clinicalmed_test',
  DB_USER: 'clinicalmed_test',
  DB_PASSWORD: 'not-used-by-unit-tests',
  DB_SSL: 'false',
  DB_SSL_REJECT_UNAUTHORIZED: 'true',
  JWT_SECRET:
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_',
  DATA_ENCRYPTION_KEY_ID: 'test-2026',
  DATA_ENCRYPTION_KEY:
    'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8',
  DATA_ENCRYPTION_PREVIOUS_KEYS: '',
  DATA_INDEX_KEY:
    'Hx4dHBsaGRgXFhUUExIREA8ODQwLCgkIBwYFBAMCAQA',
  CORS_ORIGINS: 'http://localhost:5173',
  TRUST_PROXY: 'false',
})

const schemas = require('../src/validation/schemas')
const validate = require('../src/middlewares/validate')

const parseRequest = (schema, { body = {}, params = {}, query = {} }) =>
  schema.safeParse({ body, params, query })

test('injeção SQL em identificador é rejeitada antes do banco', () => {
  const result = parseRequest(schemas.patients.id, {
    params: { id: '1 OR 1=1' },
  })

  assert.equal(result.success, false)
})

test('filtros de relatório aceitam somente enum e datas ISO', () => {
  assert.equal(
    parseRequest(schemas.reports.consultations, {
      query: { status: "REALIZADA' OR '1'='1" },
    }).success,
    false
  )
  assert.equal(
    parseRequest(schemas.reports.consultations, {
      query: { data_inicial: "2026-01-01' OR 1=1--" },
    }).success,
    false
  )
  assert.equal(
    parseRequest(schemas.reports.consultations, {
      query: {
        data_inicial: '2026-12-31',
        data_final: '2026-01-01',
      },
    }).success,
    false
  )
})

test('caractere nulo e controles perigosos são rejeitados', () => {
  const result = parseRequest(schemas.records.create, {
    body: {
      consulta_id: 1,
      diagnostico: 'texto\u0000oculto',
    },
  })

  assert.equal(result.success, false)
})

test('texto clínico pode conter símbolos SQL e HTML sem ser interpretado', () => {
  const payload = `Robert'); DROP TABLE usuarios;-- <img src=x onerror=alert(1)>`
  const result = parseRequest(schemas.records.create, {
    body: {
      consulta_id: 1,
      diagnostico: payload,
    },
  })

  assert.equal(result.success, true)
  assert.equal(result.data.body.diagnostico, payload)
})

test('middleware rejeita campos fora da lista permitida', () => {
  const req = {
    body: {
      email: 'paciente@example.test',
      senha: 'Senha-Forte@2026',
      nome: 'Paciente Teste',
      cpf: '12345678909',
      perfil: 'PACIENTE',
      comando: 'DROP TABLE usuarios',
    },
    params: {},
    query: {},
  }
  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
  let continued = false

  validate(schemas.auth.patientRegistration)(
    req,
    response,
    () => {
      continued = true
    }
  )

  assert.equal(continued, false)
  assert.equal(response.statusCode, 400)
  assert.deepEqual(response.body.campos, [
    { campo: 'body.comando', mensagem: 'Campo não permitido' },
  ])
})
