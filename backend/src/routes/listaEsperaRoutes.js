const express = require('express');
const router = express.Router();

const listaEsperaController = require('../controllers/listaEsperaController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.post(
    '/',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    listaEsperaController.criarEntradaListaEspera
);

router.get(
    '/',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    listaEsperaController.listarListaEspera
);

router.get(
    '/:id',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    listaEsperaController.buscarItemListaEsperaPorId
);

router.put(
    '/:id/chamar',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    listaEsperaController.chamarProximoDaFila
);

router.put(
    '/:id/encerrar',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    listaEsperaController.encerrarItemListaEspera
);

module.exports = router;