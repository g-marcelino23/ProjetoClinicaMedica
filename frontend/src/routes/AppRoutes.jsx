import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import ProtectedRoute from './ProtectedRoute'
import AnonymousOnlyRoute from './AnonymousOnlyRoute'
import { ROUTE_ROLES } from './roleAccess'

const LoginPage = lazy(() => import('../pages/auth/LoginPage'))
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'))
const PacientesPage = lazy(() => import('../pages/pacientes/PacientesPage'))
const MedicosPage = lazy(() => import('../pages/medicos/MedicosPage'))
const ConsultasPage = lazy(() => import('../pages/consultas/ConsultasPage'))
const AgendaPage = lazy(() => import('../pages/agenda/AgendaPage'))
const ExamesPage = lazy(() => import('../pages/exames/ExamesPage'))
const ProntuariosPage = lazy(() => import('../pages/prontuarios/ProntuariosPage'))
const CadastroPacientePage = lazy(() => import('../pages/CadastroPacientePage'))
const CadastroMedicoPage = lazy(() => import('../pages/CadastroMedicoPage'))
const CadastroSecretarioPage = lazy(() => import('../pages/CadastroSecretarioPage'))
const PrescricoesPage = lazy(() => import('../pages/PrescricoesPage'))
const ListaEspera = lazy(() => import('../pages/ListaEspera'))
const Indicadores = lazy(() => import('../pages/indicadores/Indicadores'))
const Relatorios = lazy(() => import('../pages/relatorios/Relatorios'))
const ChangePasswordPage = lazy(() => import('../pages/auth/ChangePasswordPage'))

function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="p-4 text-center">Carregando...</div>}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route
          path="/login"
          element={
            <AnonymousOnlyRoute>
              <LoginPage />
            </AnonymousOnlyRoute>
          }
        />
        <Route
          path="/alterar-senha"
          element={
            <ProtectedRoute allowedRoles={ROUTE_ROLES['/alterar-senha']}>
              <ChangePasswordPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={ROUTE_ROLES['/dashboard']}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pacientes"
          element={
            <ProtectedRoute allowedRoles={ROUTE_ROLES['/pacientes']}>
              <PacientesPage />
            </ProtectedRoute>
          }
        />

        <Route path="/cadastro/paciente" element={<CadastroPacientePage />} />
        <Route
          path="/cadastro/medico"
          element={
            <ProtectedRoute allowedRoles={ROUTE_ROLES['/cadastro/medico']}>
              <CadastroMedicoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cadastro/secretario"
          element={
            <ProtectedRoute allowedRoles={ROUTE_ROLES['/cadastro/secretario']}>
              <CadastroSecretarioPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/prescricoes"
          element={
            <ProtectedRoute allowedRoles={ROUTE_ROLES['/prescricoes']}>
              <PrescricoesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/medicos"
          element={
            <ProtectedRoute allowedRoles={ROUTE_ROLES['/medicos']}>
              <MedicosPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/consultas"
          element={
            <ProtectedRoute allowedRoles={ROUTE_ROLES['/consultas']}>
              <ConsultasPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/agenda"
          element={
            <ProtectedRoute allowedRoles={ROUTE_ROLES['/agenda']}>
              <AgendaPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/prontuarios"
          element={
            <ProtectedRoute allowedRoles={ROUTE_ROLES['/prontuarios']}>
              <ProntuariosPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/exames"
          element={
            <ProtectedRoute allowedRoles={ROUTE_ROLES['/exames']}>
              <ExamesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/lista-espera"
          element={
            <ProtectedRoute allowedRoles={ROUTE_ROLES['/lista-espera']}>
              <ListaEspera />
            </ProtectedRoute>
          }
        />

        <Route
          path="/indicadores"
          element={
            <ProtectedRoute allowedRoles={ROUTE_ROLES['/indicadores']}>
              <Indicadores />
            </ProtectedRoute>
          }
        />

        <Route
  path="/relatorios"
  element={
    <ProtectedRoute allowedRoles={ROUTE_ROLES['/relatorios']}>
      <Relatorios />
    </ProtectedRoute>
  }
/>

        <Route path="/register" element={<Navigate to="/cadastro/paciente" replace />} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default AppRoutes
