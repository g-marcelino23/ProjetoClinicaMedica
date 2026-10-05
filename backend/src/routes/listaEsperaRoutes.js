const express = require('express');
const router = express.Router();

const listaEsperaController = require('../controllers/listaEsperaController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');
const validate = require('../middlewares/validate')
const schemas = require('../validation/schemas')

router.post(
    '/',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    validate(schemas.waitingList.create),
    listaEsperaController.criarEntradaListaEspera
);

router.get(
    '/',
    authMiddleware,
    roleMiddleware(['SECRETARIO', 'PACIENTE']),
    listaEsperaController.listarListaEspera
);

router.get(
    '/:id',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    validate(schemas.waitingList.id),
    listaEsperaController.buscarItemListaEsperaPorId
);

router.put(
    '/:id/chamar',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    validate(schemas.waitingList.id),
    listaEsperaController.chamarProximoDaFila
);

router.put(
    '/:id/encerrar',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    validate(schemas.waitingList.id),
    listaEsperaController.encerrarItemListaEspera
);

router.put(
    '/:id/cancelar',
    authMiddleware,
    roleMiddleware(['SECRETARIO']),
    validate(schemas.waitingList.id),
    listaEsperaController.cancelarItemListaEspera
);

module.exports = router;
