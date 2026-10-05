import { Link } from 'react-router'
import {
  FaArrowLeft,
  FaCalendarCheck,
  FaFileMedical,
  FaUserInjured,
  FaUserMd,
  FaUserPlus,
  FaUserTie
} from 'react-icons/fa'
import AuthShell from '../../components/auth/AuthShell'

function RegisterPage() {
  return (
    <AuthShell
      tone="blue"
      eyebrow="Comece agora"
      title="Uma experiência feita para cada perfil."
      description="Escolha como você utilizará o Clinical Med para acessar o formulário de cadastro correto."
      features={[
        { icon: FaCalendarCheck, title: 'Fluxos personalizados', text: 'Campos e recursos adequados para cada perfil.' },
        { icon: FaFileMedical, title: 'Dados centralizados', text: 'Sua jornada começa com um cadastro completo.' }
      ]}
      panelClassName="auth-panel--chooser"
    >
      <Link to="/login" className="auth-back-link"><FaArrowLeft />Voltar para o login</Link>
      <header className="auth-form-header">
        <span className="auth-form-header__icon"><FaUserPlus /></span>
        <span className="auth-form-header__eyebrow">Criar uma conta</span>
        <h2>Escolha seu perfil</h2>
        <p>Cada perfil possui informações e recursos específicos no sistema.</p>
      </header>

      <div className="auth-chooser-grid">
        <Link to="/cadastro/paciente" className="auth-chooser-card">
          <span><FaUserInjured /></span>
          <span><strong>Sou paciente</strong><small>Acompanhe consultas, exames e seu histórico.</small></span>
        </Link>
        <Link to="/cadastro/medico" className="auth-chooser-card auth-chooser-card--doctor">
          <span><FaUserMd /></span>
          <span><strong>Sou médico</strong><small>Gerencie atendimentos e registros clínicos.</small></span>
        </Link>
        <Link to="/cadastro/secretario" className="auth-chooser-card auth-chooser-card--secretary">
          <span><FaUserTie /></span>
          <span><strong>Sou secretário</strong><small>Organize cadastros, agendas e a operação.</small></span>
        </Link>
      </div>
    </AuthShell>
  )
}

export default RegisterPage
