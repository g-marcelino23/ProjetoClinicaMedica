const express = require('express')
const router = express.Router()
const prontuarioController = require('../controllers/prontuarioController')
const authMiddleware = require('../middlewares/authMiddleware')
const roleMiddleware = require('../middlewares/roleMiddleware')
const validate = require('../middlewares/validate')
const schemas = require('../validation/schemas')

router.use(authMiddleware)

router.post(
  '/',
  roleMiddleware(['MEDICO']),
  validate(schemas.records.create),
  prontuarioController.criarProntuario
)
router.get(
  '/',
  roleMiddleware(['MEDICO', 'PACIENTE']),
  prontuarioController.listarProntuarios
)
router.get(
  '/:id',
  roleMiddleware(['MEDICO', 'PACIENTE']),
  validate(schemas.records.id),
  prontuarioController.buscarProntuarioPorId
)
router.put(
  '/:id',
  roleMiddleware(['MEDICO']),
  validate(schemas.records.update),
  prontuarioController.atualizarProntuario
)

module.exports = router
