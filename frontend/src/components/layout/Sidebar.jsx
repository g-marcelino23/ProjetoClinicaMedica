import { Nav } from 'react-bootstrap'
import { Link, useLocation, useNavigate } from 'react-router'
import {
  FaCalendarCheck, FaChartLine, FaChevronLeft, FaChevronRight, FaClock,
  FaFileAlt, FaFlask, FaHeartbeat, FaListUl, FaNotesMedical,
  FaPrescriptionBottleAlt, FaSignOutAlt, FaThLarge, FaTimes,
  FaUserInjured, FaUserMd, FaUserPlus, FaKey
} from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'
import { ROUTE_ROLES } from '../../routes/roleAccess'
import './Sidebar.css'

const MENU_SECTIONS = [
  { label: 'Visão geral', items: [
    { path: '/dashboard', label: 'Dashboard', icon: FaThLarge, roles: ROUTE_ROLES['/dashboard'] }
  ] },
  { label: 'Cadastros', items: [
    { path: '/pacientes', label: 'Pacientes', icon: FaUserInjured, roles: ROUTE_ROLES['/pacientes'] },
    { path: '/medicos', label: 'Médicos', icon: FaUserMd, roles: ROUTE_ROLES['/medicos'] },
    { path: '/cadastro/medico', label: 'Cadastrar médico', icon: FaUserPlus, roles: ROUTE_ROLES['/cadastro/medico'] }
  ] },
  { label: 'Atendimento', items: [
    { path: '/consultas', label: 'Consultas', icon: FaCalendarCheck, roles: ROUTE_ROLES['/consultas'] },
    { path: '/agenda', label: 'Agenda', icon: FaClock, roles: ROUTE_ROLES['/agenda'] },
    { path: '/lista-espera', label: 'Lista de espera', icon: FaListUl, roles: ROUTE_ROLES['/lista-espera'] }
  ] },
  { label: 'Área clínica', items: [
    { path: '/exames', label: 'Exames', icon: FaFlask, roles: ROUTE_ROLES['/exames'] },
    { path: '/prontuarios', label: 'Prontuários', icon: FaNotesMedical, roles: ROUTE_ROLES['/prontuarios'] },
    { path: '/prescricoes', label: 'Prescrições', icon: FaPrescriptionBottleAlt, roles: ROUTE_ROLES['/prescricoes'] }
  ] },
  { label: 'Gestão', items: [
    { path: '/indicadores', label: 'Indicadores', icon: FaChartLine, roles: ROUTE_ROLES['/indicadores'] },
    { path: '/relatorios', label: 'Relatórios', icon: FaFileAlt, roles: ROUTE_ROLES['/relatorios'] }
  ] },
  { label: 'Conta', items: [
    { path: '/alterar-senha', label: 'Alterar senha', icon: FaKey, roles: ROUTE_ROLES['/alterar-senha'] }
  ] }
]

function getInitials(name) {
  if (!name) return 'CM'
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function Sidebar({ collapsed, mobileOpen, onToggle, onMobileClose }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const perfil = user?.perfil || 'SECRETARIO'
  const perfilLabel = { SECRETARIO: 'Secretário', MEDICO: 'Médico', PACIENTE: 'Paciente' }[perfil]
  const sections = MENU_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(perfil))
  })).filter((section) => section.items.length > 0)
  const isActive = (path) => path === '/dashboard'
    ? location.pathname === path
    : location.pathname === path || location.pathname.startsWith(`${path}/`)

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <>
      <button type="button" className={`sidebar-overlay ${mobileOpen ? 'is-visible' : ''}`} onClick={onMobileClose} aria-label="Fechar menu" />
      <aside className={`clinical-sidebar sidebar ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`}>
        <header className="clinical-sidebar__header">
          <Link to="/dashboard" className="clinical-sidebar__brand" onClick={onMobileClose}>
            <span className="clinical-sidebar__logo"><FaHeartbeat /></span>
            <span className="clinical-sidebar__brand-text"><strong>Clinical Med</strong><small>Gestão clínica</small></span>
          </Link>
          <button type="button" className="clinical-sidebar__mobile-close" onClick={onMobileClose} aria-label="Fechar menu"><FaTimes /></button>
        </header>

        <section className="clinical-sidebar__user">
          <span className="clinical-sidebar__avatar">{getInitials(user?.nome)}</span>
          <span className="clinical-sidebar__user-details"><strong>{user?.nome || 'Usuário'}</strong><small>{perfilLabel}</small></span>
          <span className="clinical-sidebar__online" title="Usuário conectado" />
        </section>

        <nav className="clinical-sidebar__navigation" aria-label="Navegação principal">
          {sections.map((section) => (
            <div key={section.label} className="clinical-sidebar__section">
              <span className="clinical-sidebar__section-label">{section.label}</span>
              <Nav className="clinical-sidebar__links">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.path)
                  return (
                    <Nav.Link as={Link} to={item.path} key={item.path} className={`sidebar-link ${active ? 'active' : ''}`} onClick={onMobileClose} aria-current={active ? 'page' : undefined} title={collapsed ? item.label : undefined}>
                      <span className="sidebar-link__icon"><Icon /></span>
                      <span className="sidebar-link__label">{item.label}</span>
                      {active && <span className="sidebar-link__active-dot" />}
                    </Nav.Link>
                  )
                })}
              </Nav>
            </div>
          ))}
        </nav>

        <footer className="clinical-sidebar__footer">
          <button type="button" className="clinical-sidebar__logout" onClick={handleLogout} title={collapsed ? 'Sair' : undefined}><FaSignOutAlt /><span>Sair da conta</span></button>
        </footer>
        <button type="button" className="clinical-sidebar__collapse" onClick={onToggle} aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'} title={collapsed ? 'Expandir menu' : 'Recolher menu'}>
          {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
        </button>
      </aside>
    </>
  )
}

export default Sidebar
