import api from './api'

export const listarMedicos = async () => {
  const response = await api.get('/medicos')
  return response.data
}

export const criarMedico = async (dados) => {
  const response = await api.post('/medicos', dados)
  return response.data
}

export const atualizarMedico = async (id, dados) => {
  const response = await api.put(`/medicos/${id}`, dados)
  return response.data
}

export const excluirMedico = async (id) => {
  const response = await api.delete(`/medicos/${id}`)
  return response.data
}