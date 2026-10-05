const crypto = require('crypto')

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const PERIOD_SECONDS = 30
const DIGITS = 6

const encodeBase32 = (buffer) => {
  let bits = ''
  for (const byte of buffer) bits += byte.toString(2).padStart(8, '0')

  let encoded = ''
  for (let index = 0; index < bits.length; index += 5) {
    const chunk = bits.slice(index, index + 5).padEnd(5, '0')
    encoded += ALPHABET[Number.parseInt(chunk, 2)]
  }
  return encoded
}

const decodeBase32 = (input) => {
  const normalized = input.toUpperCase().replace(/[\s=-]/g, '')
  if (!normalized || [...normalized].some((char) => !ALPHABET.includes(char))) {
    throw new Error('Segredo TOTP inválido')
  }

  let bits = ''
  for (const char of normalized) {
    bits += ALPHABET.indexOf(char).toString(2).padStart(5, '0')
  }

  const bytes = []
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2))
  }
  return Buffer.from(bytes)
}

const generateSecret = () => encodeBase32(crypto.randomBytes(20))

const generateTotp = (
  secret,
  timestamp = Date.now(),
  counterOverride = null
) => {
  const counter =
    counterOverride ??
    Math.floor(Math.floor(timestamp / 1000) / PERIOD_SECONDS)
  const counterBuffer = Buffer.alloc(8)
  counterBuffer.writeBigUInt64BE(BigInt(counter))
  const digest = crypto
    .createHmac('sha1', decodeBase32(secret))
    .update(counterBuffer)
    .digest()
  const offset = digest[digest.length - 1] & 0x0f
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)
  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0')
}

const verifyTotp = (
  secret,
  code,
  { timestamp = Date.now(), window = 1, lastCounter = null } = {}
) => {
  if (!/^\d{6}$/.test(String(code))) return null

  const currentCounter = Math.floor(
    Math.floor(timestamp / 1000) / PERIOD_SECONDS
  )
  const supplied = Buffer.from(String(code))

  for (let delta = -window; delta <= window; delta += 1) {
    const counter = currentCounter + delta
    if (lastCounter !== null && counter <= Number(lastCounter)) continue
    const expected = Buffer.from(
      generateTotp(secret, timestamp, counter)
    )
    if (
      supplied.length === expected.length &&
      crypto.timingSafeEqual(supplied, expected)
    ) {
      return counter
    }
  }
  return null
}

const createOtpAuthUri = (secret, email) =>
  `otpauth://totp/${encodeURIComponent(`ClinicalMed:${email}`)}` +
  `?secret=${encodeURIComponent(secret)}` +
  '&issuer=ClinicalMed&algorithm=SHA1&digits=6&period=30'

module.exports = {
  createOtpAuthUri,
  generateSecret,
  generateTotp,
  verifyTotp,
}
