const express = require('express')
const router = express.Router()
const exameController = require('../controllers/exameController')
const authMiddleware = require('../middlewares/authMiddleware')
const roleMiddleware = require('../middlewares/roleMiddleware')
const validate = require('../middlewares/validate')
const schemas = require('../validation/schemas')

router.use(authMiddleware)

router.post(
  '/',
  roleMiddleware(['MEDICO']),
  validate(schemas.exams.create),
  exameController.criarExame
)
router.get(
  '/',
  roleMiddleware(['MEDICO', 'SECRETARIO', 'PACIENTE']),
  exameController.listarExames
)
router.get(
  '/:id',
  roleMiddleware(['MEDICO', 'SECRETARIO', 'PACIENTE']),
  validate(schemas.exams.id),
  exameController.buscarExamePorId
)
router.put(
  '/:id',
  roleMiddleware(['MEDICO']),
  validate(schemas.exams.update),
  exameController.atualizarExame
)
router.delete(
  '/:id',
  roleMiddleware(['SECRETARIO']),
  validate(schemas.exams.id),
  exameController.deletarExame
)

module.exports = router
