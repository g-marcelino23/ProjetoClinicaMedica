const express = require('express');
const router = express.Router();

const indicadorController = require('../controllers/indicadorController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const validate = require('../middlewares/validate');
const schemas = require('../validation/schemas');

router.get(
    '/',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    validate(schemas.indicators.list),
    indicadorController.obterIndicadores
);

module.exports = router;
