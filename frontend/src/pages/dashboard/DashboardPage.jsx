import { useEffect, useMemo, useState } from 'react'
import {
  Card,
  Col,
  Row,
  Badge,
  Spinner,
  Alert,
  ListGroup,
  ProgressBar
} from 'react-bootstrap'
import MainLayout from '../../components/layout/MainLayout'
import { useAuth } from '../../context/AuthContext'
import {
  FaUserInjured,
  FaCalendarCheck,
  FaFlask,
  FaBell,
  FaNotesMedical,
  FaUserMd,
  FaClock,
  FaArrowUp,
  FaArrowDown,
  FaCheckCircle,
  FaExclamationTriangle
} from 'react-icons/fa'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend
} from 'recharts'
import { listarConsultas } from '../../services/consultaService'
import { listarExames } from '../../services/exameService'
import { listarProntuarios } from '../../services/prontuariosService'
import { listarAgendas } from '../../services/agendaService'
import { listarPacientes } from '../../services/pacientesService'
import { listarMedicos } from '../../services/medicosService'

function DashboardPage() {
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  const [consultas, setConsultas] = useState([])
  const [exames, setExames] = useState([])
  const [prontuarios, setProntuarios] = useState([])
  const [agendas, setAgendas] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [medicos, setMedicos] = useState([])

  const perfil = user?.perfil || 'SECRETARIO'

  useEffect(() => {
    carregarDashboard()
  }, [])

  const carregarDashboard = async () => {
    try {
      setLoading(true)
      setErro('')

      if (perfil === 'SECRETARIO') {
        const [
          dadosConsultas,
          dadosExames,
          dadosProntuarios,
          dadosAgendas,
          dadosPacientes,
          dadosMedicos
        ] = await Promise.all([
          listarConsultas(),
          listarExames(),
          listarProntuarios(),
          listarAgendas(),
          listarPacientes(),
          listarMedicos()
        ])

        setConsultas(Array.isArray(dadosConsultas) ? dadosConsultas : [])
        setExames(Array.isArray(dadosExames) ? dadosExames : [])
        setProntuarios(Array.isArray(dadosProntuarios) ? dadosProntuarios : [])
        setAgendas(Array.isArray(dadosAgendas) ? dadosAgendas : [])
        setPacientes(Array.isArray(dadosPacientes) ? dadosPacientes : [])
        setMedicos(Array.isArray(dadosMedicos) ? dadosMedicos : [])
      } else if (perfil === 'MEDICO') {
        const [dadosConsultas, dadosExames, dadosProntuarios, dadosAgendas] =
          await Promise.all([
            listarConsultas(),
            listarExames(),
            listarProntuarios(),
            listarAgendas()
          ])

        setConsultas(Array.isArray(dadosConsultas) ? dadosConsultas : [])
        setExames(Array.isArray(dadosExames) ? dadosExames : [])
        setProntuarios(Array.isArray(dadosProntuarios) ? dadosProntuarios : [])
        setAgendas(Array.isArray(dadosAgendas) ? dadosAgendas : [])
      } else if (perfil === 'PACIENTE') {
        const [dadosConsultas, dadosExames, dadosProntuarios] = await Promise.all([
          listarConsultas(),
          listarExames(),
          listarProntuarios()
        ])

        setConsultas(Array.isArray(dadosConsultas) ? dadosConsultas : [])
        setExames(Array.isArray(dadosExames) ? dadosExames : [])
        setProntuarios(Array.isArray(dadosProntuarios) ? dadosProntuarios : [])
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
      setErro(error.response?.data?.erro || 'Erro ao carregar dashboard.')
    } finally {
      setLoading(false)
    }
  }

  const hoje = new Date()
  const hojeStr = hoje.toISOString().split('T')[0]

  const consultasHoje = useMemo(() => {
    return consultas.filter((consulta) => {
      const data =
        consulta.data_consulta?.slice(0, 10) ||
        consulta.data?.slice(0, 10) ||
        ''
      return data === hojeStr
    })
  }, [consultas, hojeStr])

  const examesPendentes = useMemo(() => {
    return exames.filter(
      (exame) => exame.status === 'SOLICITADO' || exame.status === 'AGENDADO'
    )
  }, [exames])

  const agendasDisponiveis = useMemo(() => {
    return agendas.filter((agenda) => agenda.disponivel === true)
  }, [agendas])

  const ultimasConsultas = useMemo(() => {
    return [...consultas].slice(0, 5)
  }, [consultas])

  const ultimosExames = useMemo(() => {
    return [...exames].slice(0, 5)
  }, [exames])

  const ultimosProntuarios = useMemo(() => {
    return [...prontuarios].slice(0, 5)
  }, [prontuarios])

  const consultasPorStatus = useMemo(() => {
    const base = {
      AGENDADA: 0,
      CONFIRMADA: 0,
      REALIZADA: 0,
      CANCELADA: 0,
      FALTOU: 0
    }

    consultas.forEach((consulta) => {
      const status = consulta.status || 'AGENDADA'
      if (base[status] !== undefined) base[status] += 1
    })

    return [
      { nome: 'Agendada', valor: base.AGENDADA },
      { nome: 'Confirmada', valor: base.CONFIRMADA },
      { nome: 'Realizada', valor: base.REALIZADA },
      { nome: 'Cancelada', valor: base.CANCELADA },
      { nome: 'Faltou', valor: base.FALTOU }
    ]
  }, [consultas])

  const examesPorStatus = useMemo(() => {
    const base = {
      SOLICITADO: 0,
      AGENDADO: 0,
      REALIZADO: 0,
      ENTREGUE: 0,
      CANCELADO: 0
    }

    exames.forEach((exame) => {
      const status = exame.status || 'SOLICITADO'
      if (base[status] !== undefined) base[status] += 1
    })

    return [
      { nome: 'Solicitado', valor: base.SOLICITADO },
      { nome: 'Agendado', valor: base.AGENDADO },
      { nome: 'Realizado', valor: base.REALIZADO },
      { nome: 'Entregue', valor: base.ENTREGUE },
      { nome: 'Cancelado', valor: base.CANCELADO }
    ]
  }, [exames])

  const consultasUltimos7Dias = useMemo(() => {
    const dias = []
    const nomesDias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

    for (let i = 6; i >= 0; i--) {
      const data = new Date()
      data.setDate(hoje.getDate() - i)

      const chave = data.toISOString().split('T')[0]
      const label = nomesDias[data.getDay()]

      const total = consultas.filter((consulta) => {
        const dataConsulta =
          consulta.data_consulta?.slice(0, 10) ||
          consulta.data?.slice(0, 10) ||
          ''
        return dataConsulta === chave
      }).length

      dias.push({
        dia: label,
        consultas: total
      })
    }

    return dias
  }, [consultas])

  const notificacoes = useMemo(() => {
    const lista = []

    if (consultasHoje.length > 0) {
      lista.push({
        tipo: 'info',
        texto: `${consultasHoje.length} consulta(s) marcada(s) para hoje`
      })
    }

    if (examesPendentes.length > 0) {
      lista.push({
        tipo: 'warning',
        texto: `${examesPendentes.length} exame(s) pendente(s)`
      })
    }

    const canceladas = consultas.filter((consulta) => consulta.status === 'CANCELADA').length
    if (canceladas > 0) {
      lista.push({
        tipo: 'danger',
        texto: `${canceladas} consulta(s) cancelada(s)`
      })
    }

    const realizados = consultas.filter((consulta) => consulta.status === 'REALIZADA').length
    if (realizados > 0) {
      lista.push({
        tipo: 'success',
        texto: `${realizados} consulta(s) realizada(s)`
      })
    }

    return lista.slice(0, 4)
  }, [consultas, consultasHoje.length, examesPendentes.length])

  const percentualConsultasRealizadas = useMemo(() => {
    if (consultas.length === 0) return 0
    const realizadas = consultas.filter((consulta) => consulta.status === 'REALIZADA').length
    return Math.round((realizadas / consultas.length) * 100)
  }, [consultas])

  const percentualExamesEntregues = useMemo(() => {
    if (exames.length === 0) return 0
    const entregues = exames.filter((exame) => exame.status === 'ENTREGUE').length
    return Math.round((entregues / exames.length) * 100)
  }, [exames])

  const coresPie = ['#0d6efd', '#20c997', '#ffc107', '#dc3545', '#6c757d']

  const renderMetricCard = ({
    icon,
    titulo,
    valor,
    descricao,
    variantClass,
    trendText,
    trendPositive = true
  }) => (
    <Col md={6} lg={3}>
      <Card className={`stat-card dashboard-stat-card ${variantClass}`}>
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start">
            <div className="stat-icon">{icon}</div>
            {trendText && (
              <small className={trendPositive ? 'text-success fw-semibold' : 'text-danger fw-semibold'}>
                {trendPositive ? <FaArrowUp className="me-1" /> : <FaArrowDown className="me-1" />}
                {trendText}
              </small>
            )}
          </div>
          <h6 className="mt-3">{titulo}</h6>
          <h2 className="fw-bold">{valor}</h2>
          <p className="text-muted mb-0">{descricao}</p>
        </Card.Body>
      </Card>
    </Col>
  )

  const renderCardsSecretario = () => (
    <Row className="g-4">
      {renderMetricCard({
        icon: <FaUserInjured />,
        titulo: 'Pacientes',
        valor: pacientes.length,
        descricao: 'Pacientes cadastrados',
        variantClass: 'stat-blue',
        trendText: 'Base ativa'
      })}
      {renderMetricCard({
        icon: <FaCalendarCheck />,
        titulo: 'Consultas',
        valor: consultasHoje.length,
        descricao: 'Consultas hoje',
        variantClass: 'stat-green',
        trendText: 'Hoje'
      })}
      {renderMetricCard({
        icon: <FaFlask />,
        titulo: 'Exames',
        valor: examesPendentes.length,
        descricao: 'Exames pendentes',
        variantClass: 'stat-yellow',
        trendText: 'Atenção',
        trendPositive: false
      })}
      {renderMetricCard({
        icon: <FaUserMd />,
        titulo: 'Médicos',
        valor: medicos.length,
        descricao: 'Médicos cadastrados',
        variantClass: 'stat-red',
        trendText: 'Equipe'
      })}
    </Row>
  )

  const renderCardsMedico = () => (
    <Row className="g-4">
      {renderMetricCard({
        icon: <FaCalendarCheck />,
        titulo: 'Consultas',
        valor: consultasHoje.length,
        descricao: 'Consultas de hoje',
        variantClass: 'stat-green',
        trendText: 'Hoje'
      })}
      {renderMetricCard({
        icon: <FaFlask />,
        titulo: 'Exames',
        valor: exames.length,
        descricao: 'Exames vinculados',
        variantClass: 'stat-yellow',
        trendText: 'Em acompanhamento'
      })}
      {renderMetricCard({
        icon: <FaNotesMedical />,
        titulo: 'Prontuários',
        valor: prontuarios.length,
        descricao: 'Registros clínicos',
        variantClass: 'stat-blue',
        trendText: 'Atualizados'
      })}
      {renderMetricCard({
        icon: <FaClock />,
        titulo: 'Agenda',
        valor: agendasDisponiveis.length,
        descricao: 'Horários disponíveis',
        variantClass: 'stat-red',
        trendText: 'Disponível'
      })}
    </Row>
  )

  const renderCardsPaciente = () => (
    <Row className="g-4">
      <Col md={6} lg={4}>
        <Card className="stat-card dashboard-stat-card stat-green">
          <Card.Body>
            <div className="stat-icon">
              <FaCalendarCheck />
            </div>
            <h6 className="mt-3">Consultas</h6>
            <h2 className="fw-bold">{consultas.length}</h2>
            <p className="text-muted mb-0">Minhas consultas</p>
          </Card.Body>
        </Card>
      </Col>

      <Col md={6} lg={4}>
        <Card className="stat-card dashboard-stat-card stat-yellow">
          <Card.Body>
            <div className="stat-icon">
              <FaFlask />
            </div>
            <h6 className="mt-3">Exames</h6>
            <h2 className="fw-bold">{exames.length}</h2>
            <p className="text-muted mb-0">Meus exames</p>
          </Card.Body>
        </Card>
      </Col>

      <Col md={6} lg={4}>
        <Card className="stat-card dashboard-stat-card stat-blue">
          <Card.Body>
            <div className="stat-icon">
              <FaNotesMedical />
            </div>
            <h6 className="mt-3">Prontuários</h6>
            <h2 className="fw-bold">{prontuarios.length}</h2>
            <p className="text-muted mb-0">Meu histórico clínico</p>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  )

  const renderLista = (titulo, itens, tipo) => (
    <Card className="content-card p-4 h-100 border-0 shadow-sm rounded-4">
      <h4 className="fw-bold mb-3">{titulo}</h4>

      {itens.length === 0 ? (
        <p className="text-muted mb-0">Nenhum registro encontrado.</p>
      ) : (
        <ListGroup variant="flush">
          {itens.map((item, index) => (
            <ListGroup.Item key={item.id || index} className="px-0 py-3">
              {tipo === 'consulta' && (
                <>
                  <strong>Consulta #{item.id}</strong>
                  <div className="text-muted">
                    {item.paciente_nome || 'Paciente'} / {item.medico_nome || 'Médico'}
                  </div>
                  <small className="text-muted">
                    {item.data_consulta ? new Date(item.data_consulta).toLocaleDateString('pt-BR') : '-'}
                  </small>
                </>
              )}

              {tipo === 'exame' && (
                <>
                  <strong>{item.nome_exame}</strong>
                  <div className="text-muted">
                    {item.paciente_nome || 'Paciente'} / {item.medico_nome || 'Médico'}
                  </div>
                  <small className="text-muted">{item.status || 'Sem status'}</small>
                </>
              )}

              {tipo === 'prontuario' && (
                <>
                  <strong>Prontuário #{item.id}</strong>
                  <div className="text-muted">
                    {item.paciente_nome || 'Paciente'} / {item.medico_nome || 'Médico'}
                  </div>
                  <small className="text-muted">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : '-'}
                  </small>
                </>
              )}
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
    </Card>
  )

  const renderGraficoConsultas = () => (
    <Card className="content-card p-4 h-100 border-0 shadow-sm rounded-4">
      <h4 className="fw-bold mb-3">Consultas nos últimos 7 dias</h4>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={consultasUltimos7Dias}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="dia" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="consultas" name="Consultas" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )

  const renderGraficoExames = () => (
    <Card className="content-card p-4 h-100 border-0 shadow-sm rounded-4">
      <h4 className="fw-bold mb-3">Exames por status</h4>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={examesPorStatus}
              dataKey="valor"
              nameKey="nome"
              outerRadius={95}
              innerRadius={45}
              paddingAngle={4}
            >
              {examesPorStatus.map((entry, index) => (
                <Cell key={entry.nome} fill={coresPie[index % coresPie.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )

  const renderNotificacoes = () => (
    <Card className="content-card p-4 h-100 border-0 shadow-sm rounded-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="fw-bold mb-0">Notificações</h4>
        <FaBell className="text-warning" />
      </div>

      {notificacoes.length === 0 ? (
        <p className="text-muted mb-0">Nenhuma notificação importante no momento.</p>
      ) : (
        <div className="d-flex flex-column gap-3">
          {notificacoes.map((item, index) => (
            <div
              key={index}
              className="d-flex align-items-start gap-3 p-3 rounded-4"
              style={{ background: '#f8f9fa' }}
            >
              <div className="mt-1">
                {item.tipo === 'success' && <FaCheckCircle className="text-success" />}
                {item.tipo === 'warning' && <FaExclamationTriangle className="text-warning" />}
                {item.tipo === 'danger' && <FaExclamationTriangle className="text-danger" />}
                {item.tipo === 'info' && <FaBell className="text-primary" />}
              </div>
              <div>
                <p className="mb-0">{item.texto}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )

  const renderIndicadores = () => (
    <Card className="content-card p-4 border-0 shadow-sm rounded-4">
      <h4 className="fw-bold mb-4">Indicadores rápidos</h4>

      <div className="mb-4">
        <div className="d-flex justify-content-between mb-2">
          <span className="fw-semibold">Consultas realizadas</span>
          <span>{percentualConsultasRealizadas}%</span>
        </div>
        <ProgressBar now={percentualConsultasRealizadas} />
      </div>

      <div>
        <div className="d-flex justify-content-between mb-2">
          <span className="fw-semibold">Exames entregues</span>
          <span>{percentualExamesEntregues}%</span>
        </div>
        <ProgressBar now={percentualExamesEntregues} />
      </div>
    </Card>
  )

  return (
    <MainLayout>
      <div className="dashboard-header mb-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle mb-0">
            Bem-vindo de volta, {user?.nome || 'Gabriel'}.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          <Badge bg="primary" className="px-3 py-2 rounded-pill">
            {perfil}
          </Badge>
        </div>
      </div>

      {erro && <Alert variant="danger">{erro}</Alert>}

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <>
          {perfil === 'SECRETARIO' && renderCardsSecretario()}
          {perfil === 'MEDICO' && renderCardsMedico()}
          {perfil === 'PACIENTE' && renderCardsPaciente()}

          <Row className="g-4 mt-2">
            <Col lg={8}>{renderGraficoConsultas()}</Col>
            <Col lg={4}>{renderNotificacoes()}</Col>
          </Row>

          <Row className="g-4 mt-2">
            <Col lg={7}>
              {perfil === 'SECRETARIO' && renderLista('Últimas consultas', ultimasConsultas, 'consulta')}
              {perfil === 'MEDICO' && renderLista('Últimos prontuários', ultimosProntuarios, 'prontuario')}
              {perfil === 'PACIENTE' && renderLista('Meus exames recentes', ultimosExames, 'exame')}
            </Col>

            <Col lg={5}>
              {renderGraficoExames()}
            </Col>
          </Row>

          <Row className="g-4 mt-2">
            <Col lg={6}>
              {renderIndicadores()}
            </Col>

            <Col lg={6}>
              <Card className="content-card p-4 h-100 border-0 shadow-sm rounded-4">
                <h4 className="fw-bold mb-3">
                  {perfil === 'PACIENTE' ? 'Meu Perfil' : 'Perfil do Usuário'}
                </h4>
                <p className="mb-2">
                  <strong>Nome:</strong> {user?.nome || 'Gabriel'}
                </p>
                <p className="mb-2">
                  <strong>E-mail:</strong> {user?.email || 'gabriel@email.com'}
                </p>
                <p className="mb-2">
                  <strong>Perfil:</strong> {perfil}
                </p>
                {(perfil === 'MEDICO' || perfil === 'PACIENTE') && (
                  <p className="mb-0 text-muted">
                    Área personalizada com informações relevantes para seu acompanhamento diário.
                  </p>
                )}
              </Card>
            </Col>
          </Row>

          <Row className="g-4 mt-2">
            <Col md={12}>
              <Card className="content-card p-4 border-0 shadow-sm rounded-4">
                <h4 className="fw-bold mb-3">
                  {perfil === 'PACIENTE' ? 'Resumo da Minha Área' : 'Visão Geral'}
                </h4>

                {perfil === 'SECRETARIO' && (
                  <p className="mb-0 text-muted">
                    Você possui uma visão ampla da clínica, com acompanhamento de pacientes,
                    médicos, consultas, exames, agenda e indicadores operacionais.
                  </p>
                )}

                {perfil === 'MEDICO' && (
                  <p className="mb-0 text-muted">
                    Aqui você acompanha seus atendimentos, prontuários, exames e disponibilidade
                    de agenda de forma rápida e organizada.
                  </p>
                )}

                {perfil === 'PACIENTE' && (
                  <p className="mb-0 text-muted">
                    Aqui você acompanha suas consultas, exames e prontuários de forma simples,
                    moderna e organizada.
                  </p>
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}
    </MainLayout>
  )
}

export default DashboardPage