import { useState } from 'react'
import { Alert, Button, Form, Spinner } from 'react-bootstrap'
import { useNavigate } from 'react-router'
import {
  FaArrowRight,
  FaCalendarCheck,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaFileMedical,
  FaLock,
  FaShieldAlt,
  FaUserInjured,
  FaUserMd,
  FaUserTie
} from 'react-icons/fa'
import AuthShell from '../../components/auth/AuthShell'
import { useAuth } from '../../context/AuthContext'

function LoginPage() {
  const navigate = useNavigate()
  const { login, verifyMfa } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [codigoMfa, setCodigoMfa] = useState('')
  const [mfa, setMfa] = useState(null)
  const [recoveryCodes, setRecoveryCodes] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErro('')
    setSubmitting(true)

    try {
      const result = mfa
        ? await verifyMfa(mfa.challengeId, codigoMfa)
        : await login(email, senha)

      if (result.success) {
        if (result.recoveryCodes) {
          setRecoveryCodes(result.recoveryCodes)
        } else {
          navigate('/dashboard')
        }
      } else if (result.requiresMfa) {
        setMfa({
          challengeId: result.challengeId,
          enrollmentRequired: result.enrollmentRequired,
          secret: result.secret,
          otpAuthUri: result.otpAuthUri,
        })
        setSenha('')
      } else {
        setErro(result.message || 'Erro ao fazer login.')
      }
    } catch {
      setErro('Erro ao fazer login.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      tone="blue"
      eyebrow="Cuidado conectado"
      title="Toda a rotina clínica em um só lugar."
      description="Uma plataforma completa para organizar atendimentos e aproximar pacientes, médicos e equipe administrativa."
      features={[
        {
          icon: FaCalendarCheck,
          title: 'Agenda integrada',
          text: 'Consultas e disponibilidades sempre organizadas.'
        },
        {
          icon: FaFileMedical,
          title: 'Histórico centralizado',
          text: 'Prontuários, exames e prescrições com acesso seguro.'
        },
        {
          icon: FaShieldAlt,
          title: 'Acesso por perfil',
          text: 'Cada usuário visualiza somente o que precisa.'
        }
      ]}
      panelClassName="auth-panel--login"
    >
      <header className="auth-form-header">
        <span className="auth-form-header__icon">
          <FaLock />
        </span>
        <span className="auth-form-header__eyebrow">Bem-vindo de volta</span>
        <h2>Acesse sua conta</h2>
        <p>Entre com seu e-mail e senha para continuar no Clinical Med.</p>
      </header>

      {erro && <Alert variant="danger" className="auth-alert">{erro}</Alert>}

      {recoveryCodes ? (
        <>
          <Alert variant="warning" className="auth-alert">
            Guarde estes códigos em local seguro. Cada código pode ser usado
            uma única vez se você perder acesso ao autenticador.
          </Alert>
          <pre className="auth-recovery-codes">
            {recoveryCodes.join('\n')}
          </pre>
          <Button
            type="button"
            className="auth-submit"
            onClick={() => navigate('/dashboard')}
          >
            Já guardei os códigos <FaArrowRight />
          </Button>
        </>
      ) : (
      <Form onSubmit={handleSubmit}>
        {!mfa ? (
          <>
        <Form.Group className="auth-field">
          <Form.Label>E-mail</Form.Label>
          <div className="auth-input-wrap">
            <FaEnvelope />
            <Form.Control
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seuemail@exemplo.com"
              autoComplete="email"
              maxLength={254}
              autoFocus
              required
            />
          </div>
        </Form.Group>

        <Form.Group className="auth-field mt-3">
          <Form.Label>Senha</Form.Label>
          <div className="auth-input-wrap has-action">
            <FaLock />
            <Form.Control
              type={mostrarSenha ? 'text' : 'password'}
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              placeholder="Digite sua senha"
              autoComplete="current-password"
              maxLength={72}
              required
            />
            <button
              type="button"
              className="auth-input-action"
              onClick={() => setMostrarSenha((prev) => !prev)}
              aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {mostrarSenha ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </Form.Group>
          </>
        ) : (
          <>
            {mfa.enrollmentRequired && (
              <Alert variant="info" className="auth-alert">
                Adicione uma nova conta no seu aplicativo autenticador usando
                esta chave:
                <br />
                <strong>{mfa.secret}</strong>
              </Alert>
            )}
            <Form.Group className="auth-field">
              <Form.Label>
                Código do autenticador ou código de recuperação
              </Form.Label>
              <div className="auth-input-wrap">
                <FaShieldAlt />
                <Form.Control
                  type="text"
                  value={codigoMfa}
                  onChange={(event) =>
                    setCodigoMfa(event.target.value.toUpperCase())
                  }
                  placeholder="000000"
                  autoComplete="one-time-code"
                  maxLength={14}
                  autoFocus
                  required
                />
              </div>
            </Form.Group>
          </>
        )}

        <Button type="submit" className="auth-submit" disabled={submitting}>
          {submitting ? (
            <><Spinner animation="border" size="sm" />Entrando</>
          ) : (
            <>{mfa ? 'Confirmar código' : 'Entrar no sistema'} <FaArrowRight /></>
          )}
        </Button>
      </Form>
      )}

      {!mfa && !recoveryCodes && (
      <>
      <div className="auth-divider">Ainda não possui uma conta?</div>

      <div className="auth-profile-grid">
        <button type="button" className="auth-profile-card" onClick={() => navigate('/cadastro/paciente')}>
          <span><FaUserInjured /></span><strong>Paciente</strong><small>Acompanhe sua saúde</small>
        </button>
        <button type="button" className="auth-profile-card auth-profile-card--doctor" onClick={() => navigate('/cadastro/medico')}>
          <span><FaUserMd /></span><strong>Médico</strong><small>Gerencie atendimentos</small>
        </button>
        <button type="button" className="auth-profile-card auth-profile-card--secretary" onClick={() => navigate('/cadastro/secretario')}>
          <span><FaUserTie /></span><strong>Secretário</strong><small>Organize a clínica</small>
        </button>
      </div>
      </>
      )}
    </AuthShell>
  )
}

export default LoginPage
