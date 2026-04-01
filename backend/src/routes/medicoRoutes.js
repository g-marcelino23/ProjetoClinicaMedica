const express = require('express');
const router = express.Router();

const medicoController = require('../controllers/medicoController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.post(
    '/',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    medicoController.criarMedico
);

router.get(
    '/',
    authMiddleware,
    medicoController.listarMedicos
);

router.get(
    '/:id',
    authMiddleware,
    medicoController.buscarMedicoPorId
);

router.put(
    '/:id',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    medicoController.atualizarMedico
);

router.delete(
    '/:id',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    medicoController.deletarMedico
);

module.exports = router;