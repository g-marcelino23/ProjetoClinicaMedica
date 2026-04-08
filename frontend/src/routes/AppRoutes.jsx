import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from '../pages/auth/LoginPage'
import DashboardPage from '../pages/dashboard/DashboardPage'
import PacientesPage from '../pages/pacientes/PacientesPage'
import MedicosPage from '../pages/medicos/MedicosPage'
import ConsultasPage from '../pages/consultas/ConsultasPage'
import AgendaPage from '../pages/agenda/AgendaPage'
import ExamesPage from '../pages/exames/ExamesPage'
import ProntuariosPage from '../pages/prontuarios/ProntuariosPage'
import ProtectedRoute from './ProtectedRoute'
import RegisterPage from '../pages/auth/RegisterPage'
import CadastroPacientePage from '../pages/CadastroPacientePage'
import CadastroMedicoPage from '../pages/CadastroMedicoPage'
import CadastroSecretarioPage from '../pages/CadastroSecretarioPage'
import PrescricoesPage from '../pages/PrescricoesPage'

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['SECRETARIO', 'MEDICO', 'PACIENTE']}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pacientes"
          element={
            <ProtectedRoute allowedRoles={['SECRETARIO']}>
              <PacientesPage />
            </ProtectedRoute>
          }
        />

        <Route path="/cadastro/paciente" element={<CadastroPacientePage />} />
        <Route path="/cadastro/medico" element={<CadastroMedicoPage />} />
        <Route path="/cadastro/secretario" element={<CadastroSecretarioPage />} />

        <Route
          path="/prescricoes"
          element={
            <ProtectedRoute allowedRoles={['PACIENTE', 'MEDICO', 'SECRETARIO']}>
              <PrescricoesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/medicos"
          element={
            <ProtectedRoute allowedRoles={['SECRETARIO']}>
              <MedicosPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/consultas"
          element={
            <ProtectedRoute allowedRoles={['SECRETARIO', 'MEDICO', 'PACIENTE']}>
              <ConsultasPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/agenda"
          element={
            <ProtectedRoute allowedRoles={['SECRETARIO', 'MEDICO', 'PACIENTE']}>
              <AgendaPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/prontuarios"
          element={
            <ProtectedRoute allowedRoles={['SECRETARIO', 'MEDICO', 'PACIENTE']}>
              <ProntuariosPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/exames"
          element={
            <ProtectedRoute allowedRoles={['SECRETARIO', 'MEDICO', 'PACIENTE']}>
              <ExamesPage />
            </ProtectedRoute>
          }
        />

        <Route path="/register" element={<RegisterPage />} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes