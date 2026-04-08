import { Nav } from 'react-bootstrap'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  FaThLarge,
  FaUserInjured,
  FaUserMd,
  FaCalendarCheck,
  FaClock,
  FaFlask,
  FaNotesMedical,
  FaSignOutAlt,
} from 'react-icons/fa'

function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const perfil = user?.perfil || 'SECRETARIO'

  const menuItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: <FaThLarge />,
      roles: ['SECRETARIO', 'MEDICO', 'PACIENTE'],
    },
    {
      path: '/pacientes',
      label: 'Pacientes',
      icon: <FaUserInjured />,
      roles: ['SECRETARIO'],
    },
    {
      path: '/medicos',
      label: 'Médicos',
      icon: <FaUserMd />,
      roles: ['SECRETARIO'],
    },
    {
      path: '/consultas',
      label: 'Consultas',
      icon: <FaCalendarCheck />,
      roles: ['SECRETARIO', 'MEDICO', 'PACIENTE'],
    },
    {
      path: '/agenda',
      label: 'Agenda',
      icon: <FaClock />,
      roles: ['SECRETARIO', 'MEDICO', 'PACIENTE'],
    },
    {
      path: '/exames',
      label: 'Exames',
      icon: <FaFlask />,
      roles: ['SECRETARIO', 'MEDICO', 'PACIENTE'],
    },
    {
      path: '/prontuarios',
      label: 'Prontuários',
      icon: <FaNotesMedical />,
      roles: ['SECRETARIO', 'MEDICO', 'PACIENTE'],
    },

    {
  label: 'Prescrições',
  path: '/prescricoes',
  roles: ['MEDICO', 'SECRETARIO','PACIENTE'],
}
  ]

  const menuFiltrado = menuItems.filter((item) => item.roles.includes(perfil))

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="sidebar text-white d-flex flex-column p-4">
      <div className="mb-1">
        <h2 className="fw-bold mb-1">HEALTH HORIZON</h2>
        <small style={{ color: '#cbd5e1' }}>Sistema de gestão clínica</small>
      </div>

      <div className="user-box mb-4">
        <small style={{ color: '#cbd5e1' }}>Usuário logado</small>
        <p className="mb-0 fw-bold fs-5">{user?.nome || 'Gabriel'}</p>
        <small style={{ color: '#93c5fd' }}>{perfil}</small>
      </div>

      <Nav className="flex-column gap-2">
        {menuFiltrado.map((item) => {
          const isActive = location.pathname === item.path

          return (
            <Nav.Link
              as={Link}
              to={item.path}
              key={item.path}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="me-3">{item.icon}</span>
              {item.label}
            </Nav.Link>
          )
        })}
      </Nav>

      <button className="btn btn-outline-light mt-auto logout-btn" onClick={handleLogout}>
        <FaSignOutAlt className="me-2" />
        Sair
      </button>
    </aside>
  )
}

export default Sidebar