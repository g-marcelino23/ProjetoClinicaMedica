const express = require('express');
const router = express.Router();

const portalPacienteController = require('../controllers/portalPacienteController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.get(
    '/me',
    authMiddleware,
    roleMiddleware(['PACIENTE']),
    portalPacienteController.buscarMeuPerfilPaciente
);

router.get(
    '/consultas',
    authMiddleware,
    roleMiddleware(['PACIENTE']),
    portalPacienteController.listarMinhasConsultas
);

router.get(
    '/exames',
    authMiddleware,
    roleMiddleware(['PACIENTE']),
    portalPacienteController.listarMeusExames
);

router.get(
    '/prescricoes',
    authMiddleware,
    roleMiddleware(['PACIENTE']),
    portalPacienteController.listarMinhasPrescricoes
);

module.exports = router;