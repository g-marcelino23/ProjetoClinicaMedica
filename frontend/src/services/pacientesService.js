import api from './api'

export const listarPacientes = async () => {
  const response = await api.get('/pacientes')
  return response.data
}

export const criarPaciente = async (dados) => {
  const response = await api.post('/pacientes', dados)
  return response.data
}

export const atualizarPaciente = async (id, dados) => {
  const response = await api.put(`/pacientes/${id}`, dados)
  return response.data
}

export const excluirPaciente = async (id) => {
  const response = await api.delete(`/pacientes/${id}`)
  return response.data
}