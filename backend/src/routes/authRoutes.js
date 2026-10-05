const express = require('express')
const router = express.Router()
const {
  register,
  registerStaff,
  login,
  logout,
  me,
  changePassword,
  verifyMfa,
} = require('../controllers/authController')
const authMiddleware = require('../middlewares/authMiddleware')
const roleMiddleware = require('../middlewares/roleMiddleware')
const validate = require('../middlewares/validate')
const {
  loginRateLimiter,
  mfaRateLimiter,
  registrationRateLimiter,
} = require('../middlewares/securityMiddleware')
const schemas = require('../validation/schemas')

router.post(
  '/register',
  registrationRateLimiter,
  validate(schemas.auth.patientRegistration),
  register
)
router.post(
  '/staff',
  authMiddleware,
  roleMiddleware(['SECRETARIO']),
  validate(schemas.auth.staffRegistration),
  registerStaff
)
router.post('/login', loginRateLimiter, validate(schemas.auth.login), login)
router.post(
  '/mfa/verify',
  mfaRateLimiter,
  validate(schemas.auth.mfaVerify),
  verifyMfa
)
router.get('/me', authMiddleware, me)
router.post(
  '/change-password',
  authMiddleware,
  validate(schemas.auth.changePassword),
  changePassword
)
router.post('/logout', logout)

module.exports = router
