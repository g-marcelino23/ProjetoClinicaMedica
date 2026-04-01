const express = require('express');
const router = express.Router();

const pacienteController = require('../controllers/pacienteController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.post(
    '/',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    pacienteController.criarPaciente
);

router.get(
    '/',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    pacienteController.listarPacientes
);

router.get(
    '/:id',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    pacienteController.buscarPacientePorId
);

router.put(
    '/:id',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    pacienteController.atualizarPaciente
);

router.delete(
    '/:id',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    pacienteController.deletarPaciente
);

module.exports = router;