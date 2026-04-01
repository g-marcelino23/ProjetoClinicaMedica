const express = require('express');
const router = express.Router();

const notificacaoController = require('../controllers/notificacaoController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.post(
    '/',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
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
    notificacaoController.marcarComoLida
);

module.exports = router;