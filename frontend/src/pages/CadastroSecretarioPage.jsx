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
  FaUserTie,
  FaUser,
  FaEnvelope,
  FaLock,
  FaClipboardList
} from 'react-icons/fa'
import { registerUsuario } from '../services/authService'
import './CadastroSecretarioPage.css'

function CadastroSecretarioPage() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: ''
  })

  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')
    setSucesso('')

    try {
      setLoading(true)

      const payload = {
        ...formData,
        perfil: 'SECRETARIO'
      }

      const response = await registerUsuario(payload)

      setSucesso(response.mensagem || 'Cadastro realizado com sucesso!')

      setTimeout(() => {
        navigate('/login')
      }, 1500)
    } catch (error) {
      setErro(error.response?.data?.erro || 'Erro ao cadastrar secretário')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="cadastro-secretario-page">
      <Container fluid className="cadastro-secretario-container">
        <Row className="min-vh-100">
          <Col md={5} className="cadastro-secretario-banner d-none d-md-flex">
            <div className="cadastro-secretario-overlay"></div>

            <div className="cadastro-secretario-banner-content">
              <span className="cadastro-secretario-badge">
                <FaUserTie className="me-2" />
                Área Administrativa
              </span>

              <h1>Organização e eficiência na gestão clínica</h1>

              <p>
                Cadastre-se para acessar a área administrativa do Clinical Med
                e gerenciar atendimentos, cadastros e fluxos da clínica com mais controle.
              </p>

              <div className="cadastro-secretario-info-box">
                <strong>Clinical Med</strong>
                <span>
                  Um ambiente pensado para dar mais agilidade à rotina administrativa.
                </span>
              </div>
            </div>
          </Col>

          <Col md={7} xs={12} className="cadastro-secretario-form-wrapper">
            <div className="cadastro-secretario-form-box">
              <Card className="cadastro-secretario-card shadow-lg border-0">
                <Card.Body className="p-4 p-lg-5">
                  <div className="text-center mb-4">
                    <h2 className="cadastro-secretario-title fw-bold">
                      Cadastro de Secretário
                    </h2>
                    <p className="text-muted mb-0">
                      Preencha os dados para criar sua conta administrativa
                    </p>
                  </div>

                  {erro && <Alert variant="danger">{erro}</Alert>}
                  {sucesso && <Alert variant="success">{sucesso}</Alert>}

                  <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nome completo</Form.Label>
                      <InputGroup className="cadastro-secretario-input-group">
                        <InputGroup.Text className="cadastro-secretario-input-icon">
                          <FaUser />
                        </InputGroup.Text>
                        <Form.Control
                          type="text"
                          name="nome"
                          value={formData.nome}
                          onChange={handleChange}
                          placeholder="Digite seu nome completo"
                          required
                          className="cadastro-secretario-input"
                        />
                      </InputGroup>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>E-mail</Form.Label>
                      <InputGroup className="cadastro-secretario-input-group">
                        <InputGroup.Text className="cadastro-secretario-input-icon">
                          <FaEnvelope />
                        </InputGroup.Text>
                        <Form.Control
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="Digite seu e-mail"
                          required
                          className="cadastro-secretario-input"
                        />
                      </InputGroup>
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label>Senha</Form.Label>
                      <InputGroup className="cadastro-secretario-input-group">
                        <InputGroup.Text className="cadastro-secretario-input-icon">
                          <FaLock />
                        </InputGroup.Text>
                        <Form.Control
                          type="password"
                          name="senha"
                          value={formData.senha}
                          onChange={handleChange}
                          placeholder="Digite sua senha"
                          required
                          className="cadastro-secretario-input"
                        />
                      </InputGroup>
                    </Form.Group>

                    <div className="cadastro-secretario-highlight">
                      <FaClipboardList className="me-2" />
                      <span>
                        Perfil com foco em organização, cadastros e controle operacional.
                      </span>
                    </div>

                    <div className="d-grid mb-3 mt-4">
                      <Button
                        type="submit"
                        className="cadastro-secretario-btn"
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
                          'Cadastrar Secretário'
                        )}
                      </Button>
                    </div>

                    <div className="text-center">
                      <span className="text-muted">Já tem conta? </span>
                      <Link to="/login" className="cadastro-secretario-link">
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

export default CadastroSecretarioPage