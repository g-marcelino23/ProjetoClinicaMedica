import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
  Spinner,
  InputGroup
} from 'react-bootstrap'
import {
  FaUserMd,
  FaUser,
  FaEnvelope,
  FaLock,
  FaIdCard,
  FaPhone,
  FaStethoscope,
  FaBriefcaseMedical
} from 'react-icons/fa'
import { registerUsuario } from '../services/authService'
import './CadastroMedicoPage.css'

function CadastroMedicoPage() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    cpf: '',
    telefone: '',
    crm: '',
    especialidade: ''
  })

  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [loading, setLoading] = useState(false)

  const limparNumeros = (valor) => valor.replace(/\D/g, '')

  const formatarCPF = (valor) => {
    const numeros = valor.replace(/\D/g, '').slice(0, 11)

    if (numeros.length <= 3) return numeros
    if (numeros.length <= 6) return `${numeros.slice(0, 3)}.${numeros.slice(3)}`
    if (numeros.length <= 9) return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6)}`
    return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9, 11)}`
  }

  const formatarTelefone = (valor) => {
    const numeros = valor.replace(/\D/g, '').slice(0, 11)

    if (numeros.length <= 2) return numeros
    if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
    if (numeros.length <= 10) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`
    }
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`
  }

  const formatarCRM = (valor) => {
    let texto = valor.toUpperCase().replace(/[^A-Z0-9-]/g, '')

    if (texto.includes('-')) {
      const partes = texto.split('-')
      const numeros = partes[0].replace(/\D/g, '').slice(0, 10)
      const uf = (partes[1] || '').replace(/[^A-Z]/g, '').slice(0, 2)
      return uf ? `${numeros}-${uf}` : `${numeros}-`
    }

    const numeros = texto.replace(/\D/g, '').slice(0, 10)
    return numeros
  }

  const handleChange = (e) => {
    const { name, value } = e.target

    let novoValor = value

    if (name === 'cpf') novoValor = formatarCPF(value)
    if (name === 'telefone') novoValor = formatarTelefone(value)
    if (name === 'crm') novoValor = formatarCRM(value)

    setFormData((prev) => ({
      ...prev,
      [name]: novoValor
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')
    setSucesso('')

    const cpfLimpo = limparNumeros(formData.cpf)
    const telefoneLimpo = limparNumeros(formData.telefone)
    const crmFormatado = formData.crm.trim().toUpperCase()

    if (cpfLimpo.length !== 11) {
      setErro('CPF inválido. Digite os 11 números do CPF.')
      return
    }

    if (telefoneLimpo && telefoneLimpo.length !== 10 && telefoneLimpo.length !== 11) {
      setErro('Telefone inválido. Digite um telefone com DDD.')
      return
    }

    if (!/^\d{4,10}-[A-Z]{2}$/.test(crmFormatado)) {
      setErro('CRM inválido. Use o formato 12345-CE.')
      return
    }

    try {
      setLoading(true)

      const payload = {
        ...formData,
        perfil: 'MEDICO',
        cpf: cpfLimpo,
        telefone: telefoneLimpo,
        crm: crmFormatado
      }

      const response = await registerUsuario(payload)

      setSucesso(response.mensagem || 'Cadastro realizado com sucesso!')

      setTimeout(() => {
        navigate('/login')
      }, 1500)
    } catch (error) {
      setErro(error.response?.data?.erro || 'Erro ao cadastrar médico')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="cadastro-medico-page">
      <Container fluid className="cadastro-medico-container">
        <Row className="min-vh-100">
          <Col md={5} className="cadastro-medico-banner d-none d-md-flex">
            <div className="cadastro-medico-overlay"></div>

            <div className="cadastro-medico-banner-content">
              <span className="cadastro-medico-badge">
                <FaUserMd className="me-2" />
                Área do Médico
              </span>

              <h1>Atue com mais organização e confiança</h1>

              <p>
                Cadastre-se para acessar uma plataforma pensada para apoiar sua rotina
                clínica, com mais controle sobre atendimentos, exames e informações do paciente.
              </p>

              <div className="cadastro-medico-info-box">
                <strong>Clinical Med</strong>
                <span>
                  Um sistema profissional para otimizar a gestão do atendimento médico.
                </span>
              </div>
            </div>
          </Col>

          <Col md={7} xs={12} className="cadastro-medico-form-wrapper">
            <div className="cadastro-medico-form-box">
              <Card className="cadastro-medico-card shadow-lg border-0">
                <Card.Body className="p-4 p-lg-5">
                  <div className="text-center mb-4">
                    <h2 className="cadastro-medico-title fw-bold">
                      Cadastro de Médico
                    </h2>
                    <p className="text-muted mb-0">
                      Preencha seus dados profissionais para criar sua conta
                    </p>
                  </div>

                  {erro && <Alert variant="danger">{erro}</Alert>}
                  {sucesso && <Alert variant="success">{sucesso}</Alert>}

                  <Form onSubmit={handleSubmit}>
                    <Row>
                      <Col md={12}>
                        <Form.Group className="mb-3">
                          <Form.Label>Nome completo</Form.Label>
                          <InputGroup className="cadastro-medico-input-group">
                            <InputGroup.Text className="cadastro-medico-input-icon">
                              <FaUser />
                            </InputGroup.Text>
                            <Form.Control
                              type="text"
                              name="nome"
                              value={formData.nome}
                              onChange={handleChange}
                              placeholder="Digite seu nome completo"
                              required
                              className="cadastro-medico-input"
                            />
                          </InputGroup>
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>E-mail</Form.Label>
                          <InputGroup className="cadastro-medico-input-group">
                            <InputGroup.Text className="cadastro-medico-input-icon">
                              <FaEnvelope />
                            </InputGroup.Text>
                            <Form.Control
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleChange}
                              placeholder="Digite seu e-mail"
                              required
                              className="cadastro-medico-input"
                            />
                          </InputGroup>
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Senha</Form.Label>
                          <InputGroup className="cadastro-medico-input-group">
                            <InputGroup.Text className="cadastro-medico-input-icon">
                              <FaLock />
                            </InputGroup.Text>
                            <Form.Control
                              type="password"
                              name="senha"
                              value={formData.senha}
                              onChange={handleChange}
                              placeholder="Digite sua senha"
                              required
                              className="cadastro-medico-input"
                            />
                          </InputGroup>
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>CPF</Form.Label>
                          <InputGroup className="cadastro-medico-input-group">
                            <InputGroup.Text className="cadastro-medico-input-icon">
                              <FaIdCard />
                            </InputGroup.Text>
                            <Form.Control
                              type="text"
                              name="cpf"
                              value={formData.cpf}
                              onChange={handleChange}
                              placeholder="000.000.000-00"
                              inputMode="numeric"
                              maxLength={14}
                              required
                              className="cadastro-medico-input"
                            />
                          </InputGroup>
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Telefone</Form.Label>
                          <InputGroup className="cadastro-medico-input-group">
                            <InputGroup.Text className="cadastro-medico-input-icon">
                              <FaPhone />
                            </InputGroup.Text>
                            <Form.Control
                              type="text"
                              name="telefone"
                              value={formData.telefone}
                              onChange={handleChange}
                              placeholder="(85) 99999-9999"
                              inputMode="numeric"
                              maxLength={15}
                              className="cadastro-medico-input"
                            />
                          </InputGroup>
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>CRM</Form.Label>
                          <InputGroup className="cadastro-medico-input-group">
                            <InputGroup.Text className="cadastro-medico-input-icon">
                              <FaBriefcaseMedical />
                            </InputGroup.Text>
                            <Form.Control
                              type="text"
                              name="crm"
                              value={formData.crm}
                              onChange={handleChange}
                              placeholder="12345-CE"
                              maxLength={13}
                              required
                              className="cadastro-medico-input"
                            />
                          </InputGroup>
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group className="mb-4">
                          <Form.Label>Especialidade</Form.Label>
                          <InputGroup className="cadastro-medico-input-group">
                            <InputGroup.Text className="cadastro-medico-input-icon">
                              <FaStethoscope />
                            </InputGroup.Text>
                            <Form.Control
                              type="text"
                              name="especialidade"
                              value={formData.especialidade}
                              onChange={handleChange}
                              placeholder="Ex: Cardiologia"
                              required
                              className="cadastro-medico-input"
                            />
                          </InputGroup>
                        </Form.Group>
                      </Col>
                    </Row>

                    <div className="d-grid mb-3">
                      <Button
                        type="submit"
                        className="cadastro-medico-btn"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <Spinner
                              as="span"
                              animation="border"
                              size="sm"
                              className="me-2"
                            />
                            Cadastrando...
                          </>
                        ) : (
                          'Cadastrar Médico'
                        )}
                      </Button>
                    </div>

                    <div className="text-center">
                      <span className="text-muted">Já tem conta? </span>
                      <Link to="/login" className="cadastro-medico-link">
                        Entrar
                      </Link>
                    </div>
                  </Form>
                </Card.Body>
              </Card>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

export default CadastroMedicoPage