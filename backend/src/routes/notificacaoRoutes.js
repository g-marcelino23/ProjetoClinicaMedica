const express = require('express');
const router = express.Router();

const notificacaoController = require('../controllers/notificacaoController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const validate = require('../middlewares/validate')
const schemas = require('../validation/schemas')

router.post(
    '/',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    validate(schemas.notifications.create),
    notificacaoController.criarNotificacao
);

router.get(
    '/minhas',
    authMiddleware,
    notificacaoController.listarMinhasNotificacoes
);

router.put(
    '/:id/lida',
    authMiddleware,
    validate(schemas.notifications.id),
    notificacaoController.marcarComoLida
);

module.exports = router;
