const express = require('express');
const router = express.Router();

const medicoController = require('../controllers/medicoController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const validate = require('../middlewares/validate')
const schemas = require('../validation/schemas')

router.post(
    '/',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    validate(schemas.doctors.create),
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
    validate(schemas.doctors.id),
    medicoController.buscarMedicoPorId
);

router.put(
    '/:id',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    validate(schemas.doctors.update),
    medicoController.atualizarMedico
);

router.delete(
    '/:id',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    validate(schemas.doctors.id),
    medicoController.deletarMedico
);

module.exports = router;
