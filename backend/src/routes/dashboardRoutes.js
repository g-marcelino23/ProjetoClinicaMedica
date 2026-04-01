const express = require('express');
const router = express.Router();

const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.get(
    '/resumo',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    dashboardController.obterResumoDashboard
);

module.exports = router;