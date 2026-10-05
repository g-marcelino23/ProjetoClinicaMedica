import { Navigate } from 'react-router'
import { useAuth } from '../context/AuthContext'
import { Spinner } from 'react-bootstrap'
import { getProtectedRouteDecision } from './routeAccess'

function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, initialized } = useAuth()
  const decision = getProtectedRouteDecision({ initialized, user, allowedRoles })

  if (decision === 'WAIT') {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" />
      </div>
    )
  }

  if (decision === 'LOGIN') {
    return <Navigate to="/login" replace />
  }

  if (decision === 'DASHBOARD') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default ProtectedRoute
