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
import { FaUser, FaEnvelope, FaLock, FaIdCard, FaPhone, FaCalendarAlt, FaMapMarkerAlt, FaHeartbeat } from 'react-icons/fa'
import { registerUsuario } from '../services/authService'
import './CadastroPacientePage.css'

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

  const handleChange = (e) => {
    const { name, value } = e.target
    let novoValor = value

    if (name === 'cpf') {
      novoValor = formatarCPF(value)
    }

    if (name === 'telefone') {
      novoValor = formatarTelefone(value)
    }

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

    if (cpfLimpo.length !== 11) {
      setErro('CPF inválido. Digite os 11 números do CPF.')
      return
    }

    if (telefoneLimpo && telefoneLimpo.length !== 10 && telefoneLimpo.length !== 11) {
      setErro('Telefone inválido. Digite um telefone com DDD.')
      return
    }

    try {
      setLoading(true)

      const payload = {
        ...formData,
        perfil: 'PACIENTE',
        cpf: cpfLimpo,
        telefone: telefoneLimpo
      }

      const response = await registerUsuario(payload)

      setSucesso(response.mensagem || 'Cadastro realizado com sucesso!')

      setTimeout(() => {
        navigate('/login')
      }, 1500)
    } catch (error) {
      setErro(error.response?.data?.erro || 'Erro ao cadastrar paciente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="cadastro-paciente-page">
      <Container fluid className="cadastro-paciente-container">
        <Row className="min-vh-100">
          <Col md={5} className="cadastro-paciente-banner d-none d-md-flex">
            <div className="cadastro-paciente-overlay"></div>

            <div className="cadastro-paciente-banner-content">
              <span className="cadastro-paciente-badge">
                <FaHeartbeat className="me-2" />
                Área do Paciente
              </span>

              <h1>Cuide da sua saúde com mais praticidade</h1>

              <p>
                Crie sua conta para acessar consultas, exames, prontuários e acompanhar
                seu atendimento de forma simples, organizada e segura.
              </p>

              <div className="cadastro-paciente-info-box">
                <strong>Clinical Med</strong>
                <span>
                  Um ambiente pensado para facilitar sua jornada como paciente.
                </span>
              </div>
            </div>
          </Col>

          <Col md={7} xs={12} className="cadastro-paciente-form-wrapper">
            <div className="cadastro-paciente-form-box">
              <Card className="cadastro-paciente-card shadow-lg border-0">
                <Card.Body className="p-4 p-lg-5">
                  <div className="text-center mb-4">
                    <h2 className="cadastro-paciente-title fw-bold">
                      Cadastro de Paciente
                    </h2>
                    <p className="text-muted mb-0">
                      Preencha seus dados para criar sua conta no Clinical Med
                    </p>
                  </div>

                  {erro && <Alert variant="danger">{erro}</Alert>}
                  {sucesso && <Alert variant="success">{sucesso}</Alert>}

                  <Form onSubmit={handleSubmit}>
                    <Row>
                      <Col md={12}>
                        <Form.Group className="mb-3">
                          <Form.Label>Nome completo</Form.Label>
                          <InputGroup className="cadastro-input-group">
                            <InputGroup.Text className="cadastro-input-icon">
                              <FaUser />
                            </InputGroup.Text>
                            <Form.Control
                              type="text"
                              name="nome"
                              value={formData.nome}
                              onChange={handleChange}
                              placeholder="Digite seu nome completo"
                              required
                              className="cadastro-input"
                            />
                          </InputGroup>
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>E-mail</Form.Label>
                          <InputGroup className="cadastro-input-group">
                            <InputGroup.Text className="cadastro-input-icon">
                              <FaEnvelope />
                            </InputGroup.Text>
                            <Form.Control
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleChange}
                              placeholder="Digite seu e-mail"
                              required
                              className="cadastro-input"
                            />
                          </InputGroup>
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Senha</Form.Label>
                          <InputGroup className="cadastro-input-group">
                            <InputGroup.Text className="cadastro-input-icon">
                              <FaLock />
                            </InputGroup.Text>
                            <Form.Control
                              type="password"
                              name="senha"
                              value={formData.senha}
                              onChange={handleChange}
                              placeholder="Digite sua senha"
                              required
                              className="cadastro-input"
                            />
                          </InputGroup>
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>CPF</Form.Label>
                          <InputGroup className="cadastro-input-group">
                            <InputGroup.Text className="cadastro-input-icon">
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
                              className="cadastro-input"
                            />
                          </InputGroup>
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Telefone</Form.Label>
                          <InputGroup className="cadastro-input-group">
                            <InputGroup.Text className="cadastro-input-icon">
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
                              className="cadastro-input"
                            />
                          </InputGroup>
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Data de nascimento</Form.Label>
                          <InputGroup className="cadastro-input-group">
                            <InputGroup.Text className="cadastro-input-icon">
                              <FaCalendarAlt />
                            </InputGroup.Text>
                            <Form.Control
                              type="date"
                              name="data_nascimento"
                              value={formData.data_nascimento}
                              onChange={handleChange}
                              className="cadastro-input"
                            />
                          </InputGroup>
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group className="mb-4">
                          <Form.Label>Endereço</Form.Label>
                          <InputGroup className="cadastro-input-group">
                            <InputGroup.Text className="cadastro-input-icon">
                              <FaMapMarkerAlt />
                            </InputGroup.Text>
                            <Form.Control
                              type="text"
                              name="endereco"
                              value={formData.endereco}
                              onChange={handleChange}
                              placeholder="Digite seu endereço"
                              className="cadastro-input"
                            />
                          </InputGroup>
                        </Form.Group>
                      </Col>
                    </Row>

                    <div className="d-grid mb-3">
                      <Button
                        type="submit"
                        className="cadastro-paciente-btn"
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
                          'Cadastrar Paciente'
                        )}
                      </Button>
                    </div>

                    <div className="text-center">
                      <span className="text-muted">Já tem conta? </span>
                      <Link to="/login" className="cadastro-paciente-link">
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

export default CadastroPacientePage