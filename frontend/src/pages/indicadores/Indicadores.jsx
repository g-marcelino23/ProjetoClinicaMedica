import { useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Row,
  Spinner,
  ProgressBar
} from 'react-bootstrap'
import MainLayout from '../../components/layout/MainLayout'
import { obterIndicadores } from '../../services/indicadorService'

function Indicadores() {
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [indicadores, setIndicadores] = useState(null)

  const [filtros, setFiltros] = useState({
    data_inicial: '',
    data_final: ''
  })

  useEffect(() => {
    carregarIndicadores()
  }, [])

  const carregarIndicadores = async (filtrosConsulta = {}) => {
    try {
      setLoading(true)
      setErro('')

      const dados = await obterIndicadores(filtrosConsulta)
      setIndicadores(dados)
    } catch (error) {
      console.error('Erro ao carregar indicadores:', error)
      setErro(error.response?.data?.erro || 'Erro ao carregar indicadores.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target

    setFiltros((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const aplicarFiltros = (e) => {
    e.preventDefault()

    const filtrosLimpos = {}

    if (filtros.data_inicial) {
      filtrosLimpos.data_inicial = filtros.data_inicial
    }

    if (filtros.data_final) {
      filtrosLimpos.data_final = filtros.data_final
    }

    carregarIndicadores(filtrosLimpos)
  }

  const limparFiltros = () => {
    setFiltros({
      data_inicial: '',
      data_final: ''
    })

    carregarIndicadores()
  }

  const converterPercentual = (valor) => {
    if (!valor) return 0
    return Number(String(valor).replace('%', '')) || 0
  }

  return (
    <MainLayout>
      <div className="dashboard-header mb-4">
        <h1 className="page-title">Indicadores</h1>
        <p className="page-subtitle mb-0">
          Acompanhe métricas operacionais da clínica.
        </p>
      </div>

      {erro && <Alert variant="danger">{erro}</Alert>}

      <Card className="content-card border-0 shadow-sm rounded-4 p-4 mb-4">
        <Form onSubmit={aplicarFiltros}>
          <Row className="g-3 align-items-end">
            <Col md={4}>
              <Form.Group>
                <Form.Label>Data inicial</Form.Label>
                <Form.Control
                  type="date"
                  name="data_inicial"
                  value={filtros.data_inicial}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group>
                <Form.Label>Data final</Form.Label>
                <Form.Control
                  type="date"
                  name="data_final"
                  value={filtros.data_final}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>

            <Col md={4} className="d-flex gap-2">
              <Button type="submit" variant="primary">
                Filtrar
              </Button>

              <Button type="button" variant="outline-secondary" onClick={limparFiltros}>
                Limpar
              </Button>
            </Col>
          </Row>
        </Form>
      </Card>

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      ) : indicadores ? (
        <>
          <Row className="g-4">
            <Col md={6} lg={3}>
              <Card className="stat-card dashboard-stat-card stat-blue">
                <Card.Body>
                  <h6>Total de consultas</h6>
                  <h2 className="fw-bold">{indicadores.total_consultas}</h2>
                  <p className="text-muted mb-0">Consultas no período</p>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} lg={3}>
              <Card className="stat-card dashboard-stat-card stat-green">
                <Card.Body>
                  <h6>Realizadas</h6>
                  <h2 className="fw-bold">{indicadores.atendimentos_realizados}</h2>
                  <p className="text-muted mb-0">Atendimentos concluídos</p>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} lg={3}>
              <Card className="stat-card dashboard-stat-card stat-yellow">
                <Card.Body>
                  <h6>Check-ins</h6>
                  <h2 className="fw-bold">{indicadores.checkins_realizados}</h2>
                  <p className="text-muted mb-0">Check-ins realizados</p>
                </Card.Body>
              </Card>
            </Col>

            <Col md={6} lg={3}>
              <Card className="stat-card dashboard-stat-card stat-red">
                <Card.Body>
                  <h6>Faltas</h6>
                  <h2 className="fw-bold">{indicadores.faltas}</h2>
                  <p className="text-muted mb-0">Pacientes ausentes</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="content-card border-0 shadow-sm rounded-4 p-4 mt-4">
            <h4 className="fw-bold mb-4">Taxas operacionais</h4>

            <div className="mb-4">
              <div className="d-flex justify-content-between mb-2">
                <span className="fw-semibold">Taxa de comparecimento</span>
                <span>{indicadores.taxa_comparecimento}</span>
              </div>
              <ProgressBar now={converterPercentual(indicadores.taxa_comparecimento)} />
            </div>

            <div className="mb-4">
              <div className="d-flex justify-content-between mb-2">
                <span className="fw-semibold">Taxa de faltas</span>
                <span>{indicadores.taxa_faltas}</span>
              </div>
              <ProgressBar now={converterPercentual(indicadores.taxa_faltas)} />
            </div>

            <div>
              <div className="d-flex justify-content-between mb-2">
                <span className="fw-semibold">Taxa de cancelamentos</span>
                <span>{indicadores.taxa_cancelamentos}</span>
              </div>
              <ProgressBar now={converterPercentual(indicadores.taxa_cancelamentos)} />
            </div>
          </Card>
        </>
      ) : (
        <Alert variant="info">Nenhum indicador encontrado.</Alert>
      )}
    </MainLayout>
  )
}

export default Indicadores