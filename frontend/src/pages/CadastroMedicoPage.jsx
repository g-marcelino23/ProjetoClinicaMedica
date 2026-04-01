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

    if (name === 'cpf') {
      novoValor = formatarCPF(value)
    }

    if (name === 'telefone') {
      novoValor = formatarTelefone(value)
    }

    if (name === 'crm') {
      novoValor = formatarCRM(value)
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
    <div className="min-vh-100 d-flex align-items-center bg-light">
      <Container>
        <Row className="justify-content-center">
          <Col md={8} lg={6}>
            <Card className="shadow border-0 rounded-4">
              <Card.Body className="p-4">
                <div className="text-center mb-4">
                  <h2 className="fw-bold">Cadastro de Médico</h2>
                  <p className="text-muted mb-0">
                    Crie sua conta profissional no Clinical Med
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

                  <Form.Group className="mb-3">
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

                  <Form.Group className="mb-3">
                    <Form.Label>CPF</Form.Label>
                    <Form.Control
                      type="text"
                      name="cpf"
                      value={formData.cpf}
                      onChange={handleChange}
                      placeholder="000.000.000-00"
                      inputMode="numeric"
                      maxLength={14}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Telefone</Form.Label>
                    <Form.Control
                      type="text"
                      name="telefone"
                      value={formData.telefone}
                      onChange={handleChange}
                      placeholder="(85) 99999-9999"
                      inputMode="numeric"
                      maxLength={15}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>CRM</Form.Label>
                    <Form.Control
                      type="text"
                      name="crm"
                      value={formData.crm}
                      onChange={handleChange}
                      placeholder="12345-CE"
                      maxLength={13}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>Especialidade</Form.Label>
                    <Form.Control
                      type="text"
                      name="especialidade"
                      value={formData.especialidade}
                      onChange={handleChange}
                      placeholder="Ex: Cardiologia"
                      required
                    />
                  </Form.Group>

                  <div className="d-grid mb-3">
                    <Button
                      type="submit"
                      variant="success"
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
                        'Cadastrar Médico'
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

export default CadastroMedicoPage