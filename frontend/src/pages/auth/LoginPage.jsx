import { useState } from 'react'
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
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa'
import './LoginPage.css'

function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')
    setSubmitting(true)

    try {
      const result = await login(email, senha)

      if (result.success) {
        navigate('/dashboard')
      } else {
        setErro(result.message || 'Erro ao fazer login.')
      }
    } catch (error) {
      setErro('Erro ao fazer login.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <Container fluid className="login-container">
        <Row>
          <Col md={7} className="login-banner d-none d-md-flex">
            <div className="login-banner-overlay"></div>

            <div className="login-banner-content">
              <span className="login-badge">Clinical Med</span>

              <h1>Sistema inteligente de gestão clínica</h1>

              <p>
                Gerencie pacientes, consultas, exames e prontuários com
                segurança, organização e eficiência em uma plataforma moderna.
              </p>
            </div>
          </Col>

          <Col md={5} xs={12} className="login-form-wrapper">
            <div className="login-form-box">
              <Card className="login-card shadow-lg">
                <Card.Body>
                  <div className="text-center mb-4">
                    <h2 className="fw-bold login-title">Entrar</h2>
                    <p className="text-muted mb-0">
                      Acesse sua conta no Clinical Med
                    </p>
                  </div>

                  {erro && (
                    <Alert variant="danger" className="mb-3">
                      {erro}
                    </Alert>
                  )}

                  <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label>E-mail</Form.Label>
                      <InputGroup className="custom-input-group">
                        <InputGroup.Text className="input-icon">
                          <FaEnvelope />
                        </InputGroup.Text>

                        <Form.Control
                          type="email"
                          placeholder="Digite seu e-mail"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="login-input"
                          autoFocus
                        />
                      </InputGroup>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Senha</Form.Label>
                      <InputGroup className="custom-input-group">
                        <InputGroup.Text className="input-icon">
                          <FaLock />
                        </InputGroup.Text>

                        <Form.Control
                          type={mostrarSenha ? 'text' : 'password'}
                          placeholder="Digite sua senha"
                          value={senha}
                          onChange={(e) => setSenha(e.target.value)}
                          required
                          className="login-input"
                        />

                        <Button
                          variant="light"
                          onClick={() => setMostrarSenha((prev) => !prev)}
                          type="button"
                          className="password-toggle-btn"
                          aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                        >
                          {mostrarSenha ? <FaEyeSlash /> : <FaEye />}
                        </Button>
                      </InputGroup>
                    </Form.Group>

                    <Button
                      type="submit"
                      className="login-btn"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Entrando...
                        </>
                      ) : (
                        'Entrar'
                      )}
                    </Button>
                  </Form>

                  <div className="register-section">
                    <small className="text-muted d-block text-center mb-3">
                      Não tem conta? Escolha seu perfil
                    </small>

                    <div className="profile-cards">
                      <button
                        type="button"
                        className="profile-card paciente"
                        onClick={() => navigate('/cadastro/paciente')}
                      >
                        <div className="profile-icon">👤</div>
                        <div className="text-start">
                          <h6>Paciente</h6>
                          <p>Acesse e acompanhe suas consultas</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="profile-card medico"
                        onClick={() => navigate('/cadastro/medico')}
                      >
                        <div className="profile-icon">🩺</div>
                        <div className="text-start">
                          <h6>Médico</h6>
                          <p>Gerencie atendimentos e exames</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="profile-card secretario"
                        onClick={() => navigate('/cadastro/secretario')}
                      >
                        <div className="profile-icon">🧾</div>
                        <div className="text-start">
                          <h6>Secretário</h6>
                          <p>Controle cadastros e agendamentos</p>
                        </div>
                      </button>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

export default LoginPage