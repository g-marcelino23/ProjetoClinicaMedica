const test = require('node:test')
const assert = require('node:assert/strict')
const schemas = require('../src/validation/schemas')
const roleMiddleware = require('../src/middlewares/roleMiddleware')

test('cadastro público não aceita perfil privilegiado', () => {
  const result = schemas.auth.patientRegistration.safeParse({
    body: {
      nome: 'Paciente Teste',
      email: 'paciente@example.com',
      senha: 'Senha-Forte-123!',
      perfil: 'SECRETARIO',
      cpf: '123.456.789-09',
    },
    params: {},
    query: {},
  })

  assert.equal(result.success, false)
})

test('política de senha rejeita senha fraca', () => {
  const result = schemas.auth.patientRegistration.safeParse({
    body: {
      nome: 'Paciente Teste',
      email: 'paciente@example.com',
      senha: '123456',
      perfil: 'PACIENTE',
      cpf: '123.456.789-09',
    },
    params: {},
    query: {},
  })

  assert.equal(result.success, false)
})

test('identificador malicioso é rejeitado antes de chegar ao banco', () => {
  const result = schemas.consultations.id.safeParse({
    body: {},
    params: { id: '1 OR 1=1' },
    query: {},
  })

  assert.equal(result.success, false)
})

test('prontuário não aceita paciente ou médico escolhido pelo cliente', () => {
  const result = schemas.records.create.safeParse({
    body: {
      consulta_id: 1,
      paciente_id: 999,
      medico_id: 999,
      diagnostico: 'Teste',
    },
    params: {},
    query: {},
  })

  assert.equal(result.success, true)
  assert.equal('paciente_id' in result.data.body, false)
  assert.equal('medico_id' in result.data.body, false)
})

test('middleware de perfil bloqueia acesso não autorizado', () => {
  const middleware = roleMiddleware(['MEDICO'])
  const request = { usuario: { perfil: 'PACIENTE' } }
  let nextCalled = false
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }

  middleware(request, response, () => {
    nextCalled = true
  })

  assert.equal(nextCalled, false)
  assert.equal(response.statusCode, 403)
})

test('middleware de perfil nega por padrão quando não há usuário autenticado', () => {
  const middleware = roleMiddleware(['MEDICO'])
  const request = {}
  let nextCalled = false
  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code
      return this
    },
    json() {
      return this
    },
  }

  middleware(request, response, () => {
    nextCalled = true
  })

  assert.equal(nextCalled, false)
  assert.equal(response.statusCode, 401)
})

test('middleware de perfil aceita apenas correspondência exata', () => {
  const middleware = roleMiddleware(['MEDICO'])
  let validNextCalled = false
  let invalidNextCalled = false
  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code
      return this
    },
    json() {
      return this
    },
  }

  middleware({ usuario: { perfil: 'MEDICO' } }, response, () => {
    validNextCalled = true
  })
  middleware({ usuario: { perfil: 'medico' } }, response, () => {
    invalidNextCalled = true
  })

  assert.equal(validNextCalled, true)
  assert.equal(invalidNextCalled, false)
  assert.equal(response.statusCode, 403)
})
