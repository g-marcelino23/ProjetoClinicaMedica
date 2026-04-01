import api from './api'

export const listarProntuarios = async () => {
  const response = await api.get('/prontuarios')
  return response.data
}

export const buscarProntuarioPorId = async (id) => {
  const response = await api.get(`/prontuarios/${id}`)
  return response.data
}

export const criarProntuario = async (dados) => {
  const response = await api.post('/prontuarios', dados)
  return response.data
}

export const atualizarProntuario = async (id, dados) => {
  const response = await api.put(`/prontuarios/${id}`, dados)
  return response.data
}