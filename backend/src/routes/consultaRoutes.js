const express = require('express');
const router = express.Router();

const consultaController = require('../controllers/consultaController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.post(
  '/',
  authMiddleware,
  roleMiddleware(['PACIENTE', 'SECRETARIO']),
  consultaController.criarConsulta
);

router.get(
  '/',
  authMiddleware,
  consultaController.listarConsultas
);

router.get(
  '/:id',
  authMiddleware,
  consultaController.buscarConsultaPorId
);

router.patch(
  '/:id/check-in',
  authMiddleware,
  roleMiddleware(['PACIENTE']),
  consultaController.realizarCheckIn
);

router.put(
  '/:id',
  authMiddleware,
  roleMiddleware(['MEDICO', 'SECRETARIO']),
  consultaController.atualizarStatusConsulta
);

router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware(['SECRETARIO']),
  consultaController.deletarConsulta
);

module.exports = router;