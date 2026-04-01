import api from './api'

export const listarAgendas = async () => {
  const response = await api.get('/agendas')
  return response.data
}

export const listarAgendasPorMedico = async (medicoId) => {
  const response = await api.get(`/agendas/medico/${medicoId}`)
  return response.data
}

export const criarAgenda = async (dados) => {
  const response = await api.post('/agendas', dados)
  return response.data
}

export const atualizarAgenda = async (id, dados) => {
  const response = await api.put(`/agendas/${id}`, dados)
  return response.data
}

export const excluirAgenda = async (id) => {
  const response = await api.delete(`/agendas/${id}`)
  return response.data
}