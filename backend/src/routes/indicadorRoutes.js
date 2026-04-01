const express = require('express');
const router = express.Router();

const indicadorController = require('../controllers/indicadorController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.get(
    '/',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    indicadorController.obterIndicadores
);

module.exports = router;