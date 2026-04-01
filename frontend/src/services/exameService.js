import api from './api'

export const listarExames = async () => {
  const response = await api.get('/exames')
  return response.data
}

export const buscarExamePorId = async (id) => {
  const response = await api.get(`/exames/${id}`)
  return response.data
}

export const criarExame = async (dados) => {
  const response = await api.post('/exames', dados)
  return response.data
}

export const atualizarExame = async (id, dados) => {
  const response = await api.put(`/exames/${id}`, dados)
  return response.data
}

export const deletarExame = async (id) => {
  const response = await api.delete(`/exames/${id}`)
  return response.data
}