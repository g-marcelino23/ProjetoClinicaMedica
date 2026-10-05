const { z } = require('zod')

const booleanFromString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true')

const trustProxyFromString = z
  .string()
  .trim()
  .default('false')
  .refine(
    (value) =>
      value === 'false' ||
      ['loopback', 'linklocal', 'uniquelocal'].includes(value) ||
      (/^[1-9]\d*$/.test(value) && Number(value) <= 10),
    'TRUST_PROXY deve ser false, uma rede confiável ou um número de saltos entre 1 e 10'
  )
  .transform((value) =>
    /^[1-9]\d*$/.test(value) ? Number(value) : value === 'false' ? false : value
  )

const base64Key = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]+$/, 'deve estar codificada em base64url')
  .refine(
    (value) => Buffer.from(value, 'base64url').length === 32,
    'deve representar exatamente 32 bytes'
  )
  .refine(
    (value) => new Set(Buffer.from(value, 'base64url')).size >= 16,
    'não possui diversidade suficiente para uma chave aleatória'
  )

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_SSL: booleanFromString,
  DB_SSL_REJECT_UNAUTHORIZED: booleanFromString.default('true'),
  JWT_SECRET: z
    .string()
    .min(43, 'JWT_SECRET deve possuir pelo menos 256 bits gerados aleatoriamente')
    .refine(
      (value) => new Set(value).size >= 16,
      'JWT_SECRET não possui diversidade suficiente para um segredo aleatório'
    ),
  SESSION_ABSOLUTE_MINUTES: z.coerce.number().int().min(10).max(60).default(15),
  SESSION_IDLE_MINUTES: z.coerce.number().int().min(2).max(30).default(5),
  SESSION_MAX_CONCURRENT: z.coerce.number().int().min(1).max(10).default(3),
  MFA_REQUIRED_PROFILES: z
    .string()
    .trim()
    .default('PACIENTE,MEDICO,SECRETARIO'),
  DATA_ENCRYPTION_KEY_ID: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{1,32}$/),
  DATA_ENCRYPTION_KEY: base64Key,
  DATA_ENCRYPTION_PREVIOUS_KEYS: z.string().trim().default(''),
  DATA_INDEX_KEY: base64Key,
  CORS_ORIGINS: z
    .string()
    .trim()
    .min(1)
    .default(
      'http://localhost:5173,http://127.0.0.1:5173,http://[::1]:5173,http://localhost:5174,http://127.0.0.1:5174,http://[::1]:5174'
    ),
  TRUST_PROXY: trustProxyFromString,
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ')

  throw new Error(`Configuração de ambiente inválida: ${details}`)
}

if (
  parsed.data.SESSION_IDLE_MINUTES >= parsed.data.SESSION_ABSOLUTE_MINUTES
) {
  throw new Error(
    'SESSION_IDLE_MINUTES deve ser menor que SESSION_ABSOLUTE_MINUTES'
  )
}

const mfaRequiredProfiles = parsed.data.MFA_REQUIRED_PROFILES
  .split(',')
  .map((profile) => profile.trim().toUpperCase())
  .filter(Boolean)

if (
  mfaRequiredProfiles.length === 0 ||
  mfaRequiredProfiles.some(
    (profile) => !['PACIENTE', 'MEDICO', 'SECRETARIO'].includes(profile)
  )
) {
  throw new Error(
    'MFA_REQUIRED_PROFILES deve conter perfis válidos e não pode ficar vazio'
  )
}

if (
  parsed.data.NODE_ENV === 'production' &&
  parsed.data.DB_USER.toLowerCase() === 'postgres'
) {
  throw new Error('DB_USER não pode ser o superusuário postgres em produção')
}

if (
  parsed.data.NODE_ENV === 'production' &&
  parsed.data.JWT_SECRET ===
    'substitua-por-um-segredo-aleatorio-com-ao-menos-32-caracteres'
) {
  throw new Error('JWT_SECRET de exemplo não pode ser usado em produção')
}

if (
  parsed.data.NODE_ENV === 'production' &&
  (parsed.data.DB_PASSWORD.length < 16 ||
    parsed.data.DB_PASSWORD === 'use-uma-senha-forte-e-exclusiva')
) {
  throw new Error(
    'DB_PASSWORD deve ser forte, exclusivo e não pode usar o valor de exemplo'
  )
}

