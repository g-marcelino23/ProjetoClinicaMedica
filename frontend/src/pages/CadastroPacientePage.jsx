import { useState } from 'react'
import { Alert, Button, Form, Spinner } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router'
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCalendarCheck,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaFileMedical,
  FaHeartbeat,
  FaIdCard,
  FaLock,
  FaMapMarkerAlt,
  FaPhone,
  FaShieldAlt,
  FaUser,
  FaUserInjured
} from 'react-icons/fa'
import AuthShell from '../components/auth/AuthShell'
import { registerUsuario } from '../services/authService'
import { formatCPF, formatPhone, onlyNumbers } from '../utils/registrationFormatters'

function CadastroPacientePage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    cpf: '',
    telefone: '',
    data_nascimento: '',
    endereco: ''
  })
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [loading, setLoading] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    let nextValue = value

    if (name === 'cpf') nextValue = formatCPF(value)
    if (name === 'telefone') nextValue = formatPhone(value)

    setErro('')
    setFormData((prev) => ({ ...prev, [name]: nextValue }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErro('')
    setSucesso('')

    const cpf = onlyNumbers(formData.cpf)
    const telefone = onlyNumbers(formData.telefone)

    if (cpf.length !== 11) {
      setErro('CPF inválido. Digite os 11 números do CPF.')
      return
    }

    if (telefone && ![10, 11].includes(telefone.length)) {
      setErro('Telefone inválido. Digite um telefone com DDD.')
      return
    }

    try {
      setLoading(true)
      const response = await registerUsuario({
        ...formData,
        perfil: 'PACIENTE',
        cpf,
        telefone
      })
      setSucesso(response.mensagem || 'Cadastro realizado com sucesso!')
      setTimeout(() => navigate('/login'), 1500)
    } catch (error) {
      setErro(error.response?.data?.erro || 'Erro ao cadastrar paciente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      tone="patient"
      eyebrow="Área do paciente"
      title="Sua saúde mais próxima e organizada."
      description="Crie sua conta para acompanhar consultas, exames, prescrições e seu histórico clínico com praticidade."
      features={[
        { icon: FaCalendarCheck, title: 'Acompanhe consultas', text: 'Visualize seus próximos atendimentos.' },
        { icon: FaFileMedical, title: 'Histórico acessível', text: 'Consulte exames e registros clínicos.' },
        { icon: FaShieldAlt, title: 'Dados protegidos', text: 'Acesso individual às suas informações.' }
      ]}
    >
      <Link to="/login" className="auth-back-link"><FaArrowLeft />Voltar para o login</Link>
      <header className="auth-form-header">
        <span className="auth-form-header__icon"><FaUserInjured /></span>
        <span className="auth-form-header__eyebrow">Nova conta</span>
        <h2>Cadastro de paciente</h2>
        <p>Preencha seus dados pessoais para começar.</p>
      </header>

      {erro && <Alert variant="danger" className="auth-alert">{erro}</Alert>}
      {sucesso && <Alert variant="success" className="auth-alert">{sucesso}</Alert>}

      <Form onSubmit={handleSubmit}>
        <div className="auth-grid">
          <Form.Group className="auth-field auth-field--full">
            <Form.Label>Nome completo <span>*</span></Form.Label>
            <div className="auth-input-wrap"><FaUser /><Form.Control name="nome" value={formData.nome} onChange={handleChange} placeholder="Digite seu nome completo" autoComplete="name" required /></div>
          </Form.Group>
          <Form.Group className="auth-field">
            <Form.Label>E-mail <span>*</span></Form.Label>
            <div className="auth-input-wrap"><FaEnvelope /><Form.Control type="email" name="email" value={formData.email} onChange={handleChange} placeholder="seuemail@exemplo.com" autoComplete="email" required /></div>
          </Form.Group>
          <Form.Group className="auth-field">
            <Form.Label>Senha <span>*</span></Form.Label>
            <div className="auth-input-wrap has-action">
              <FaLock />
              <Form.Control type={mostrarSenha ? 'text' : 'password'} name="senha" value={formData.senha} onChange={handleChange} placeholder="Mínimo de 15 caracteres" autoComplete="new-password" minLength={15} maxLength={72} required />
              <button type="button" className="auth-input-action" onClick={() => setMostrarSenha((prev) => !prev)} aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}>{mostrarSenha ? <FaEyeSlash /> : <FaEye />}</button>
            </div>
          </Form.Group>
          <Form.Group className="auth-field">
            <Form.Label>CPF <span>*</span></Form.Label>
            <div className="auth-input-wrap"><FaIdCard /><Form.Control name="cpf" value={formData.cpf} onChange={handleChange} placeholder="000.000.000-00" inputMode="numeric" maxLength={14} required /></div>
          </Form.Group>
          <Form.Group className="auth-field">
            <Form.Label>Telefone</Form.Label>
            <div className="auth-input-wrap"><FaPhone /><Form.Control name="telefone" value={formData.telefone} onChange={handleChange} placeholder="(85) 99999-9999" inputMode="numeric" maxLength={15} /></div>
          </Form.Group>
          <Form.Group className="auth-field">
            <Form.Label>Data de nascimento</Form.Label>
            <div className="auth-input-wrap"><FaCalendarAlt /><Form.Control type="date" name="data_nascimento" value={formData.data_nascimento} onChange={handleChange} /></div>
          </Form.Group>
          <Form.Group className="auth-field">
            <Form.Label>Endereço</Form.Label>
            <div className="auth-input-wrap"><FaMapMarkerAlt /><Form.Control name="endereco" value={formData.endereco} onChange={handleChange} placeholder="Digite seu endereço" /></div>
          </Form.Group>
        </div>
        <div className="auth-form-note"><FaHeartbeat />Os campos marcados com asterisco são obrigatórios.</div>
        <Button type="submit" className="auth-submit" disabled={loading}>
          {loading ? <><Spinner animation="border" size="sm" />Cadastrando</> : <>Criar conta de paciente</>}
        </Button>
        <p className="auth-footer-link">Já possui uma conta? <Link to="/login">Entrar</Link></p>
      </Form>
    </AuthShell>
  )
}

export default CadastroPacientePage
