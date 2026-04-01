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
  Spinner
} from 'react-bootstrap'
import { registerUsuario } from '../services/authService'

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
    <div className="min-vh-100 d-flex align-items-center bg-light">
      <Container>
        <Row className="justify-content-center">
          <Col md={8} lg={6}>
            <Card className="shadow border-0 rounded-4">
              <Card.Body className="p-4">
                <div className="text-center mb-4">
                  <h2 className="fw-bold">Cadastro de Secretário</h2>
                  <p className="text-muted mb-0">
                    Crie sua conta administrativa no Clinical Med
                  </p>
                </div>

                {erro && <Alert variant="danger">{erro}</Alert>}
                {sucesso && <Alert variant="success">{sucesso}</Alert>}

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Nome completo</Form.Label>
                    <Form.Control
                      type="text"
                      name="nome"
                      value={formData.nome}
                      onChange={handleChange}
                      placeholder="Digite seu nome"
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>E-mail</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Digite seu e-mail"
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>Senha</Form.Label>
                    <Form.Control
                      type="password"
                      name="senha"
                      value={formData.senha}
                      onChange={handleChange}
                      placeholder="Digite sua senha"
                      required
                    />
                  </Form.Group>

                  <div className="d-grid mb-3">
                    <Button
                      type="submit"
                      variant="dark"
                      size="lg"
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
                    <Link to="/login" className="text-decoration-none fw-semibold">
                      Entrar
                    </Link>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

export default CadastroSecretarioPage