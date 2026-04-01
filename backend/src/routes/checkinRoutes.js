const express = require('express');
const router = express.Router();

const checkinController = require('../controllers/checkinController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.put(
    '/:consultaId',
    authMiddleware,
    roleMiddleware(['PACIENTE']),
    checkinController.realizarCheckin
);

module.exports = router;