if (parsed.data.CORS_ORIGINS.split(',').some((origin) => origin.trim() === '*')) {
  throw new Error('CORS_ORIGINS não pode permitir origem curinga')
}

if (parsed.data.NODE_ENV === 'production' && !parsed.data.DB_SSL) {
  throw new Error('DB_SSL deve estar habilitado em produção')
}

if (
  parsed.data.NODE_ENV === 'production' &&
  !parsed.data.DB_SSL_REJECT_UNAUTHORIZED
) {
  throw new Error(
    'DB_SSL_REJECT_UNAUTHORIZED deve permanecer habilitado em produção'
  )
}

if (parsed.data.NODE_ENV === 'production' && parsed.data.TRUST_PROXY === false) {
  throw new Error('TRUST_PROXY deve indicar o proxy confiável em produção')
}

if (
  parsed.data.NODE_ENV === 'production' &&
  parsed.data.CORS_ORIGINS.split(',').some(
    (origin) => !origin.trim().startsWith('https://')
  )
) {
  throw new Error('CORS_ORIGINS deve conter apenas origens HTTPS em produção')
}

const decodeEncryptionKey = (encoded, label) => {
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) {
    throw new Error(`${label} deve estar codificada em base64url`)
  }

  const key = Buffer.from(encoded, 'base64url')
  if (key.length !== 32) {
    throw new Error(`${label} deve representar exatamente 32 bytes`)
  }
  if (new Set(key).size < 16) {
    throw new Error(`${label} não possui diversidade suficiente`)
  }

  return key
}

const encryptionKeys = new Map([
  [
    parsed.data.DATA_ENCRYPTION_KEY_ID,
    decodeEncryptionKey(parsed.data.DATA_ENCRYPTION_KEY, 'DATA_ENCRYPTION_KEY'),
  ],
])

if (parsed.data.DATA_ENCRYPTION_PREVIOUS_KEYS) {
  for (const entry of parsed.data.DATA_ENCRYPTION_PREVIOUS_KEYS.split(',')) {
    const separator = entry.indexOf(':')
    const keyId = entry.slice(0, separator).trim()
    const encodedKey = entry.slice(separator + 1).trim()

    if (
      separator <= 0 ||
      !/^[A-Za-z0-9_-]{1,32}$/.test(keyId) ||
      encryptionKeys.has(keyId)
    ) {
      throw new Error(
        'DATA_ENCRYPTION_PREVIOUS_KEYS possui identificador inválido ou duplicado'
      )
    }

    encryptionKeys.set(
      keyId,
      decodeEncryptionKey(encodedKey, `Chave anterior ${keyId}`)
    )
  }
}

const config = {
  nodeEnv: parsed.data.NODE_ENV,
  isProduction: parsed.data.NODE_ENV === 'production',
  port: parsed.data.PORT,
  jwt: {
    secret: parsed.data.JWT_SECRET,
    issuer: 'clinicalmed-api',
    audience: 'clinicalmed-web',
    cookieName: parsed.data.NODE_ENV === 'production'
      ? '__Host-clinicalmed_session'
      : 'clinicalmed_session',
  },
  session: {
    absoluteMinutes: parsed.data.SESSION_ABSOLUTE_MINUTES,
    idleMinutes: parsed.data.SESSION_IDLE_MINUTES,
    maxConcurrent: parsed.data.SESSION_MAX_CONCURRENT,
  },
  mfa: {
    requiredProfiles: Object.freeze([...new Set(mfaRequiredProfiles)]),
    challengeMinutes: 5,
  },
  corsOrigins: parsed.data.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  trustProxy: parsed.data.TRUST_PROXY,
  dataProtection: {
    activeKeyId: parsed.data.DATA_ENCRYPTION_KEY_ID,
    activeKey: encryptionKeys.get(parsed.data.DATA_ENCRYPTION_KEY_ID),
    keys: encryptionKeys,
    indexKey: decodeEncryptionKey(parsed.data.DATA_INDEX_KEY, 'DATA_INDEX_KEY'),
  },
  db: {
    host: parsed.data.DB_HOST,
    port: parsed.data.DB_PORT,
    database: parsed.data.DB_NAME,
    user: parsed.data.DB_USER,
    password: parsed.data.DB_PASSWORD,
    ssl: parsed.data.DB_SSL
      ? { rejectUnauthorized: parsed.data.DB_SSL_REJECT_UNAUTHORIZED }
      : false,
  },
}

module.exports = Object.freeze(config)
