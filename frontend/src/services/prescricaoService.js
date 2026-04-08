import api from './api'

export const criarPrescricao = async (dados) => {
  const response = await api.post('/prescricoes', dados)
  return response.data
}

export const listarPrescricoes = async () => {
  const response = await api.get('/prescricoes')
  return response.data
}

export const listarMinhasPrescricoes = async () => {
  const response = await api.get('/prescricoes/minhas')
  return response.data
}

export const buscarPrescricaoPorId = async (id) => {
  const response = await api.get(`/prescricoes/${id}`)
  return response.data
}

export const atualizarPrescricao = async (id, dados) => {
  const response = await api.put(`/prescricoes/${id}`, dados)
  return response.data
}

export const deletarPrescricao = async (id) => {
  const response = await api.delete(`/prescricoes/${id}`)
  return response.data
}