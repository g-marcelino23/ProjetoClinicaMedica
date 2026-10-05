const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..', '..')
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8')

const middleware = read('backend/src/middlewares/authMiddleware.js')
const controller = read('backend/src/controllers/authController.js')
const migration = read(
  'backend/migrations/005_authentication_sessions_and_mfa.sql'
)
const schemas = read('backend/src/validation/schemas.js')
const env = read('backend/src/config/env.js')
const routes = read('backend/src/routes/authRoutes.js')
const seed = read('backend/scripts/seed-demo.js')

const assertions = [
  {
    description: 'sessões revogáveis armazenadas no servidor',
    valid:
      migration.includes('CREATE TABLE IF NOT EXISTS auth_sessions') &&
      middleware.includes('FROM auth_sessions'),
  },
  {
    description: 'expiração absoluta e por inatividade',
    valid:
      middleware.includes('s.expires_at > CURRENT_TIMESTAMP') &&
      middleware.includes('s.last_seen_at >') &&
      env.includes('SESSION_IDLE_MINUTES'),
  },
  {
    description: 'logout revoga a sessão',
    valid:
      controller.includes("'USER_LOGOUT'") &&
      controller.includes('UPDATE auth_sessions'),
  },
  {
    description: 'Bearer token alternativo removido',
    valid:
      !middleware.includes('authorization') &&
      !middleware.includes('Bearer '),
  },
  {
    description: 'MFA TOTP obrigatório e recuperação de uso único',
    valid:
      env.includes('PACIENTE,MEDICO,SECRETARIO') &&
      migration.includes('auth_mfa_recovery_codes') &&
      routes.includes("'/mfa/verify'"),
  },
  {
    description: 'política moderna de senha',
    valid:
      schemas.includes('MIN_PASSWORD_LENGTH') &&
      schemas.includes('getPasswordIssue'),
  },
  {
    description: 'cadastro público não enumera duplicidade',
    valid:
      controller.includes('Se os dados puderem ser utilizados') &&
      controller.includes('isDuplicateRegistration'),
  },
  {
    description: 'troca de senha revoga todas as sessões',
    valid:
      routes.includes("'/change-password'") &&
      controller.includes("'PASSWORD_CHANGED'"),
  },
  {
    description: 'seed não contém credencial padrão e é proibido em produção',
    valid:
      seed.includes('process.env.DEMO_PASSWORD') &&
      seed.includes("toLowerCase() === 'production'") &&
      !seed.includes("DEMO_PASSWORD = '"),
  },
]

const failures = assertions.filter((assertion) => !assertion.valid)
if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`Falha A07: ${failure.description}`)
  }
  process.exitCode = 1
} else {
  console.log(
    `A07 estática: ${assertions.length} controles de autenticação verificados`
  )
}
