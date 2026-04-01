const express = require('express');
const router = express.Router();

const agendaController = require('../controllers/agendaController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.post(
    '/',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    agendaController.criarAgenda
);

router.get(
    '/',
    authMiddleware,
    agendaController.listarAgendas
);

router.get(
    '/medico/:medicoId',
    authMiddleware,
    agendaController.listarAgendaPorMedico
);

router.put(
    '/:id',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    agendaController.atualizarAgenda
);

router.delete(
    '/:id',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    agendaController.deletarAgenda
);

module.exports = router;