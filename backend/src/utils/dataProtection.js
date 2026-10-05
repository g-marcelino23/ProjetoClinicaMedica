const crypto = require('crypto')
const config = require('../config/env')

const CIPHERTEXT_PREFIX = 'cmenc.v1'
const PROTECTED_FIELDS = new Set([
  'anamnese',
  'cpf',
  'data_nascimento',
  'descricao',
  'diagnostico',
  'dosagem',
  'duracao',
  'endereco',
  'frequencia',
  'convenio',
  'medicamento',
  'mensagem',
  'mfa_secret',
  'motivo',
  'nome_exame',
  'numero_convenio',
  'observacao',
  'observacoes',
  'queixa_principal',
  'resultado',
  'telefone',
  'titulo',
])

const encode = (value) => Buffer.from(value).toString('base64url')
const decode = (value) => Buffer.from(value, 'base64url')
const isCiphertext = (value) =>
  typeof value === 'string' && value.startsWith(`${CIPHERTEXT_PREFIX}.`)

const encryptField = (field, value) => {
  if (value === null || value === undefined || value === '' || isCiphertext(value)) {
    return value
  }

  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    config.dataProtection.activeKey,
    iv,
    { authTagLength: 16 }
  )
  cipher.setAAD(Buffer.from(field, 'utf8'))
  const encrypted = Buffer.concat([
    cipher.update(String(value), 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  return [
    CIPHERTEXT_PREFIX,
    config.dataProtection.activeKeyId,
    encode(iv),
    encode(tag),
    encode(encrypted),
  ].join('.')
}

const decryptField = (field, value) => {
  if (!isCiphertext(value)) return value

  const parts = value.split('.')
  if (parts.length !== 6 || `${parts[0]}.${parts[1]}` !== CIPHERTEXT_PREFIX) {
    throw new Error('Formato de dado protegido inválido')
  }

  const [, , keyId, encodedIv, encodedTag, encodedValue] = parts
  const key = config.dataProtection.keys.get(keyId)

  if (!key) {
    throw new Error('Chave necessária para leitura do dado protegido não está disponível')
  }

  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      decode(encodedIv),
      { authTagLength: 16 }
    )
    decipher.setAAD(Buffer.from(field, 'utf8'))
    decipher.setAuthTag(decode(encodedTag))
    return Buffer.concat([
      decipher.update(decode(encodedValue)),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    throw new Error('Integridade do dado protegido não pôde ser confirmada')
  }
}

const createBlindIndex = (field, value) => {
  if (value === null || value === undefined || value === '') return null

  const normalized =
    field === 'cpf'
      ? String(value).replace(/\D/g, '')
      : String(value).trim().toLowerCase()

  return crypto
    .createHmac('sha256', config.dataProtection.indexKey)
    .update(`${field}:${normalized}`, 'utf8')
    .digest('hex')
}

const protectObject = (input) => {
  if (Array.isArray(input)) return input.map(protectObject)
  if (!input || typeof input !== 'object') return input

  const protectedObject = {}
  for (const [field, value] of Object.entries(input)) {
    if (field === 'cpf' && value) {
      protectedObject.cpf_lookup = createBlindIndex('cpf', value)
    }

    protectedObject[field] = PROTECTED_FIELDS.has(field)
      ? encryptField(field, value)
      : protectObject(value)
  }

  return protectedObject
}

const unprotectObject = (input) => {
  if (Array.isArray(input)) return input.map(unprotectObject)
  if (!input || typeof input !== 'object') return input

  const unprotectedObject = {}
  for (const [field, value] of Object.entries(input)) {
    if (field === 'cpf_lookup') continue

    unprotectedObject[field] = PROTECTED_FIELDS.has(field)
      ? decryptField(field, value)
      : unprotectObject(value)
  }

  return unprotectedObject
}

module.exports = {
  CIPHERTEXT_PREFIX,
  PROTECTED_FIELDS,
  createBlindIndex,
  decryptField,
  encryptField,
  isCiphertext,
  protectObject,
  unprotectObject,
}
