import api from './api';

export const obterRelatorioConsultas = async (filtros = {}) => {
  const response = await api.get('/relatorios/consultas', {
    params: filtros
  });

  return response.data;
};

export const obterRelatorioExames = async (filtros = {}) => {
  const response = await api.get('/relatorios/exames', {
    params: filtros
  });

  return response.data;
};

export const obterRelatorioAtendimentosPorMedico = async (filtros = {}) => {
  const response = await api.get('/relatorios/atendimentos-medico', {
    params: filtros
  });

  return response.data;
};