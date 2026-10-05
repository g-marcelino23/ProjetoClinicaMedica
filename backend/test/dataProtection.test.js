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

const {
  createBlindIndex,
  decryptField,
  encryptField,
  protectObject,
  unprotectObject,
} = require('../src/utils/dataProtection')

test('AES-256-GCM protege e recupera um campo sensível', () => {
  const plaintext = 'Diagnóstico clínico confidencial'
  const encrypted = encryptField('diagnostico', plaintext)

  assert.notEqual(encrypted, plaintext)
  assert.match(encrypted, /^cmenc\.v1\.test-2026\./)
  assert.equal(decryptField('diagnostico', encrypted), plaintext)
})

test('IV aleatório produz textos cifrados diferentes para o mesmo valor', () => {
  const first = encryptField('cpf', '12345678909')
  const second = encryptField('cpf', '12345678909')

  assert.notEqual(first, second)
  assert.equal(decryptField('cpf', first), '12345678909')
  assert.equal(decryptField('cpf', second), '12345678909')
})

test('autenticação GCM rejeita adulteração e troca de contexto', () => {
  const encrypted = encryptField('resultado', 'Sem alterações')
  const parts = encrypted.split('.')
  parts[5] = `${parts[5][0] === 'A' ? 'B' : 'A'}${parts[5].slice(1)}`
  const tampered = parts.join('.')

  assert.throws(() => decryptField('resultado', tampered), /Integridade/)
  assert.throws(() => decryptField('diagnostico', encrypted), /Integridade/)
})

test('índice cego do CPF é determinístico sem expor o documento', () => {
  const formatted = createBlindIndex('cpf', '123.456.789-09')
  const digits = createBlindIndex('cpf', '12345678909')

  assert.equal(formatted, digits)
  assert.match(formatted, /^[a-f0-9]{64}$/)
  assert.doesNotMatch(formatted, /12345678909/)
})

test('proteção recursiva não devolve o índice cego ao cliente', () => {
  const protectedBody = protectObject({
    cpf: '12345678909',
    prontuario: { diagnostico: 'Teste' },
  })

  assert.ok(protectedBody.cpf_lookup)
  assert.notEqual(protectedBody.cpf, '12345678909')
  assert.notEqual(protectedBody.prontuario.diagnostico, 'Teste')
  assert.deepEqual(unprotectObject(protectedBody), {
    cpf: '12345678909',
    prontuario: { diagnostico: 'Teste' },
  })
})
