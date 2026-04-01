const listarPrescricoes = (req, res) => {
    res.json({ mensagem: 'Listando prescrições' });
};

const buscarPrescricaoPorId = (req, res) => {
    const { id } = req.params;
    res.json({ mensagem: `Buscando prescrição ${id}` });
};

const criarPrescricao = (req, res) => {
    res.json({ mensagem: 'Prescrição criada com sucesso' });
};

const atualizarPrescricao = (req, res) => {
    const { id } = req.params;
    res.json({ mensagem: `Prescrição ${id} atualizada com sucesso` });
};

const deletarPrescricao = (req, res) => {
    const { id } = req.params;
    res.json({ mensagem: `Prescrição ${id} removida com sucesso` });
};

module.exports = {
    listarPrescricoes,
    buscarPrescricaoPorId,
    criarPrescricao,
    atualizarPrescricao,
    deletarPrescricao
};