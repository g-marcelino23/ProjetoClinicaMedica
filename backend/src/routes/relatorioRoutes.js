const express = require('express');
const router = express.Router();

const relatorioController = require('../controllers/relatorioController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const validate = require('../middlewares/validate');
const schemas = require('../validation/schemas');

router.get(
    '/consultas',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    validate(schemas.reports.consultations),
    relatorioController.relatorioConsultas
);

router.get(
    '/exames',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    validate(schemas.reports.exams),
    relatorioController.relatorioExames
);

router.get(
    '/atendimentos-medico',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    validate(schemas.reports.doctorAttendance),
    relatorioController.relatorioAtendimentosPorMedico
);

module.exports = router;
