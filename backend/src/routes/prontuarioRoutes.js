const express = require('express');
const router = express.Router();

const prontuarioController = require('../controllers/prontuarioController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.post(
    '/',
    authMiddleware,
    roleMiddleware(['MEDICO']),
    prontuarioController.criarProntuario
);

router.get(
    '/',
    authMiddleware,
    roleMiddleware(['MEDICO', 'SECRETARIO', 'PACIENTE']),
    prontuarioController.listarProntuarios
);

router.get(
    '/:id',
    authMiddleware,
    roleMiddleware(['MEDICO', 'SECRETARIO', 'PACIENTE']),
    prontuarioController.buscarProntuarioPorId
);

router.put(
    '/:id',
    authMiddleware,
    roleMiddleware(['MEDICO']),
    prontuarioController.atualizarProntuario
);

module.exports = router;