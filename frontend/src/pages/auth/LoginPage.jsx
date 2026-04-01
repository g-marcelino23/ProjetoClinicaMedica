import { useState } from 'react'
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')
    setSubmitting(true)

    const result = await login(email, senha)

    if (result.success) {
      navigate('/dashboard')
    } else {
      setErro(result.message)
    }

    setSubmitting(false)
  }

  return (
    <Container className="d-flex justify-content-center align-items-center vh-100">
      <Row className="w-100 justify-content-center">
        <Col md={6} lg={4}>
          <Card className="shadow border-0 rounded-4">
            <Card.Body className="p-4">
              <h2 className="text-center mb-2 fw-bold">Clinical Med</h2>
              <p className="text-center text-muted mb-4">
                Entre na sua conta para acessar o sistema
              </p>

              {erro && <Alert variant="danger">{erro}</Alert>}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>E-mail</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Digite seu e-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Senha</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Digite sua senha"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                  />
                </Form.Group>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-100"
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

                <div className="text-center mt-4">
  <small className="text-muted d-block mb-2">
    Não tem conta?
  </small>

  <div className="d-flex justify-content-center gap-2 flex-wrap">
    <Button
      variant="outline-primary"
      size="sm"
      onClick={() => navigate('/cadastro/paciente')}
    >
      Sou Paciente
    </Button>

    <Button
      variant="outline-success"
      size="sm"
      onClick={() => navigate('/cadastro/medico')}
    >
      Sou Médico
    </Button>

    <Button
      variant="outline-dark"
      size="sm"
      onClick={() => navigate('/cadastro/secretario')}
    >
      Sou Secretário
    </Button>
  </div>
</div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default LoginPage