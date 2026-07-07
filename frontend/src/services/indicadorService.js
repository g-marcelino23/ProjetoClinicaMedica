import api from './api';

export const obterIndicadores = async (filtros = {}) => {
  const response = await api.get('/indicadores', {
    params: filtros
  });

  return response.data;
};