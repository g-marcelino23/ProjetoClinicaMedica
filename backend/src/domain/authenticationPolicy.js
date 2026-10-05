const crypto = require('crypto')

const MIN_PASSWORD_LENGTH = 15
const MAX_PASSWORD_LENGTH = 72
const PASSWORD_COST = 12
const MAX_FAILED_ATTEMPTS = 5

const commonPasswords = new Set(
  [
    '123456',
    '123456789',
    '12345678',
    'password',
    'password1',
    'qwerty123',
    'qwertyuiop',
    'admin',
    'administrator',
    'letmein',
    'welcome',
    'iloveyou',
    'abc123',
    'senha',
    'senha123',
    'clinicalmed',
    'clinicalmed2026',
  ].map((value) =>
    crypto.createHash('sha256').update(value).digest('hex')
  )
)

const normalizeContext = (value) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

const getPasswordIssue = (password, contextValues = []) => {
  if (typeof password !== 'string') return 'Senha inválida'
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `A senha deve possuir pelo menos ${MIN_PASSWORD_LENGTH} caracteres`
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `A senha deve possuir no máximo ${MAX_PASSWORD_LENGTH} caracteres`
  }
  if (/[\u0000-\u001F\u007F]/.test(password)) {
    return 'A senha contém caracteres de controle não permitidos'
  }

  const normalizedPassword = normalizeContext(password)
  const passwordHash = crypto
    .createHash('sha256')
    .update(password.toLowerCase())
    .digest('hex')

  if (commonPasswords.has(passwordHash)) {
    return 'A senha informada é muito comum'
  }
  if (/^(.)\1{7,}$/u.test(password)) {
    return 'A senha não pode ser formada por repetição do mesmo caractere'
  }

  for (const contextValue of contextValues) {
    const normalizedValue = normalizeContext(contextValue)
    if (
      normalizedValue.length >= 4 &&
      normalizedPassword.includes(normalizedValue)
    ) {
      return 'A senha não pode conter seu nome, e-mail ou dados do sistema'
    }
  }

  return null
}

const isMfaRequired = (profile, requiredProfiles) =>
  requiredProfiles.includes(profile)

module.exports = {
  MAX_FAILED_ATTEMPTS,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  PASSWORD_COST,
  getPasswordIssue,
  isMfaRequired,
}
