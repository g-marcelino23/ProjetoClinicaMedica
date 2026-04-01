import api from './api'

export const registerUsuario = async (dados) => {
  const response = await api.post('/auth/register', dados)
  return response.data
}