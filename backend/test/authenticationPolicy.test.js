const test = require('node:test')
const assert = require('node:assert/strict')

const {
  getPasswordIssue,
  isMfaRequired,
} = require('../src/domain/authenticationPolicy')
const {
  generateSecret,
  generateTotp,
  verifyTotp,
} = require('../src/utils/totp')

test('política aceita frase-senha longa sem exigir composição artificial', () => {
  assert.equal(
    getPasswordIssue('uma frase longa e memorável', ['outro usuario']),
    null
  )
})

test('política rejeita senha curta, comum e contextual', () => {
  assert.match(getPasswordIssue('curta'), /15 caracteres/)
  assert.match(
    getPasswordIssue('ClinicalMed2026'),
    /muito comum|dados do sistema/
  )
  assert.match(
    getPasswordIssue('gabriel-tem-uma-senha-longa', ['Gabriel']),
    /nome/
  )
})

test('MFA é exigido somente para perfis configurados', () => {
  const required = ['PACIENTE', 'MEDICO', 'SECRETARIO']
  assert.equal(isMfaRequired('PACIENTE', required), true)
  assert.equal(isMfaRequired('MEDICO', required), true)
  assert.equal(isMfaRequired('INEXISTENTE', required), false)
})

test('TOTP válido é aceito e o mesmo contador não pode ser reutilizado', () => {
  const secret = generateSecret()
  const timestamp = 1_750_000_000_000
  const code = generateTotp(secret, timestamp)
  const counter = verifyTotp(secret, code, { timestamp, window: 0 })
  assert.ok(Number.isInteger(counter))
  assert.equal(
    verifyTotp(secret, code, {
      timestamp,
      window: 0,
      lastCounter: counter,
    }),
    null
  )
})

test('TOTP alterado e segredo inválido são rejeitados', () => {
  const secret = generateSecret()
  const timestamp = 1_750_000_000_000
  const code = generateTotp(secret, timestamp)
  const altered = `${code.slice(0, -1)}${code.at(-1) === '9' ? '0' : '9'}`
  assert.equal(verifyTotp(secret, altered, { timestamp, window: 0 }), null)
  assert.throws(() => generateTotp('***', timestamp), /inválido/)
})
