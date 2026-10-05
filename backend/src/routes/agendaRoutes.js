const express = require('express');
const router = express.Router();

const agendaController = require('../controllers/agendaController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const validate = require('../middlewares/validate')
const schemas = require('../validation/schemas')

router.post(
    '/',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    validate(schemas.agendas.create),
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
    validate(schemas.agendas.doctorId),
    agendaController.listarAgendaPorMedico
);

router.put(
    '/:id',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    validate(schemas.agendas.update),
    agendaController.atualizarAgenda
);

router.delete(
    '/:id',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    validate(schemas.agendas.id),
    agendaController.deletarAgenda
);

module.exports = router;
