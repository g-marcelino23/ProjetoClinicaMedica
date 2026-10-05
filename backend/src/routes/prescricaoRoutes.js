const express = require('express')
const router = express.Router()
const controller = require('../controllers/prescricaoController')
const authMiddleware = require('../middlewares/authMiddleware')
const roleMiddleware = require('../middlewares/roleMiddleware')
const validate = require('../middlewares/validate')
const schemas = require('../validation/schemas')

router.use(authMiddleware)

router.get('/', roleMiddleware(['MEDICO']), controller.listarPrescricoes)
router.get('/minhas', roleMiddleware(['PACIENTE']), controller.listarMinhasPrescricoes)
router.get(
  '/:id',
  roleMiddleware(['PACIENTE', 'MEDICO']),
  validate(schemas.prescriptions.id),
  controller.buscarPrescricaoPorId
)
router.post(
  '/',
  roleMiddleware(['MEDICO']),
  validate(schemas.prescriptions.create),
  controller.criarPrescricao
)
router.put(
  '/:id',
  roleMiddleware(['MEDICO']),
  validate(schemas.prescriptions.update),
  controller.atualizarPrescricao
)
router.delete(
  '/:id',
  roleMiddleware(['MEDICO']),
  validate(schemas.prescriptions.id),
  controller.deletarPrescricao
)

module.exports = router
