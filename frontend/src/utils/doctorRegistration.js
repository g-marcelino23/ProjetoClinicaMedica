const FIELD_LABELS = {
  nome: 'Nome',
  email: 'E-mail',
  senha: 'Senha',
  perfil: 'Perfil',
  telefone: 'Telefone',
  crm: 'CRM',
  especialidade: 'Especialidade',
}

export const buildDoctorRegistrationPayload = (formData) => {
  const telefone = String(formData.telefone || '').replace(/\D/g, '')

  return {
    nome: formData.nome.trim(),
    email: formData.email.trim(),
    senha: formData.senha,
    perfil: 'MEDICO',
    ...(telefone ? { telefone } : {}),
    crm: formData.crm.trim().toUpperCase(),
    especialidade: formData.especialidade.trim(),
  }
}

export const getRegistrationErrorMessage = (error) => {
  const response = error.response?.data
  const fieldErrors = Array.isArray(response?.campos)
    ? response.campos
        .filter((item) => typeof item?.mensagem === 'string')
        .map((item) => {
          const field = String(item.campo || '').split('.').at(-1)
          return `${FIELD_LABELS[field] || 'Campo'}: ${item.mensagem}`
        })
    : []

  return fieldErrors.join(' ') || response?.erro || 'Erro ao cadastrar médico.'
}
