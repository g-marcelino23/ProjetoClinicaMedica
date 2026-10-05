import { useState } from 'react'
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap'
import { FaKey, FaLock } from 'react-icons/fa'
import { useNavigate } from 'react-router'
import MainLayout from '../../components/layout/MainLayout'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

function ChangePasswordPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErro('')
    if (novaSenha !== confirmacao) {
      setErro('A confirmação não corresponde à nova senha.')
      return
    }

    setSubmitting(true)
    try {
      await api.post('/auth/change-password', {
        senha_atual: senhaAtual,
        nova_senha: novaSenha,
      })
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      setErro(
        error.response?.data?.erro ||
          'Não foi possível alterar a senha.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <MainLayout>
      <Card className="shadow-sm border-0 mx-auto" style={{ maxWidth: 620 }}>
        <Card.Body className="p-4">
          <div className="d-flex align-items-center gap-3 mb-3">
            <FaKey size={24} />
            <div>
              <h1 className="h4 mb-1">Alterar senha</h1>
              <p className="text-muted mb-0">
                A alteração encerra todas as sessões, inclusive esta.
              </p>
            </div>
          </div>

          {erro && <Alert variant="danger">{erro}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Senha atual</Form.Label>
              <div className="auth-input-wrap">
                <FaLock />
                <Form.Control
                  type="password"
                  value={senhaAtual}
                  onChange={(event) => setSenhaAtual(event.target.value)}
                  autoComplete="current-password"
                  maxLength={72}
                  required
                />
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Nova senha</Form.Label>
              <div className="auth-input-wrap">
                <FaLock />
                <Form.Control
                  type="password"
                  value={novaSenha}
                  onChange={(event) => setNovaSenha(event.target.value)}
                  autoComplete="new-password"
                  minLength={15}
                  maxLength={72}
                  required
                />
              </div>
              <Form.Text>
                Use pelo menos 15 caracteres e evite nomes ou senhas comuns.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>Confirmar nova senha</Form.Label>
              <div className="auth-input-wrap">
                <FaLock />
                <Form.Control
                  type="password"
                  value={confirmacao}
                  onChange={(event) => setConfirmacao(event.target.value)}
                  autoComplete="new-password"
                  minLength={15}
                  maxLength={72}
                  required
                />
              </div>
            </Form.Group>

            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <><Spinner animation="border" size="sm" /> Alterando</>
              ) : (
                'Alterar senha e sair'
              )}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </MainLayout>
  )
}

export default ChangePasswordPage
