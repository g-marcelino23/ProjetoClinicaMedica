import api from './api'

export const registerUsuario = async (dados) => {
  const endpoint = dados.perfil === 'PACIENTE' ? '/auth/register' : '/auth/staff'
  const response = await api.post(endpoint, dados)
  return response.data
}
