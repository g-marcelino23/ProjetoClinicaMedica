const express = require('express')
const router = express.Router()

const {
    listarPrescricoes,
    listarMinhasPrescricoes,
    buscarPrescricaoPorId,
    criarPrescricao,
    atualizarPrescricao,
    deletarPrescricao
} = require('../controllers/prescricaoController')

const authMiddleware = require('../middlewares/authMiddleware')
const roleMiddleware = require('../middlewares/roleMiddleware')

router.use(authMiddleware)

router.get(
    '/',
    roleMiddleware(['MEDICO', 'SECRETARIO']),
    listarPrescricoes
)

router.get(
    '/minhas',
    roleMiddleware(['PACIENTE']),
    listarMinhasPrescricoes
)

router.get(
    '/:id',
    roleMiddleware(['PACIENTE', 'MEDICO', 'SECRETARIO']),
    buscarPrescricaoPorId
)

router.post(
    '/',
    roleMiddleware(['MEDICO', 'SECRETARIO']),
    criarPrescricao
)

router.put(
    '/:id',
    roleMiddleware(['MEDICO', 'SECRETARIO']),
    atualizarPrescricao
)

router.delete(
    '/:id',
    roleMiddleware(['MEDICO', 'SECRETARIO']),
    deletarPrescricao
)

module.exports = router