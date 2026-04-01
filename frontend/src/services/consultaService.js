import api from './api'

export const listarConsultas = async () => {
    const response = await api.get('/consultas')
    return response.data
}

export const criarConsulta = async (dados) => {
    const response = await api.post('/consultas', dados)
    return response.data
}

export const atualizarConsulta = async (id, dados) => {
    const response = await api.put(`/consultas/${id}`, dados)
    return response.data
}

export const excluirConsulta = async (id) => {
    const response = await api.delete(`/consultas/${id}`)
    return response.data
}