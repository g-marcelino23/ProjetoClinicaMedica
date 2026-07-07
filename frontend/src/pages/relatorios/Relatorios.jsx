import { useEffect, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  Row,
  Spinner,
  Table
} from 'react-bootstrap'
import MainLayout from '../../components/layout/MainLayout'
import {
  obterRelatorioConsultas,
  obterRelatorioExames,
  obterRelatorioAtendimentosPorMedico
} from '../../services/relatorioService'

function Relatorios() {
  const [tipoRelatorio, setTipoRelatorio] = useState('consultas')
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [dados, setDados] = useState([])

  const [filtros, setFiltros] = useState({
    data_inicial: '',
    data_final: '',
    status: ''
  })

  useEffect(() => {
    carregarRelatorio('consultas')
  }, [])

  const limparObjetoFiltros = () => {
    const filtrosLimpos = {}

    if (filtros.data_inicial) {
      filtrosLimpos.data_inicial = filtros.data_inicial
    }

    if (filtros.data_final) {
      filtrosLimpos.data_final = filtros.data_final
    }

    if (filtros.status && tipoRelatorio !== 'atendimentos-medico') {
      filtrosLimpos.status = filtros.status
    }

    return filtrosLimpos
  }

  const carregarRelatorio = async (tipo = tipoRelatorio, filtrosConsulta = {}) => {
    try {
      setLoading(true)
      setErro('')

      let resultado = []

      if (tipo === 'consultas') {
        resultado = await obterRelatorioConsultas(filtrosConsulta)
      }

      if (tipo === 'exames') {
        resultado = await obterRelatorioExames(filtrosConsulta)
      }

      if (tipo === 'atendimentos-medico') {
        resultado = await obterRelatorioAtendimentosPorMedico(filtrosConsulta)
      }

      setDados(Array.isArray(resultado) ? resultado : [])
    } catch (error) {
      console.error('Erro ao carregar relatório:', error)
      setErro(error.response?.data?.erro || 'Erro ao carregar relatório.')
    } finally {
      setLoading(false)
    }
  }

  const handleChangeFiltro = (e) => {
    const { name, value } = e.target

    setFiltros((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleChangeTipo = (e) => {
    const novoTipo = e.target.value

    setTipoRelatorio(novoTipo)
    setDados([])
    setErro('')

    const novosFiltros = {
      data_inicial: '',
      data_final: '',
      status: ''
    }

    setFiltros(novosFiltros)
    carregarRelatorio(novoTipo, {})
  }

  const aplicarFiltros = (e) => {
    e.preventDefault()
    carregarRelatorio(tipoRelatorio, limparObjetoFiltros())
  }

  const limparFiltros = () => {
    const filtrosVazios = {
      data_inicial: '',
      data_final: '',
      status: ''
    }

    setFiltros(filtrosVazios)
    carregarRelatorio(tipoRelatorio, {})
  }

  const formatarData = (data) => {
    if (!data) return '-'
    return new Date(data).toLocaleDateString('pt-BR')
  }

  const formatarHora = (hora) => {
    if (!hora) return '-'
    return String(hora).slice(0, 5)
  }

  const renderBadgeStatus = (status) => {
    switch (status) {
      case 'AGENDADA':
      case 'SOLICITADO':
        return <Badge bg="primary">{status}</Badge>

      case 'CONFIRMADA':
      case 'AGENDADO':
        return <Badge bg="info">{status}</Badge>

      case 'REALIZADA':
      case 'REALIZADO':
      case 'ENTREGUE':
        return <Badge bg="success">{status}</Badge>

      case 'CANCELADA':
      case 'CANCELADO':
        return <Badge bg="danger">{status}</Badge>

      case 'FALTOU':
        return (
          <Badge bg="warning" text="dark">
            {status}
          </Badge>
        )

      default:
        return <Badge bg="secondary">{status || 'SEM STATUS'}</Badge>
    }
  }

  const renderTabelaConsultas = () => (
    <Table responsive hover className="align-middle mb-0">
      <thead>
        <tr>
          <th>ID</th>
          <th>Paciente</th>
          <th>Médico</th>
          <th>Especialidade</th>
          <th>Data</th>
          <th>Hora</th>
          <th>Status</th>
          <th>Motivo</th>
        </tr>
      </thead>

      <tbody>
        {dados.map((item) => (
          <tr key={item.id}>
            <td>#{item.id}</td>
            <td>{item.paciente_nome || '-'}</td>
            <td>{item.medico_nome || '-'}</td>
            <td>{item.especialidade || '-'}</td>
            <td>{formatarData(item.data_consulta)}</td>
            <td>{formatarHora(item.hora_consulta)}</td>
            <td>{renderBadgeStatus(item.status)}</td>
            <td>{item.motivo || '-'}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  )

  const renderTabelaExames = () => (
    <Table responsive hover className="align-middle mb-0">
      <thead>
        <tr>
          <th>ID</th>
          <th>Exame</th>
          <th>Paciente</th>
          <th>Médico</th>
          <th>Data</th>
          <th>Status</th>
          <th>Resultado</th>
        </tr>
      </thead>

      <tbody>
        {dados.map((item) => (
          <tr key={item.id}>
            <td>#{item.id}</td>
            <td>{item.nome_exame || '-'}</td>
            <td>{item.paciente_nome || '-'}</td>
            <td>{item.medico_nome || '-'}</td>
            <td>{formatarData(item.data_exame)}</td>
            <td>{renderBadgeStatus(item.status)}</td>
            <td>{item.resultado || '-'}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  )

  const renderTabelaAtendimentosMedico = () => (
    <Table responsive hover className="align-middle mb-0">
      <thead>
        <tr>
          <th>Médico</th>
          <th>Especialidade</th>
          <th>Total de atendimentos</th>
        </tr>
      </thead>

      <tbody>
        {dados.map((item) => (
          <tr key={item.medico_id}>
            <td>{item.medico_nome || '-'}</td>
            <td>{item.especialidade || '-'}</td>
            <td>
              <Badge bg="primary" className="px-3 py-2">
                {item.total_atendimentos}
              </Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  )

  const renderTabela = () => {
    if (dados.length === 0) {
      return (
        <Alert variant="info" className="mb-0">
          Nenhum registro encontrado para os filtros selecionados.
        </Alert>
      )
    }

    if (tipoRelatorio === 'consultas') {
      return renderTabelaConsultas()
    }

    if (tipoRelatorio === 'exames') {
      return renderTabelaExames()
    }

    return renderTabelaAtendimentosMedico()
  }

  const tituloRelatorio = {
    consultas: 'Relatório de Consultas',
    exames: 'Relatório de Exames',
    'atendimentos-medico': 'Atendimentos por Médico'
  }

  return (
    <MainLayout>
      <div className="dashboard-header mb-4">
        <h1 className="page-title">Relatórios</h1>
        <p className="page-subtitle mb-0">
          Consulte relatórios operacionais da clínica.
        </p>
      </div>

      {erro && <Alert variant="danger">{erro}</Alert>}

      <Card className="content-card border-0 shadow-sm rounded-4 p-4 mb-4">
        <Form onSubmit={aplicarFiltros}>
          <Row className="g-3 align-items-end">
            <Col md={3}>
              <Form.Group>
                <Form.Label>Tipo de relatório</Form.Label>
                <Form.Select value={tipoRelatorio} onChange={handleChangeTipo}>
                  <option value="consultas">Consultas</option>
                  <option value="exames">Exames</option>
                  <option value="atendimentos-medico">
                    Atendimentos por Médico
                  </option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={3}>
              <Form.Group>
                <Form.Label>Data inicial</Form.Label>
                <Form.Control
                  type="date"
                  name="data_inicial"
                  value={filtros.data_inicial}
                  onChange={handleChangeFiltro}
                />
              </Form.Group>
            </Col>

            <Col md={3}>
              <Form.Group>
                <Form.Label>Data final</Form.Label>
                <Form.Control
                  type="date"
                  name="data_final"
                  value={filtros.data_final}
                  onChange={handleChangeFiltro}
                />
              </Form.Group>
            </Col>

            {tipoRelatorio !== 'atendimentos-medico' && (
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Status</Form.Label>

                  {tipoRelatorio === 'consultas' ? (
                    <Form.Select
                      name="status"
                      value={filtros.status}
                      onChange={handleChangeFiltro}
                    >
                      <option value="">Todos</option>
                      <option value="AGENDADA">AGENDADA</option>
                      <option value="CONFIRMADA">CONFIRMADA</option>
                      <option value="REALIZADA">REALIZADA</option>
                      <option value="CANCELADA">CANCELADA</option>
                      <option value="FALTOU">FALTOU</option>
                    </Form.Select>
                  ) : (
                    <Form.Select
                      name="status"
                      value={filtros.status}
                      onChange={handleChangeFiltro}
                    >
                      <option value="">Todos</option>
                      <option value="SOLICITADO">SOLICITADO</option>
                      <option value="AGENDADO">AGENDADO</option>
                      <option value="REALIZADO">REALIZADO</option>
                      <option value="ENTREGUE">ENTREGUE</option>
                      <option value="CANCELADO">CANCELADO</option>
                    </Form.Select>
                  )}
                </Form.Group>
              </Col>
            )}

            <Col md={12} className="d-flex gap-2">
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

      <Card className="content-card border-0 shadow-sm rounded-4 p-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-4">
          <div>
            <h4 className="fw-bold mb-1">{tituloRelatorio[tipoRelatorio]}</h4>
            <p className="text-muted mb-0">
              Total de registros encontrados: {dados.length}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="d-flex justify-content-center py-5">
            <Spinner animation="border" />
          </div>
        ) : (
          renderTabela()
        )}
      </Card>
    </MainLayout>
  )
}

export default Relatorios