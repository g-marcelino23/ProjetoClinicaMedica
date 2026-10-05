const allAuthenticatedRoles = Object.freeze(['SECRETARIO', 'MEDICO', 'PACIENTE'])

export const ROUTE_ROLES = Object.freeze({
  '/alterar-senha': allAuthenticatedRoles,
  '/dashboard': allAuthenticatedRoles,
  '/pacientes': Object.freeze(['SECRETARIO']),
  '/cadastro/medico': Object.freeze(['SECRETARIO']),
  '/cadastro/secretario': Object.freeze(['SECRETARIO']),
  '/prescricoes': Object.freeze(['PACIENTE', 'MEDICO']),
  '/medicos': Object.freeze(['SECRETARIO']),
  '/consultas': allAuthenticatedRoles,
  '/agenda': allAuthenticatedRoles,
  '/prontuarios': Object.freeze(['MEDICO', 'PACIENTE']),
  '/exames': allAuthenticatedRoles,
  '/lista-espera': Object.freeze(['SECRETARIO']),
  '/indicadores': Object.freeze(['SECRETARIO']),
  '/relatorios': Object.freeze(['SECRETARIO']),
})

export const canAccessRoute = (profile, path) =>
  Boolean(profile && ROUTE_ROLES[path]?.includes(profile))
