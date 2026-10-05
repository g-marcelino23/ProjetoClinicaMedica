export const getProtectedRouteDecision = ({ initialized, user, allowedRoles }) => {
  if (!initialized) return 'WAIT'
  if (!user) return 'LOGIN'
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.perfil)) {
    return 'DASHBOARD'
  }
  return 'ALLOW'
}

export const getAnonymousOnlyRouteDecision = ({ initialized, user }) => {
  if (!initialized) return 'WAIT'
  return user ? 'DASHBOARD' : 'ALLOW'
}
