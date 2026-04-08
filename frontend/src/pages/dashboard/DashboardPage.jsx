import { useEffect, useMemo, useState } from 'react'
import {
  Card,
  Col,
  Row,
  Badge,
  Spinner,
  Alert,
  ListGroup,
  ProgressBar,
  Button
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
import {
  listarConsultas,
  realizarCheckInConsulta
} from '../../services/consultaService'
import { listarExames } from '../../services/exameService'
import { listarProntuarios } from '../../services/prontuariosService'
import { listarAgendas } from '../../services/agendaService'
import { listarPacientes } from '../../services/pacientesService'
import { listarMedicos } from '../../services/medicosService'

function DashboardPage() {
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [loadingCheckInId, setLoadingCheckInId] = useState(null)

  const [consultas, setConsultas] = useState([])
  const [exames, setExames] = useState([])
  const [prontuarios, setProntuarios] = useState([])
  const [agendas, setAgendas] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [medicos, setMedicos] = useState([])

  const perfil = user?.perfil || 'SECRETARIO'
  const pacienteIdLogado = user?.paciente_id || null
  const medicoIdLogado = user?.medico_id || null

  useEffect(() => {
    carregarDashboard()
  }, [])

  const carregarDashboard = async () => {
    try {
      setLoading(true)
      setErro('')
      setSucesso('')

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
        setPacientes([])
        setMedicos([])
      } else if (perfil === 'PACIENTE') {
        const [dadosConsultas, dadosExames, dadosProntuarios] = await Promise.all([
          listarConsultas(),
          listarExames(),
          listarProntuarios()
        ])

        setConsultas(Array.isArray(dadosConsultas) ? dadosConsultas : [])
        setExames(Array.isArray(dadosExames) ? dadosExames : [])
        setProntuarios(Array.isArray(dadosProntuarios) ? dadosProntuarios : [])
        setAgendas([])
        setPacientes([])
        setMedicos([])
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

  const consultasVisiveis = useMemo(() => {
    if (perfil === 'SECRETARIO') return consultas

    if (perfil === 'MEDICO') {
      return consultas.filter(
        (consulta) => Number(consulta.medico_id) === Number(medicoIdLogado)
      )
    }

    if (perfil === 'PACIENTE') {
      return consultas.filter(
        (consulta) => Number(consulta.paciente_id) === Number(pacienteIdLogado)
      )
    }

    return []
  }, [consultas, perfil, medicoIdLogado, pacienteIdLogado])

  const examesVisiveis = useMemo(() => {
    if (perfil === 'SECRETARIO') return exames

    if (perfil === 'MEDICO') {
      return exames.filter((exame) => {
        if (exame.medico_id == null) return true
        return Number(exame.medico_id) === Number(medicoIdLogado)
      })
    }

    if (perfil === 'PACIENTE') {
      return exames.filter((exame) => {
        if (exame.paciente_id == null) return true
        return Number(exame.paciente_id) === Number(pacienteIdLogado)
      })
    }

    return []
  }, [exames, perfil, medicoIdLogado, pacienteIdLogado])

  const prontuariosVisiveis = useMemo(() => {
    if (perfil === 'SECRETARIO') return prontuarios

    if (perfil === 'MEDICO') {
      return prontuarios.filter((prontuario) => {
        if (prontuario.medico_id == null) return true
        return Number(prontuario.medico_id) === Number(medicoIdLogado)
      })
    }

    if (perfil === 'PACIENTE') {
      return prontuarios.filter((prontuario) => {
        if (prontuario.paciente_id == null) return true
        return Number(prontuario.paciente_id) === Number(pacienteIdLogado)
      })
    }

    return []
  }, [prontuarios, perfil, medicoIdLogado, pacienteIdLogado])

  const agendasVisiveis = useMemo(() => {
    if (perfil === 'SECRETARIO') return agendas

    if (perfil === 'MEDICO') {
      return agendas.filter((agenda) => {
        if (agenda.medico_id == null) return true
        return Number(agenda.medico_id) === Number(medicoIdLogado)
      })
    }

    return []
  }, [agendas, perfil, medicoIdLogado])

  const consultasHoje = useMemo(() => {
    return consultasVisiveis.filter((consulta) => {
      const data =
        consulta.data_consulta?.slice(0, 10) ||
        consulta.data?.slice(0, 10) ||
        ''
      return data === hojeStr
    })
  }, [consultasVisiveis, hojeStr])

  const examesPendentes = useMemo(() => {
    return examesVisiveis.filter(
      (exame) => exame.status === 'SOLICITADO' || exame.status === 'AGENDADO'
    )
  }, [examesVisiveis])

  const agendasDisponiveis = useMemo(() => {
    return agendasVisiveis.filter((agenda) => agenda.disponivel === true)
  }, [agendasVisiveis])

  const ultimasConsultas = useMemo(() => {
    return [...consultasVisiveis].slice(0, 5)
  }, [consultasVisiveis])

  const ultimosExames = useMemo(() => {
    return [...examesVisiveis].slice(0, 5)
  }, [examesVisiveis])

  const ultimosProntuarios = useMemo(() => {
    return [...prontuariosVisiveis].slice(0, 5)
  }, [prontuariosVisiveis])

  const consultasPorStatus = useMemo(() => {
    const base = {
      AGENDADA: 0,
      CONFIRMADA: 0,
      REALIZADA: 0,
      CANCELADA: 0,
      FALTOU: 0
    }

    consultasVisiveis.forEach((consulta) => {
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
  }, [consultasVisiveis])

  const examesPorStatus = useMemo(() => {
    const base = {
      SOLICITADO: 0,
      AGENDADO: 0,
      REALIZADO: 0,
      ENTREGUE: 0,
      CANCELADO: 0
    }

    examesVisiveis.forEach((exame) => {
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
  }, [examesVisiveis])

  const consultasUltimos7Dias = useMemo(() => {
    const dias = []
    const nomesDias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

    for (let i = 6; i >= 0; i--) {
      const data = new Date()
      data.setDate(hoje.getDate() - i)

      const chave = data.toISOString().split('T')[0]
      const label = nomesDias[data.getDay()]

      const total = consultasVisiveis.filter((consulta) => {
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
  }, [consultasVisiveis])

  const proximaConsultaPaciente = useMemo(() => {
    if (perfil !== 'PACIENTE') return null

    const consultasFuturas = consultasVisiveis
      .filter((consulta) => {
        const status = consulta.status || ''
        if (status === 'CANCELADA' || status === 'REALIZADA' || status === 'FALTOU') {
          return false
        }

        if (!consulta.data_consulta) return false

        const dataHoraConsulta = new Date(
          `${consulta.data_consulta.slice(0, 10)}T${String(
            consulta.hora_consulta || '00:00'
          ).slice(0, 5)}`
        )

        return !Number.isNaN(dataHoraConsulta.getTime())
      })
      .sort((a, b) => {
        const dataA = new Date(
          `${a.data_consulta.slice(0, 10)}T${String(a.hora_consulta || '00:00').slice(0, 5)}`
        )
        const dataB = new Date(
          `${b.data_consulta.slice(0, 10)}T${String(b.hora_consulta || '00:00').slice(0, 5)}`
        )
        return dataA - dataB
      })

    return consultasFuturas[0] || null
  }, [perfil, consultasVisiveis])

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

    const canceladas = consultasVisiveis.filter(
      (consulta) => consulta.status === 'CANCELADA'
    ).length

    if (canceladas > 0) {
      lista.push({
        tipo: 'danger',
        texto: `${canceladas} consulta(s) cancelada(s)`
      })
    }

    const realizadas = consultasVisiveis.filter(
      (consulta) => consulta.status === 'REALIZADA'
    ).length

    if (realizadas > 0) {
      lista.push({
        tipo: 'success',
        texto: `${realizadas} consulta(s) realizada(s)`
      })
    }

    if (
      perfil === 'PACIENTE' &&
      proximaConsultaPaciente &&
      !proximaConsultaPaciente.checkin_realizado
    ) {
      lista.unshift({
        tipo: 'info',
        texto: 'Você possui check-in pendente na sua próxima consulta'
      })
    }

    return lista.slice(0, 4)
  }, [
    consultasHoje.length,
    examesPendentes.length,
    consultasVisiveis,
    perfil,
    proximaConsultaPaciente
  ])

  const percentualConsultasRealizadas = useMemo(() => {
    if (consultasVisiveis.length === 0) return 0
    const realizadas = consultasVisiveis.filter(
      (consulta) => consulta.status === 'REALIZADA'
    ).length
    return Math.round((realizadas / consultasVisiveis.length) * 100)
  }, [consultasVisiveis])

  const percentualExamesEntregues = useMemo(() => {
    if (examesVisiveis.length === 0) return 0
    const entregues = examesVisiveis.filter(
      (exame) => exame.status === 'ENTREGUE'
    ).length
    return Math.round((entregues / examesVisiveis.length) * 100)
  }, [examesVisiveis])

  const coresPie = ['#0d6efd', '#20c997', '#ffc107', '#dc3545', '#6c757d']

  const formatarData = (data) => {
    if (!data) return '-'
    return new Date(data).toLocaleDateString('pt-BR')
  }

  const formatarHora = (hora) => {
    if (!hora) return '-'
    return String(hora).slice(0, 5)
  }

  const formatarDataHora = (data) => {
    if (!data) return '-'
    return new Date(data).toLocaleString('pt-BR')
  }

  const redirecionarPara = (rota) => {
    window.location.href = rota
  }

  const handleCheckInRapido = async (consultaId) => {
    try {
      setErro('')
      setSucesso('')
      setLoadingCheckInId(consultaId)

      await realizarCheckInConsulta(consultaId)
      setSucesso('Check-in realizado com sucesso!')
      carregarDashboard()
    } catch (error) {
      console.error('Erro ao realizar check-in:', error)
      setErro(
        error.response?.data?.erro ||
          error.response?.data?.message ||
          'Erro ao realizar check-in.'
      )
    } finally {
      setLoadingCheckInId(null)
    }
  }

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
        valor: examesVisiveis.length,
        descricao: 'Exames vinculados',
        variantClass: 'stat-yellow',
        trendText: 'Em acompanhamento'
      })}
      {renderMetricCard({
        icon: <FaNotesMedical />,
        titulo: 'Prontuários',
        valor: prontuariosVisiveis.length,
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
            <h2 className="fw-bold">{consultasVisiveis.length}</h2>
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
            <h2 className="fw-bold">{examesVisiveis.length}</h2>
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
            <h2 className="fw-bold">{prontuariosVisiveis.length}</h2>
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
                    {item.data_consulta
                      ? new Date(item.data_consulta).toLocaleDateString('pt-BR')
                      : '-'}
                  </small>
                </>
              )}

              {tipo === 'exame' && (
                <>
                  <strong>{item.nome_exame || `Exame #${item.id}`}</strong>
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
                    {item.created_at
                      ? new Date(item.created_at).toLocaleDateString('pt-BR')
                      : '-'}
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

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'AGENDADA':
        return <Badge bg="primary">{status}</Badge>
      case 'CONFIRMADA':
        return <Badge bg="info">{status}</Badge>
      case 'REALIZADA':
        return <Badge bg="success">{status}</Badge>
      case 'CANCELADA':
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

  const renderCheckInBadge = (consulta) => {
    if (consulta?.checkin_realizado) {
      return <Badge bg="success">Realizado</Badge>
    }

    return <Badge bg="secondary">Pendente</Badge>
  }

  const podeFazerCheckIn = (consulta) => {
    return (
      perfil === 'PACIENTE' &&
      consulta &&
      !consulta.checkin_realizado &&
      consulta.status !== 'CANCELADA' &&
      consulta.status !== 'REALIZADA' &&
      consulta.status !== 'FALTOU'
    )
  }

  const renderCardProximaConsultaPaciente = () => (
    <Card className="content-card p-4 border-0 shadow-sm rounded-4 h-100">
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h4 className="fw-bold mb-1">Próxima consulta</h4>
          <p className="text-muted mb-0">
            Veja os detalhes do seu próximo atendimento.
          </p>
        </div>

        <div className="stat-icon">
          <FaCalendarCheck />
        </div>
      </div>

      {!proximaConsultaPaciente ? (
        <div className="text-muted">
          Você não possui consultas futuras agendadas no momento.
        </div>
      ) : (
        <>
          <div className="mb-3">
            <p className="mb-2">
              <strong>Médico:</strong> {proximaConsultaPaciente.medico_nome || '-'}
            </p>
            <p className="mb-2">
              <strong>Data:</strong> {formatarData(proximaConsultaPaciente.data_consulta)}
            </p>
            <p className="mb-2">
              <strong>Horário:</strong> {formatarHora(proximaConsultaPaciente.hora_consulta)}
            </p>
            <p className="mb-2">
              <strong>Status:</strong> {renderStatusBadge(proximaConsultaPaciente.status)}
            </p>
            <p className="mb-0">
              <strong>Check-in:</strong>{' '}
              {renderCheckInBadge(proximaConsultaPaciente)}
            </p>
          </div>

          {proximaConsultaPaciente.data_checkin && (
            <Alert variant="success" className="py-2">
              Check-in registrado em {formatarDataHora(proximaConsultaPaciente.data_checkin)}.
            </Alert>
          )}

          <div className="d-flex flex-wrap gap-2 mt-3">
            {podeFazerCheckIn(proximaConsultaPaciente) && (
              <Button
                variant="success"
                onClick={() => handleCheckInRapido(proximaConsultaPaciente.id)}
                disabled={loadingCheckInId === proximaConsultaPaciente.id}
              >
                {loadingCheckInId === proximaConsultaPaciente.id
                  ? 'Processando...'
                  : 'Fazer Check-in'}
              </Button>
            )}

            <Button variant="outline-primary" onClick={() => redirecionarPara('/consultas')}>
              Ver minhas consultas
            </Button>
          </div>
        </>
      )}
    </Card>
  )

  const renderAcoesRapidasPaciente = () => (
    <Card className="content-card p-4 border-0 shadow-sm rounded-4 h-100">
      <h4 className="fw-bold mb-3">Ações rápidas</h4>

      <div className="d-grid gap-3">
        <Button variant="outline-primary" onClick={() => redirecionarPara('/consultas')}>
          Minhas Consultas
        </Button>

        <Button variant="outline-warning" onClick={() => redirecionarPara('/exames')}>
          Meus Exames
        </Button>

        <Button variant="outline-info" onClick={() => redirecionarPara('/prontuarios')}>
          Meu Histórico Clínico
        </Button>

        <Button variant="outline-success" onClick={() => redirecionarPara('/prescricoes')}>
          Minhas Prescrições
        </Button>
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
      {sucesso && <Alert variant="success">{sucesso}</Alert>}

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <>
          {perfil === 'SECRETARIO' && renderCardsSecretario()}
          {perfil === 'MEDICO' && renderCardsMedico()}
          {perfil === 'PACIENTE' && renderCardsPaciente()}

          {perfil === 'PACIENTE' && (
            <Row className="g-4 mt-2">
              <Col lg={7}>{renderCardProximaConsultaPaciente()}</Col>
              <Col lg={5}>{renderAcoesRapidasPaciente()}</Col>
            </Row>
          )}

          <Row className="g-4 mt-2">
            <Col lg={8}>{renderGraficoConsultas()}</Col>
            <Col lg={4}>{renderNotificacoes()}</Col>
          </Row>

          <Row className="g-4 mt-2">
            <Col lg={7}>
              {perfil === 'SECRETARIO' &&
                renderLista('Últimas consultas', ultimasConsultas, 'consulta')}
              {perfil === 'MEDICO' &&
                renderLista('Últimos prontuários', ultimosProntuarios, 'prontuario')}
              {perfil === 'PACIENTE' &&
                renderLista('Meus exames recentes', ultimosExames, 'exame')}
            </Col>

            <Col lg={5}>{renderGraficoExames()}</Col>
          </Row>

          <Row className="g-4 mt-2">
            <Col lg={6}>{renderIndicadores()}</Col>

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
                {perfil === 'PACIENTE' && (
                  <p className="mb-0 text-muted">
                    Área personalizada com acesso rápido às suas consultas, exames,
                    prescrições e acompanhamento do check-in online.
                  </p>
                )}
                {perfil === 'MEDICO' && (
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
                    Aqui você acompanha sua próxima consulta, verifica o status do check-in,
                    acessa rapidamente exames, prescrições e histórico clínico em um ambiente
                    mais simples, moderno e organizado.
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