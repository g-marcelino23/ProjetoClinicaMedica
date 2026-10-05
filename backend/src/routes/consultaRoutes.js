const express = require('express')
const router = express.Router()
const consultaController = require('../controllers/consultaController')
const authMiddleware = require('../middlewares/authMiddleware')
const roleMiddleware = require('../middlewares/roleMiddleware')
const validate = require('../middlewares/validate')
const schemas = require('../validation/schemas')

router.use(authMiddleware)

router.post(
  '/',
  roleMiddleware(['PACIENTE', 'SECRETARIO']),
  validate(schemas.consultations.create),
  consultaController.criarConsulta
)
router.get('/', consultaController.listarConsultas)
router.get(
  '/:id',
  validate(schemas.consultations.id),
  consultaController.buscarConsultaPorId
)
router.patch(
  '/:id/check-in',
  roleMiddleware(['PACIENTE']),
  validate(schemas.consultations.id),
  consultaController.realizarCheckIn
)
router.put(
  '/:id',
  roleMiddleware(['MEDICO', 'SECRETARIO']),
  validate(schemas.consultations.update),
  consultaController.atualizarStatusConsulta
)
router.delete(
  '/:id',
  roleMiddleware(['SECRETARIO']),
  validate(schemas.consultations.id),
  consultaController.deletarConsulta
)

module.exports = router
