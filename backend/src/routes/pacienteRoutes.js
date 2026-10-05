const express = require('express');
const router = express.Router();

const pacienteController = require('../controllers/pacienteController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const validate = require('../middlewares/validate')
const schemas = require('../validation/schemas')

router.post(
    '/',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    validate(schemas.patients.create),
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
    validate(schemas.patients.id),
    pacienteController.buscarPacientePorId
);

router.put(
    '/:id',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    validate(schemas.patients.update),
    pacienteController.atualizarPaciente
);

router.delete(
    '/:id',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    validate(schemas.patients.id),
    pacienteController.deletarPaciente
);

module.exports = router;
