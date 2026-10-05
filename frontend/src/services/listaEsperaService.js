import api from './api'

export const listarListaEspera = async () => {
  const response = await api.get('/lista-espera')
  return response.data
}

export const adicionarListaEspera = async (dados) => {
  const response = await api.post('/lista-espera', dados)
  return response.data
}

export const chamarPacienteListaEspera = async (id) => {
  const response = await api.put(`/lista-espera/${id}/chamar`)
  return response.data
}

export const encerrarItemListaEspera = async (id) => {
  const response = await api.put(`/lista-espera/${id}/encerrar`)
  return response.data
}

export const cancelarItemListaEspera = async (id) => {
  const response = await api.put(`/lista-espera/${id}/cancelar`)
  return response.data
}
