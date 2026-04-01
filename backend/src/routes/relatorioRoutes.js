const express = require('express');
const router = express.Router();

const relatorioController = require('../controllers/relatorioController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.get(
    '/consultas',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    relatorioController.relatorioConsultas
);

router.get(
    '/exames',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    relatorioController.relatorioExames
);

router.get(
    '/atendimentos-medico',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    relatorioController.relatorioAtendimentosPorMedico
);

module.exports = router;