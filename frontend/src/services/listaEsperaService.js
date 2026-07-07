import api from './api'

export const listarListaEspera = async () => {
  const response = await api.get('/lista-espera')
  return response.data
}