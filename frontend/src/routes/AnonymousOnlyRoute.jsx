import { Navigate } from 'react-router'
import { Spinner } from 'react-bootstrap'
import { useAuth } from '../context/AuthContext'
import { getAnonymousOnlyRouteDecision } from './routeAccess'

function AnonymousOnlyRoute({ children }) {
  const { user, initialized } = useAuth()
  const decision = getAnonymousOnlyRouteDecision({ initialized, user })

  if (decision === 'WAIT') {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" />
      </div>
    )
  }

  if (decision === 'DASHBOARD') return <Navigate to="/dashboard" replace />

  return children
}

export default AnonymousOnlyRoute
