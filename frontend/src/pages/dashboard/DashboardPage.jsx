import { useCallback, useEffect, useMemo, useState } from 'react'
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
  FaExclamationTriangle,
  FaHeartbeat,
  FaSyncAlt
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
import { listarListaEspera } from '../../services/listaEsperaService'
import { obterResumoDashboard } from '../../services/dashboardService'
import './DashboardPage.css'

function toLocalDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseLocalDate(value) {
  if (!value) return null

  const datePart = String(value).slice(0, 10)
  const [year, month, day] = datePart.split('-').map(Number)

  if (!year || !month || !day) return new Date(value)
  return new Date(year, month - 1, day)
}

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
  const [listaEspera, setListaEspera] = useState([])
  const [resumoGerencial, setResumoGerencial] = useState(null)

  const perfil = user?.perfil || 'SECRETARIO'
  const pacienteIdLogado = user?.paciente_id || null
  const medicoIdLogado = user?.medico_id || null
  const nomeUsuario = user?.nome || 'Usuário'
  const primeiroNome = nomeUsuario.trim().split(/\s+/)[0]
  const perfilLabel = {
    SECRETARIO: 'Secretário',
    MEDICO: 'Médico',
    PACIENTE: 'Paciente'
  }[perfil]
  const contextoLabel = {
    SECRETARIO: 'Central operacional',
    MEDICO: 'Painel clínico',
    PACIENTE: 'Minha saúde'
  }[perfil]
  const [hoje] = useState(() => new Date())
  const saudacao =
    hoje.getHours() < 12 ? 'Bom dia' : hoje.getHours() < 18 ? 'Boa tarde' : 'Boa noite'
  const dataHojeFormatada = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long'
  }).format(hoje)

  const carregarDashboard = useCallback(async () => {
    try {
      setLoading(true)
      setErro('')
      setSucesso('')

      if (perfil === 'SECRETARIO') {
        const [
          dadosConsultas,
          dadosExames,
          dadosAgendas,
          dadosPacientes,
          dadosMedicos,
          dadosResumoGerencial
        ] = await Promise.all([
          listarConsultas(),
          listarExames(),
          listarAgendas(),
          listarPacientes(),
          listarMedicos(),
          obterResumoDashboard()
        ])

        setConsultas(Array.isArray(dadosConsultas) ? dadosConsultas : [])
        setExames(Array.isArray(dadosExames) ? dadosExames : [])
        setProntuarios([])
        setAgendas(Array.isArray(dadosAgendas) ? dadosAgendas : [])
        setPacientes(Array.isArray(dadosPacientes) ? dadosPacientes : [])
        setMedicos(Array.isArray(dadosMedicos) ? dadosMedicos : [])
        setResumoGerencial(dadosResumoGerencial || null)
        setListaEspera([])
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
        setListaEspera([])
        setResumoGerencial(null)
      } else if (perfil === 'PACIENTE') {
        const [
          dadosConsultas,
          dadosExames,
          dadosProntuarios,
          dadosListaEspera
        ] = await Promise.all([
          listarConsultas(),
          listarExames(),
          listarProntuarios(),
          listarListaEspera()
        ])

        setConsultas(Array.isArray(dadosConsultas) ? dadosConsultas : [])
        setExames(Array.isArray(dadosExames) ? dadosExames : [])
        setProntuarios(Array.isArray(dadosProntuarios) ? dadosProntuarios : [])
        setListaEspera(Array.isArray(dadosListaEspera) ? dadosListaEspera : [])
        setAgendas([])
        setPacientes([])
        setMedicos([])
        setResumoGerencial(null)
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
      setErro(error.response?.data?.erro || 'Erro ao carregar dashboard.')
    } finally {
      setLoading(false)
    }
  }, [perfil])

  useEffect(() => {
    carregarDashboard()
  }, [carregarDashboard])

  const hojeStr = toLocalDateKey(hoje)

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
    if (perfil === 'SECRETARIO') return []

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

      const chave = toLocalDateKey(data)
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
  }, [consultasVisiveis, hoje])

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

  const chamadosListaEsperaPaciente = useMemo(() => {
    if (perfil !== 'PACIENTE') return []

    return listaEspera.filter((item) => item.status === 'CHAMADO')
  }, [perfil, listaEspera])

  const notificacoes = useMemo(() => {
    const lista = []

    if (perfil === 'PACIENTE' && chamadosListaEsperaPaciente.length > 0) {
      lista.unshift({
        tipo: 'success',
        texto: 'Você foi chamado na lista de espera. Veja o aviso no dashboard.'
      })
    }

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
    proximaConsultaPaciente,
    chamadosListaEsperaPaciente.length
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
    return parseLocalDate(data).toLocaleDateString('pt-BR')
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
    trendPositive = true,
    columnProps = { md: 6, lg: 3 }
  }) => (
    <Col {...columnProps} className="dashboard-metric-column">
      <Card className={`dashboard-metric-card ${variantClass}`}>
        <Card.Body>
          <div className="dashboard-metric-card__top">
            <div className="dashboard-metric-card__icon">{icon}</div>
            {trendText && (
              <small
                className={`dashboard-metric-card__trend ${
                  trendPositive ? 'is-positive' : 'is-negative'
                }`}
              >
                {trendPositive ? <FaArrowUp /> : <FaArrowDown />}
                {trendText}
              </small>
            )}
          </div>
          <div className="dashboard-metric-card__content">
            <span>{titulo}</span>
            <strong>{valor}</strong>
            <p>{descricao}</p>
          </div>
        </Card.Body>
      </Card>
    </Col>
  )

  const renderCardsSecretario = () => (
    <Row className="dashboard-metrics g-3">
      {renderMetricCard({
        icon: <FaUserInjured />,
        titulo: 'Pacientes',
        valor: resumoGerencial?.pacientes ?? pacientes.length,
        descricao: 'Pacientes cadastrados',
        variantClass: 'stat-blue',
        trendText: 'Base ativa'
      })}

      {renderMetricCard({
        icon: <FaCalendarCheck />,
        titulo: 'Consultas',
        valor: resumoGerencial?.consultas ?? consultas.length,
        descricao: 'Consultas cadastradas',
        variantClass: 'stat-green',
        trendText: 'Geral'
      })}

      {renderMetricCard({
        icon: <FaFlask />,
        titulo: 'Exames',
        valor: resumoGerencial?.exames ?? exames.length,
        descricao: 'Exames cadastrados',
        variantClass: 'stat-yellow',
        trendText: 'Controle'
      })}

      {renderMetricCard({
        icon: <FaUserMd />,
        titulo: 'Médicos',
        valor: resumoGerencial?.medicos ?? medicos.length,
        descricao: 'Médicos cadastrados',
        variantClass: 'stat-red',
        trendText: 'Equipe'
      })}
    </Row>
  )

  const renderCardsMedico = () => (
    <Row className="dashboard-metrics g-3">
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
    <Row className="dashboard-metrics g-3">
      {renderMetricCard({
        icon: <FaCalendarCheck />,
        titulo: 'Consultas',
        valor: consultasVisiveis.length,
        descricao: 'Minhas consultas',
        variantClass: 'stat-green',
        trendText: 'Acompanhamento',
        columnProps: { md: 6, lg: 4 }
      })}
      {renderMetricCard({
        icon: <FaFlask />,
        titulo: 'Exames',
        valor: examesVisiveis.length,
        descricao: 'Meus exames',
        variantClass: 'stat-yellow',
        trendText: 'Resultados',
        columnProps: { md: 6, lg: 4 }
      })}
      {renderMetricCard({
        icon: <FaNotesMedical />,
        titulo: 'Prontuários',
        valor: prontuariosVisiveis.length,
        descricao: 'Meu histórico clínico',
        variantClass: 'stat-blue',
        trendText: 'Histórico',
        columnProps: { md: 6, lg: 4 }
      })}
    </Row>
  )

  const renderAvisoListaEsperaPaciente = () => {
    if (perfil !== 'PACIENTE' || chamadosListaEsperaPaciente.length === 0) {
      return null
    }

    return (
      <Alert variant="success" className="dashboard-waiting-alert">
        <div className="d-flex align-items-start gap-3">
          <div className="fs-3">
            <FaCheckCircle />
          </div>

          <div>
            <h4 className="fw-bold mb-2">
              Você foi chamado na lista de espera!
            </h4>

            <p className="mb-3">
              A clínica sinalizou disponibilidade para um atendimento solicitado.
              Confira as informações abaixo e aguarde o contato da secretaria ou
              entre em contato para confirmar o agendamento.
            </p>

            {chamadosListaEsperaPaciente.map((item) => (
              <div key={item.id} className="bg-white rounded-4 p-3 mb-2">
                <p className="mb-1">
                  <strong>Médico:</strong> {item.medico_nome || 'Não informado'}
                </p>

                <p className="mb-1">
                  <strong>Especialidade:</strong> {item.especialidade || 'Não informada'}
                </p>

                <p className="mb-1">
                  <strong>Data desejada:</strong> {formatarData(item.data_desejada)}
                </p>

                <p className="mb-0">
                  <strong>Status:</strong>{' '}
                  <Badge bg="success">
                    {item.status}
                  </Badge>
                </p>
              </div>
            ))}

            <Button
              variant="success"
              className="mt-3"
              onClick={() => redirecionarPara('/consultas')}
            >
              Ver minhas consultas
            </Button>
          </div>
        </div>
      </Alert>
    )
  }

  const renderLista = (titulo, itens, tipo) => (
    <Card className="content-card dashboard-list-card h-100">
      <div className="dashboard-panel-heading">
        <div>
          <span className="dashboard-panel-eyebrow">Atualizações recentes</span>
          <h4>{titulo}</h4>
        </div>
      </div>

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
    <Card className="content-card dashboard-chart-card h-100">
      <div className="dashboard-panel-heading">
        <div>
          <span className="dashboard-panel-eyebrow">Movimentação semanal</span>
          <h4>Consultas nos últimos 7 dias</h4>
        </div>
        <span className="dashboard-panel-icon">
          <FaCalendarCheck />
        </span>
      </div>
      <div className="dashboard-chart-area">
        <ResponsiveContainer>
          <BarChart data={consultasUltimos7Dias}>
            <CartesianGrid stroke="#edf0f5" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="dia" axisLine={false} tickLine={false} />
            <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip cursor={{ fill: '#f5f8ff' }} />
            <Bar
              dataKey="consultas"
              name="Consultas"
              fill="#2563eb"
              radius={[9, 9, 3, 3]}
              maxBarSize={42}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )

  const renderGraficoExames = () => (
    <Card className="content-card dashboard-chart-card h-100">
      <div className="dashboard-panel-heading">
        <div>
          <span className="dashboard-panel-eyebrow">Distribuição</span>
          <h4>Exames por status</h4>
        </div>
        <span className="dashboard-panel-icon dashboard-panel-icon--violet">
          <FaFlask />
        </span>
      </div>
      <div className="dashboard-chart-area dashboard-chart-area--pie">
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
    <Card className="content-card dashboard-notifications-card h-100">
      <div className="dashboard-panel-heading">
        <div>
          <span className="dashboard-panel-eyebrow">Central de avisos</span>
          <h4>Notificações</h4>
        </div>
        <span className="dashboard-panel-icon dashboard-panel-icon--amber">
          <FaBell />
        </span>
      </div>

      {notificacoes.length === 0 ? (
        <p className="text-muted mb-0">Nenhuma notificação importante no momento.</p>
      ) : (
        <div className="d-flex flex-column gap-3">
          {notificacoes.map((item, index) => (
            <div
              key={index}
              className={`dashboard-notification dashboard-notification--${item.tipo}`}
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
    <Card className="content-card dashboard-progress-card h-100">
      <div className="dashboard-panel-heading">
        <div>
          <span className="dashboard-panel-eyebrow">Desempenho</span>
          <h4>Indicadores rápidos</h4>
        </div>
        <span className="dashboard-panel-icon dashboard-panel-icon--green">
          <FaHeartbeat />
        </span>
      </div>

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
    <Card className="content-card dashboard-next-appointment h-100">
      <div className="dashboard-panel-heading">
        <div>
          <span className="dashboard-panel-eyebrow">Seu próximo compromisso</span>
          <h4>Próxima consulta</h4>
          <p>
            Veja os detalhes do seu próximo atendimento.
          </p>
        </div>

        <span className="dashboard-panel-icon dashboard-panel-icon--green">
          <FaCalendarCheck />
        </span>
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
    <Card className="content-card dashboard-quick-actions h-100">
      <div className="dashboard-panel-heading">
        <div>
          <span className="dashboard-panel-eyebrow">Atalhos</span>
          <h4>Ações rápidas</h4>
        </div>
      </div>

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
      <div className="clinical-dashboard">
        <section className="dashboard-hero">
          <div className="dashboard-hero__content">
            <span className="dashboard-hero__eyebrow">
              <FaHeartbeat />
              {contextoLabel}
            </span>
            <h1>
              {saudacao}, <span>{primeiroNome}</span>
            </h1>
            <p>
              {perfil === 'SECRETARIO' &&
                'Acompanhe a operação da clínica e mantenha a rotina organizada.'}
              {perfil === 'MEDICO' &&
                'Veja seus atendimentos, exames e registros clínicos em um só lugar.'}
              {perfil === 'PACIENTE' &&
                'Acompanhe seus cuidados, próximos atendimentos e resultados.'}
            </p>
          </div>

          <div className="dashboard-hero__meta">
            <span className="dashboard-hero__chip">
              <FaCalendarCheck />
              <span className="text-capitalize">{dataHojeFormatada}</span>
            </span>
            <span className="dashboard-hero__chip dashboard-hero__chip--role">
              {perfil === 'PACIENTE' && <FaUserInjured />}
              {perfil === 'MEDICO' && <FaUserMd />}
              {perfil === 'SECRETARIO' && <FaCalendarCheck />}
              {perfilLabel}
            </span>
            <button
              type="button"
              className="dashboard-refresh-button"
              onClick={carregarDashboard}
              disabled={loading}
              title="Atualizar dashboard"
              aria-label="Atualizar dashboard"
            >
              <FaSyncAlt className={loading ? 'is-spinning' : ''} />
            </button>
          </div>

          <FaHeartbeat className="dashboard-hero__decoration" aria-hidden="true" />
        </section>

        {erro && (
          <Alert
            variant="danger"
            dismissible
            onClose={() => setErro('')}
            className="dashboard-feedback"
          >
            {erro}
          </Alert>
        )}
        {sucesso && (
          <Alert
            variant="success"
            dismissible
            onClose={() => setSucesso('')}
            className="dashboard-feedback"
          >
            {sucesso}
          </Alert>
        )}

        {loading ? (
          <div className="dashboard-loading">
            <span className="dashboard-loading__icon">
              <Spinner animation="border" />
            </span>
            <strong>Preparando sua visão geral</strong>
            <p>Organizando os dados mais recentes da clínica...</p>
          </div>
        ) : (
          <div className="dashboard-content">
          {renderAvisoListaEsperaPaciente()}

          {perfil === 'SECRETARIO' && renderCardsSecretario()}
          {perfil === 'MEDICO' && renderCardsMedico()}
          {perfil === 'PACIENTE' && renderCardsPaciente()}

          {perfil === 'PACIENTE' && (
            <Row className="g-3 dashboard-section-row">
              <Col lg={7}>{renderCardProximaConsultaPaciente()}</Col>
              <Col lg={5}>{renderAcoesRapidasPaciente()}</Col>
            </Row>
          )}

          <Row className="g-3 dashboard-section-row">
            <Col lg={8}>{renderGraficoConsultas()}</Col>
            <Col lg={4}>{renderNotificacoes()}</Col>
          </Row>

          <Row className="g-3 dashboard-section-row">
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

          <Row className="g-3 dashboard-section-row">
            <Col lg={6}>{renderIndicadores()}</Col>

            <Col lg={6}>
              <Card className="content-card dashboard-profile-card h-100">
                <div className="dashboard-panel-heading">
                  <div>
                    <span className="dashboard-panel-eyebrow">Conta conectada</span>
                    <h4>
                      {perfil === 'PACIENTE' ? 'Meu perfil' : 'Perfil do usuário'}
                    </h4>
                  </div>
                  <span className="dashboard-profile-avatar">
                    {nomeUsuario
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join('')
                      .toUpperCase()}
                  </span>
                </div>
                <div className="dashboard-profile-details">
                  <div>
                    <span>Nome</span>
                    <strong>{nomeUsuario}</strong>
                  </div>
                  <div>
                    <span>E-mail</span>
                    <strong>{user?.email || 'E-mail não informado'}</strong>
                  </div>
                  <div>
                    <span>Perfil de acesso</span>
                    <strong>{perfilLabel}</strong>
                  </div>
                </div>
                {perfil === 'PACIENTE' && (
                  <p className="dashboard-profile-note">
                    Área personalizada com acesso rápido às suas consultas, exames,
                    prescrições e acompanhamento do check-in online.
                  </p>
                )}
                {perfil === 'MEDICO' && (
                  <p className="dashboard-profile-note">
                    Área personalizada com informações relevantes para seu acompanhamento diário.
                  </p>
                )}
              </Card>
            </Col>
          </Row>

          <Row className="g-3 dashboard-section-row">
            <Col md={12}>
              <Card className="content-card dashboard-summary-card">
                <span className="dashboard-summary-card__icon">
                  <FaHeartbeat />
                </span>
                <div>
                  <span className="dashboard-panel-eyebrow">Health Horizon</span>
                  <h4>
                    {perfil === 'PACIENTE' ? 'Resumo da minha área' : 'Visão geral'}
                  </h4>

                  {perfil === 'SECRETARIO' && (
                    <p>
                      Você possui uma visão ampla da clínica, com acompanhamento de pacientes,
                      médicos, consultas, exames, agenda, lista de espera e indicadores operacionais.
                    </p>
                  )}

                  {perfil === 'MEDICO' && (
                    <p>
                      Aqui você acompanha seus atendimentos, prontuários, exames e disponibilidade
                      de agenda de forma rápida e organizada.
                    </p>
                  )}

                  {perfil === 'PACIENTE' && (
                    <p>
                      Aqui você acompanha sua próxima consulta, verifica o status do check-in,
                      acessa rapidamente exames, prescrições, histórico clínico e avisos da lista
                      de espera em um ambiente mais simples, moderno e organizado.
                    </p>
                  )}
                </div>
              </Card>
            </Col>
          </Row>
          </div>
        )}
      </div>
    </MainLayout>
  )
}

export default DashboardPage
