import { useState } from 'react'
import { Alert, Button, Form, Spinner } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router'
import {
  FaArrowLeft,
  FaCalendarCheck,
  FaClipboardList,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaShieldAlt,
  FaUser,
  FaUserTie,
  FaUsers
} from 'react-icons/fa'
import AuthShell from '../components/auth/AuthShell'
import { registerUsuario } from '../services/authService'

function CadastroSecretarioPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ nome: '', email: '', senha: '' })
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [loading, setLoading] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setErro('')
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErro('')
    setSucesso('')

    try {
      setLoading(true)
      const response = await registerUsuario({ ...formData, perfil: 'SECRETARIO' })
      setSucesso(response.mensagem || 'Cadastro realizado com sucesso!')
      setTimeout(() => navigate('/login'), 1500)
    } catch (error) {
      setErro(error.response?.data?.erro || 'Erro ao cadastrar secretário.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      tone="secretary"
      eyebrow="Área administrativa"
      title="Organização para uma clínica que funciona melhor."
      description="Crie seu acesso administrativo para coordenar cadastros, agendas, filas e os principais fluxos da clínica."
      features={[
        { icon: FaCalendarCheck, title: 'Agendas e consultas', text: 'Coordene horários e atendimentos.' },
        { icon: FaUsers, title: 'Gestão de cadastros', text: 'Organize pacientes e profissionais.' },
        { icon: FaShieldAlt, title: 'Controle operacional', text: 'Acesse indicadores e relatórios da clínica.' }
      ]}
      panelClassName="auth-panel--login"
    >
      <Link to="/login" className="auth-back-link"><FaArrowLeft />Voltar para o login</Link>
      <header className="auth-form-header">
        <span className="auth-form-header__icon"><FaUserTie /></span>
        <span className="auth-form-header__eyebrow">Conta administrativa</span>
        <h2>Cadastro de secretário</h2>
        <p>Preencha os dados para criar seu acesso.</p>
      </header>
      {erro && <Alert variant="danger" className="auth-alert">{erro}</Alert>}
      {sucesso && <Alert variant="success" className="auth-alert">{sucesso}</Alert>}

      <Form onSubmit={handleSubmit}>
        <div className="auth-grid">
          <Form.Group className="auth-field auth-field--full">
            <Form.Label>Nome completo <span>*</span></Form.Label>
            <div className="auth-input-wrap"><FaUser /><Form.Control name="nome" value={formData.nome} onChange={handleChange} placeholder="Digite seu nome completo" autoComplete="name" required /></div>
          </Form.Group>
          <Form.Group className="auth-field auth-field--full">
            <Form.Label>E-mail <span>*</span></Form.Label>
            <div className="auth-input-wrap"><FaEnvelope /><Form.Control type="email" name="email" value={formData.email} onChange={handleChange} placeholder="seuemail@exemplo.com" autoComplete="email" required /></div>
          </Form.Group>
          <Form.Group className="auth-field auth-field--full">
            <Form.Label>Senha <span>*</span></Form.Label>
            <div className="auth-input-wrap has-action">
              <FaLock /><Form.Control type={mostrarSenha ? 'text' : 'password'} name="senha" value={formData.senha} onChange={handleChange} placeholder="Mínimo de 15 caracteres" autoComplete="new-password" minLength={15} maxLength={72} required />
              <button type="button" className="auth-input-action" onClick={() => setMostrarSenha((prev) => !prev)} aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}>{mostrarSenha ? <FaEyeSlash /> : <FaEye />}</button>
            </div>
          </Form.Group>
        </div>
        <div className="auth-form-note"><FaClipboardList />Perfil voltado à organização de cadastros, agendas e fluxos operacionais.</div>
        <Button type="submit" className="auth-submit" disabled={loading}>
          {loading ? <><Spinner animation="border" size="sm" />Cadastrando</> : <>Criar conta administrativa</>}
        </Button>
        <p className="auth-footer-link">Já possui uma conta? <Link to="/login">Entrar</Link></p>
      </Form>
    </AuthShell>
  )
}

export default CadastroSecretarioPage
