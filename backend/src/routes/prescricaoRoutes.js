const express = require('express');
const router = express.Router();

const {
    listarPrescricoes,
    buscarPrescricaoPorId,
    criarPrescricao,
    atualizarPrescricao,
    deletarPrescricao
} = require('../controllers/prescricaoController');

router.get('/', listarPrescricoes);
router.get('/:id', buscarPrescricaoPorId);
router.post('/', criarPrescricao);
router.put('/:id', atualizarPrescricao);
router.delete('/:id', deletarPrescricao);

module.exports = router;