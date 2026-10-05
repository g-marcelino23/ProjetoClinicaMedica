import { useState } from 'react'
import { Alert, Button, Form, Spinner } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router'
import {
  FaArrowLeft,
  FaBriefcaseMedical,
  FaCalendarCheck,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaFileMedical,
  FaLock,
  FaPhone,
  FaShieldAlt,
  FaStethoscope,
  FaUser,
  FaUserMd
} from 'react-icons/fa'
import AuthShell from '../components/auth/AuthShell'
import { registerUsuario } from '../services/authService'
import {
  formatCRM,
  formatPhone,
  onlyNumbers
} from '../utils/registrationFormatters'
import {
  buildDoctorRegistrationPayload,
  getRegistrationErrorMessage
} from '../utils/doctorRegistration'

function CadastroMedicoPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    telefone: '',
    crm: '',
    especialidade: ''
  })
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [loading, setLoading] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    let nextValue = value

    if (name === 'telefone') nextValue = formatPhone(value)
    if (name === 'crm') nextValue = formatCRM(value)

    setErro('')
    setFormData((prev) => ({ ...prev, [name]: nextValue }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErro('')
    setSucesso('')

    const telefone = onlyNumbers(formData.telefone)
    const crm = formData.crm.trim().toUpperCase()

    if (telefone && ![10, 11].includes(telefone.length)) {
      setErro('Telefone inválido. Digite um telefone com DDD.')
      return
    }
    if (!/^\d{4,10}-[A-Z]{2}$/.test(crm)) {
      setErro('CRM inválido. Use o formato 12345-CE.')
      return
    }

    try {
      setLoading(true)
      const response = await registerUsuario(
        buildDoctorRegistrationPayload({ ...formData, telefone, crm })
      )
      setSucesso(response.mensagem || 'Cadastro realizado com sucesso!')
      setTimeout(() => navigate('/medicos'), 1500)
    } catch (error) {
      setErro(getRegistrationErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      tone="doctor"
      eyebrow="Área médica"
      title="Tecnologia para uma rotina clínica mais fluida."
      description="Crie seu acesso profissional e concentre atendimentos, exames e informações dos pacientes em um ambiente integrado."
      features={[
        { icon: FaCalendarCheck, title: 'Agenda profissional', text: 'Organize atendimentos e disponibilidades.' },
        { icon: FaFileMedical, title: 'Registros clínicos', text: 'Acompanhe prontuários, exames e prescrições.' },
        { icon: FaShieldAlt, title: 'Acesso profissional', text: 'Identificação vinculada ao seu CRM.' }
      ]}
    >
      <Link to="/medicos" className="auth-back-link"><FaArrowLeft />Voltar para médicos</Link>
      <header className="auth-form-header">
        <span className="auth-form-header__icon"><FaUserMd /></span>
        <span className="auth-form-header__eyebrow">Conta profissional</span>
        <h2>Cadastro de médico</h2>
        <p>Informe seus dados pessoais e profissionais.</p>
      </header>
      {erro && <Alert variant="danger" className="auth-alert">{erro}</Alert>}
      {sucesso && <Alert variant="success" className="auth-alert">{sucesso}</Alert>}

      <Form onSubmit={handleSubmit}>
        <div className="auth-grid">
          <Form.Group className="auth-field auth-field--full">
            <Form.Label>Nome completo <span>*</span></Form.Label>
            <div className="auth-input-wrap"><FaUser /><Form.Control name="nome" value={formData.nome} onChange={handleChange} placeholder="Digite seu nome completo" autoComplete="name" maxLength={120} required /></div>
          </Form.Group>
          <Form.Group className="auth-field">
            <Form.Label>E-mail <span>*</span></Form.Label>
            <div className="auth-input-wrap"><FaEnvelope /><Form.Control type="email" name="email" value={formData.email} onChange={handleChange} placeholder="seuemail@exemplo.com" autoComplete="email" required /></div>
          </Form.Group>
          <Form.Group className="auth-field">
            <Form.Label>Senha <span>*</span></Form.Label>
            <div className="auth-input-wrap has-action">
              <FaLock /><Form.Control type={mostrarSenha ? 'text' : 'password'} name="senha" value={formData.senha} onChange={handleChange} placeholder="Mínimo de 15 caracteres" autoComplete="new-password" minLength={15} maxLength={72} required />
              <button type="button" className="auth-input-action" onClick={() => setMostrarSenha((prev) => !prev)} aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}>{mostrarSenha ? <FaEyeSlash /> : <FaEye />}</button>
            </div>
          </Form.Group>
          <Form.Group className="auth-field">
            <Form.Label>Telefone</Form.Label>
            <div className="auth-input-wrap"><FaPhone /><Form.Control name="telefone" value={formData.telefone} onChange={handleChange} placeholder="(85) 99999-9999" inputMode="numeric" maxLength={15} /></div>
          </Form.Group>
          <Form.Group className="auth-field">
            <Form.Label>CRM <span>*</span></Form.Label>
            <div className="auth-input-wrap"><FaBriefcaseMedical /><Form.Control name="crm" value={formData.crm} onChange={handleChange} placeholder="12345-CE" maxLength={13} required /></div>
          </Form.Group>
          <Form.Group className="auth-field">
            <Form.Label>Especialidade <span>*</span></Form.Label>
            <div className="auth-input-wrap"><FaStethoscope /><Form.Control name="especialidade" value={formData.especialidade} onChange={handleChange} placeholder="Ex.: Cardiologia" maxLength={120} required /></div>
          </Form.Group>
        </div>
        <div className="auth-form-note"><FaStethoscope />O CRM deve seguir o formato número-UF, como 12345-CE.</div>
        <Button type="submit" className="auth-submit" disabled={loading}>
          {loading ? <><Spinner animation="border" size="sm" />Cadastrando</> : <>Criar conta profissional</>}
        </Button>
      </Form>
    </AuthShell>
  )
}

export default CadastroMedicoPage
