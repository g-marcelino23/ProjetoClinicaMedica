import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Form, Modal, Spinner, Table } from 'react-bootstrap'
import {
  FaCalendarAlt,
  FaCalendarCheck,
  FaCheckCircle,
  FaClock,
  FaHeartbeat,
  FaNotesMedical,
  FaPen,
  FaPlus,
  FaSearch,
  FaSignInAlt,
  FaSyncAlt,
  FaTimesCircle,
  FaTrash,
  FaUserInjured,
  FaUserMd
} from 'react-icons/fa'
import MainLayout from '../../components/layout/MainLayout'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import {
  atualizarConsulta,
  criarConsulta,
  excluirConsulta as excluirConsultaApi,
  listarConsultas,
  realizarCheckInConsulta
} from '../../services/consultaService'
import './ConsultasPage.css'

const STATUS_OPTIONS = [
  'AGENDADA',
  'CONFIRMADA',
  'REALIZADA',
  'CANCELADA',
  'FALTOU'
]

const STATUS_LABELS = {
  AGENDADA: 'Agendada',
  CONFIRMADA: 'Confirmada',
  REALIZADA: 'Realizada',
  CANCELADA: 'Cancelada',
  FALTOU: 'Faltou'
}

function parseLocalDate(value) {
  if (!value) return null

  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number)

  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function formatDate(value) {
  const date = parseLocalDate(value)
  return date ? date.toLocaleDateString('pt-BR') : '-'
}

function formatLongDate(value) {
  const date = parseLocalDate(value)

  if (!date) return '-'

  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
    .format(date)
    .replace('.', '')
}

function formatTime(value) {
  return value ? String(value).slice(0, 5) : '-'
}

function formatCheckInDateTime(value) {
  return value ? new Date(value).toLocaleString('pt-BR') : ''
}

function getDateBadge(value) {
  const date = parseLocalDate(value)

  if (!date) return { day: '--', month: '---' }

  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: new Intl.DateTimeFormat('pt-BR', { month: 'short' })
      .format(date)
      .replace('.', '')
      .toUpperCase()
  }
}

function localDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function ConsultasPage() {
  const { user } = useAuth()

  const perfil = user?.perfil || ''
  const medicoIdLogado = user?.medico_id || null
  const pacienteIdLogado = user?.paciente_id || null

  const [pacientes, setPacientes] = useState([])
  const [medicos, setMedicos] = useState([])
  const [agendas, setAgendas] = useState([])
  const [consultas, setConsultas] = useState([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [atualizando, setAtualizando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [erroCadastro, setErroCadastro] = useState('')
  const [erroStatus, setErroStatus] = useState('')
  const [erroExclusao, setErroExclusao] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [consultaSelecionada, setConsultaSelecionada] = useState(null)
  const [consultaParaExcluir, setConsultaParaExcluir] = useState(null)
  const [loadingCheckInId, setLoadingCheckInId] = useState(null)

  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('TODOS')
  const [filtroData, setFiltroData] = useState('')

  const [formData, setFormData] = useState({
    paciente_id: '',
    medico_id: '',
    agenda_id: '',
    data_consulta: '',
    hora_consulta: '',
    motivo: '',
    observacoes: ''
  })
  const [statusData, setStatusData] = useState({
    status: '',
    observacoes: ''
  })

  const podeCriarConsulta = perfil === 'SECRETARIO' || perfil === 'PACIENTE'
  const podeExcluirConsulta = perfil === 'SECRETARIO'
  const podeAtualizarConsulta =
    perfil === 'SECRETARIO' || perfil === 'MEDICO' || perfil === 'PACIENTE'

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true)
      setErro('')

      const dadosConsultas = await listarConsultas()
      setConsultas(Array.isArray(dadosConsultas) ? dadosConsultas : [])

      if (perfil === 'SECRETARIO') {
        const [resPacientes, resMedicos, resAgendas] = await Promise.all([
          api.get('/pacientes'),
          api.get('/medicos'),
          api.get('/agendas')
        ])

        setPacientes(Array.isArray(resPacientes.data) ? resPacientes.data : [])
        setMedicos(Array.isArray(resMedicos.data) ? resMedicos.data : [])
        setAgendas(Array.isArray(resAgendas.data) ? resAgendas.data : [])
      } else if (perfil === 'PACIENTE') {
        const [resMedicos, resAgendas] = await Promise.all([
          api.get('/medicos'),
          api.get('/agendas')
        ])

        setPacientes([])
        setMedicos(Array.isArray(resMedicos.data) ? resMedicos.data : [])
        setAgendas(Array.isArray(resAgendas.data) ? resAgendas.data : [])
      } else {
        setPacientes([])
        setMedicos([])
        setAgendas([])
      }
    } catch (error) {
      console.error('Erro ao carregar consultas:', error)
      setErro(error.response?.data?.erro || 'Erro ao carregar consultas.')
    } finally {
      setLoading(false)
    }
  }, [perfil])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

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

  const indicadores = useMemo(() => {
    const todayKey = localDateKey(new Date())
    const today = consultasVisiveis.filter(
      (consulta) => consulta.data_consulta?.slice(0, 10) === todayKey
    ).length
    const active = consultasVisiveis.filter((consulta) =>
      ['AGENDADA', 'CONFIRMADA'].includes(consulta.status)
    ).length
    const completed = consultasVisiveis.filter(
      (consulta) => consulta.status === 'REALIZADA'
    ).length

    return {
      total: consultasVisiveis.length,
      today,
      active,
      completed
    }
  }, [consultasVisiveis])

  const consultasFiltradas = useMemo(() => {
    const term = busca.trim().toLocaleLowerCase('pt-BR')

    return consultasVisiveis.filter((consulta) => {
      const matchesSearch =
        !term ||
        [
          consulta.paciente_nome,
          consulta.medico_nome,
          consulta.motivo,
          consulta.status,
          consulta.data_consulta
        ].some((value) =>
          String(value || '')
            .toLocaleLowerCase('pt-BR')
            .includes(term)
        )
      const matchesStatus =
        filtroStatus === 'TODOS' || consulta.status === filtroStatus
      const matchesDate =
        !filtroData || consulta.data_consulta?.slice(0, 10) === filtroData

      return matchesSearch && matchesStatus && matchesDate
    })
  }, [consultasVisiveis, busca, filtroStatus, filtroData])

  const agendasDisponiveisDoMedico = useMemo(() => {
    if (!formData.medico_id) return []

    return agendas.filter(
      (agenda) =>
        Number(agenda.medico_id) === Number(formData.medico_id) &&
        agenda.disponivel === true
    )
  }, [agendas, formData.medico_id])

  const filtrosAtivos = Boolean(
    busca || filtroStatus !== 'TODOS' || filtroData
  )

  const limparFiltros = () => {
    setBusca('')
    setFiltroStatus('TODOS')
    setFiltroData('')
  }

  const limparFormulario = () => {
    setFormData({
      paciente_id:
        perfil === 'PACIENTE' && pacienteIdLogado ? String(pacienteIdLogado) : '',
      medico_id: '',
      agenda_id: '',
      data_consulta: '',
      hora_consulta: '',
      motivo: '',
      observacoes: ''
    })
  }

  const abrirModalCadastro = () => {
    if (!podeCriarConsulta) {
      setErro('Você não tem permissão para criar consulta.')
      return
    }

    if (perfil === 'PACIENTE' && !pacienteIdLogado) {
      setErro('Não foi possível identificar o paciente logado.')
      return
    }

    setErroCadastro('')
    limparFormulario()
    setShowModal(true)
  }

  const fecharModalCadastro = () => {
    if (salvando) return

    setShowModal(false)
    setErroCadastro('')
    limparFormulario()
  }

  const abrirModalStatus = (consulta) => {
    if (!podeAtualizarConsulta) {
      setErro('Você não tem permissão para atualizar consulta.')
      return
    }

    setErroStatus('')
    setConsultaSelecionada(consulta)
    setStatusData({
      status: perfil === 'PACIENTE' ? 'CANCELADA' : consulta.status || 'AGENDADA',
      observacoes: consulta.observacoes || ''
    })
    setShowStatusModal(true)
  }

  const fecharModalStatus = () => {
    if (atualizando) return

    setShowStatusModal(false)
    setConsultaSelecionada(null)
    setErroStatus('')
    setStatusData({
      status: '',
      observacoes: ''
    })
  }

  const handleChange = (event) => {
    const { name, value } = event.target

    if (name === 'medico_id') {
      setFormData((current) => ({
        ...current,
        medico_id: value,
        agenda_id: '',
        data_consulta: '',
        hora_consulta: ''
      }))
      return
    }

    setFormData((current) => ({
      ...current,
      [name]: value
    }))
  }

  const handleSelecionarAgenda = (event) => {
    const agendaId = event.target.value
    const selectedSchedule = agendasDisponiveisDoMedico.find(
      (agenda) => Number(agenda.id) === Number(agendaId)
    )

    setFormData((current) => ({
      ...current,
      agenda_id: agendaId,
      data_consulta: selectedSchedule?.data_agenda || '',
      hora_consulta: selectedSchedule?.hora_inicio || ''
    }))
  }

  const handleCadastrarConsulta = async (event) => {
    event.preventDefault()

    if (!formData.agenda_id) {
      setErroCadastro('Selecione um horário disponível para continuar.')
      return
    }

    if (perfil === 'PACIENTE' && !pacienteIdLogado) {
      setErroCadastro('Não foi possível identificar o paciente logado.')
      return
    }

    if (perfil === 'SECRETARIO' && !formData.paciente_id) {
      setErroCadastro('Selecione o paciente da consulta.')
      return
    }

    try {
      setSalvando(true)
      setErroCadastro('')
      setErro('')
      setSucesso('')

      await criarConsulta({
        paciente_id:
          perfil === 'PACIENTE'
            ? Number(pacienteIdLogado)
            : Number(formData.paciente_id),
        agenda_id: Number(formData.agenda_id),
        motivo: formData.motivo,
        observacoes: formData.observacoes
      })

      setShowModal(false)
      limparFormulario()
      setSucesso('Consulta agendada com sucesso.')
      await carregarDados()
    } catch (error) {
      console.error('Erro ao cadastrar consulta:', error)
      setErroCadastro(
        error.response?.data?.erro ||
          error.response?.data?.message ||
          'Erro ao cadastrar consulta.'
      )
    } finally {
      setSalvando(false)
    }
  }

  const handleAtualizarStatus = async (event) => {
    event.preventDefault()

    if (!consultaSelecionada) {
      setErroStatus('Consulta não selecionada.')
      return
    }

    try {
      setAtualizando(true)
      setErroStatus('')
      setErro('')
      setSucesso('')

      await atualizarConsulta(consultaSelecionada.id, {
        status: statusData.status,
        observacoes: statusData.observacoes
      })

      setShowStatusModal(false)
      setConsultaSelecionada(null)
      setSucesso(
        perfil === 'PACIENTE'
          ? 'Consulta cancelada com sucesso.'
          : 'Consulta atualizada com sucesso.'
      )
      await carregarDados()
    } catch (error) {
      console.error('Erro ao atualizar consulta:', error)
      setErroStatus(
        error.response?.data?.erro ||
          error.response?.data?.message ||
          'Erro ao atualizar consulta.'
      )
    } finally {
      setAtualizando(false)
    }
  }

  const handleCheckIn = async (consultaId) => {
    try {
      setErro('')
      setSucesso('')
      setLoadingCheckInId(consultaId)
      await realizarCheckInConsulta(consultaId)
      setSucesso('Check-in realizado com sucesso.')
      await carregarDados()
    } catch (error) {
      console.error('Erro no check-in:', error)
      setErro(
        error.response?.data?.erro ||
          error.response?.data?.message ||
          'Erro ao realizar check-in.'
      )
    } finally {
      setLoadingCheckInId(null)
    }
  }

  const abrirConfirmacaoExclusao = (consulta) => {
    if (!podeExcluirConsulta) {
      setErro('Você não tem permissão para excluir consulta.')
      return
    }

    setErroExclusao('')
    setConsultaParaExcluir(consulta)
  }

  const fecharConfirmacaoExclusao = () => {
    if (excluindo) return

    setConsultaParaExcluir(null)
    setErroExclusao('')
  }

  const confirmarExclusao = async () => {
    if (!consultaParaExcluir) return

    try {
      setExcluindo(true)
      setErroExclusao('')
      setErro('')
      setSucesso('')
      await excluirConsultaApi(consultaParaExcluir.id)
      setConsultaParaExcluir(null)
      setSucesso('Consulta excluída com sucesso.')
      await carregarDados()
    } catch (error) {
      console.error('Erro ao excluir consulta:', error)
      setErroExclusao(
        error.response?.data?.erro ||
          error.response?.data?.message ||
          'Erro ao excluir consulta.'
      )
    } finally {
      setExcluindo(false)
    }
  }

  const podeFazerCheckIn = (consulta) =>
    perfil === 'PACIENTE' &&
    !consulta.checkin_realizado &&
    !['CANCELADA', 'REALIZADA', 'FALTOU'].includes(consulta.status)

  const renderStatus = (status) => (
    <span className={`appointments-status appointments-status--${status?.toLowerCase()}`}>
      <i aria-hidden="true" />
      {STATUS_LABELS[status] || status || 'Sem status'}
    </span>
  )

  const renderCheckIn = (consulta) => (
    <div className="appointments-checkin">
      <span className={consulta.checkin_realizado ? 'is-done' : 'is-pending'}>
        {consulta.checkin_realizado ? <FaCheckCircle /> : <FaClock />}
        {consulta.checkin_realizado ? 'Realizado' : 'Pendente'}
      </span>
      {consulta.checkin_realizado && consulta.data_checkin && (
        <small>{formatCheckInDateTime(consulta.data_checkin)}</small>
      )}
    </div>
  )

  const renderActions = (consulta) => (
    <div className="appointments-actions">
      {podeFazerCheckIn(consulta) && (
        <button
          type="button"
          className="appointments-action-button appointments-action-button--checkin"
          onClick={() => handleCheckIn(consulta.id)}
          disabled={loadingCheckInId === consulta.id}
          title="Realizar check-in"
        >
          {loadingCheckInId === consulta.id ? (
            <Spinner animation="border" size="sm" />
          ) : (
            <FaSignInAlt />
          )}
          <span>Check-in</span>
        </button>
      )}

      {podeAtualizarConsulta && (
        <button
          type="button"
          className={`appointments-icon-button ${
            perfil === 'PACIENTE' ? 'appointments-icon-button--cancel' : ''
          }`}
          onClick={() => abrirModalStatus(consulta)}
          title={perfil === 'PACIENTE' ? 'Cancelar consulta' : 'Atualizar consulta'}
          aria-label={
            perfil === 'PACIENTE' ? 'Cancelar consulta' : 'Atualizar consulta'
          }
        >
          {perfil === 'PACIENTE' ? <FaTimesCircle /> : <FaPen />}
        </button>
      )}

      {podeExcluirConsulta && (
        <button
          type="button"
          className="appointments-icon-button appointments-icon-button--danger"
          onClick={() => abrirConfirmacaoExclusao(consulta)}
          title="Excluir consulta"
          aria-label="Excluir consulta"
        >
          <FaTrash />
        </button>
      )}
    </div>
  )

  return (
    <MainLayout>
      <div className="appointments-page">
        <section className="appointments-hero">
          <div className="appointments-hero__content">
            <span className="appointments-eyebrow">
              <FaHeartbeat />
              Central de atendimentos
            </span>
            <h1>Consultas</h1>
            <p>
              {perfil === 'SECRETARIO' &&
                'Organize os atendimentos, acompanhe confirmações e mantenha a operação em dia.'}
              {perfil === 'MEDICO' &&
                'Acompanhe seus atendimentos e atualize a evolução de cada consulta.'}
              {perfil === 'PACIENTE' &&
                'Acompanhe seus agendamentos, faça check-in e consulte os detalhes do atendimento.'}
            </p>
          </div>

          <div className="appointments-hero__actions">
            <button
              type="button"
              className="appointments-refresh-button"
              onClick={carregarDados}
              disabled={loading}
              title="Atualizar consultas"
              aria-label="Atualizar consultas"
            >
              <FaSyncAlt className={loading ? 'is-spinning' : ''} />
            </button>
            {podeCriarConsulta && (
              <Button
                className="appointments-primary-button"
                onClick={abrirModalCadastro}
              >
                <FaPlus />
                Nova consulta
              </Button>
            )}
          </div>

          <FaCalendarCheck
            className="appointments-hero__decoration"
            aria-hidden="true"
          />
        </section>

        <section className="appointments-stats" aria-label="Resumo das consultas">
          <article className="appointments-stat-card">
            <span className="appointments-stat-card__icon appointments-stat-card__icon--blue">
              <FaCalendarAlt />
            </span>
            <div>
              <small>Total de consultas</small>
              <strong>{indicadores.total}</strong>
              <span>atendimentos na sua visão</span>
            </div>
          </article>

          <article className="appointments-stat-card">
            <span className="appointments-stat-card__icon appointments-stat-card__icon--violet">
              <FaClock />
            </span>
            <div>
              <small>Consultas hoje</small>
              <strong>{indicadores.today}</strong>
              <span>compromissos do dia</span>
            </div>
          </article>

          <article className="appointments-stat-card">
            <span className="appointments-stat-card__icon appointments-stat-card__icon--amber">
              <FaNotesMedical />
            </span>
            <div>
              <small>Em acompanhamento</small>
              <strong>{indicadores.active}</strong>
              <span>agendadas ou confirmadas</span>
            </div>
          </article>

          <article className="appointments-stat-card">
            <span className="appointments-stat-card__icon appointments-stat-card__icon--green">
              <FaCheckCircle />
            </span>
            <div>
              <small>Realizadas</small>
              <strong>{indicadores.completed}</strong>
              <span>atendimentos concluídos</span>
            </div>
          </article>
        </section>

        {erro && (
          <Alert
            variant="danger"
            dismissible
            onClose={() => setErro('')}
            className="appointments-feedback"
          >
            {erro}
          </Alert>
        )}

        {sucesso && (
          <Alert
            variant="success"
            dismissible
            onClose={() => setSucesso('')}
            className="appointments-feedback"
          >
            {sucesso}
          </Alert>
        )}

        <section className="appointments-directory">
          <header className="appointments-directory__header">
            <div>
              <span className="appointments-section-eyebrow">Agenda clínica</span>
              <h2>Atendimentos cadastrados</h2>
              <p>
                {loading
                  ? 'Atualizando consultas...'
                  : `${consultasFiltradas.length} ${
                      consultasFiltradas.length === 1
                        ? 'consulta encontrada'
                        : 'consultas encontradas'
                    }`}
              </p>
            </div>

            <div className="appointments-filters">
              <div className="appointments-search">
                <FaSearch aria-hidden="true" />
                <input
                  type="search"
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar paciente, médico, motivo ou status"
                  aria-label="Buscar consultas"
                />
              </div>

              <Form.Select
                value={filtroStatus}
                onChange={(event) => setFiltroStatus(event.target.value)}
                aria-label="Filtrar consultas por status"
                className="appointments-filter-select"
              >
                <option value="TODOS">Todos os status</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </Form.Select>

              <div className="appointments-date-filter">
                <FaCalendarAlt aria-hidden="true" />
                <input
                  type="date"
                  value={filtroData}
                  onChange={(event) => setFiltroData(event.target.value)}
                  aria-label="Filtrar consultas por data"
                />
              </div>

              {filtrosAtivos && (
                <button
                  type="button"
                  className="appointments-clear-filters"
                  onClick={limparFiltros}
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </header>

          {loading ? (
            <div className="appointments-loading">
              <span>
                <Spinner animation="border" />
              </span>
              <strong>Carregando consultas</strong>
              <p>Organizando os atendimentos mais recentes...</p>
            </div>
          ) : consultasVisiveis.length === 0 ? (
            <div className="appointments-empty">
              <span>
                <FaCalendarCheck />
              </span>
              <h3>Nenhuma consulta cadastrada</h3>
              <p>Os novos atendimentos aparecerão aqui assim que forem agendados.</p>
              {podeCriarConsulta && (
                <Button
                  className="appointments-primary-button"
                  onClick={abrirModalCadastro}
                >
                  <FaPlus />
                  Agendar consulta
                </Button>
              )}
            </div>
          ) : consultasFiltradas.length === 0 ? (
            <div className="appointments-empty appointments-empty--compact">
              <span>
                <FaSearch />
              </span>
              <h3>Nenhum resultado encontrado</h3>
              <p>Tente alterar os filtros para visualizar outras consultas.</p>
              <button
                type="button"
                className="appointments-clear-filters"
                onClick={limparFiltros}
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <>
              <div className="appointments-table-wrapper">
                <Table className="appointments-table" responsive>
                  <thead>
                    <tr>
                      <th>Data e horário</th>
                      <th>Paciente</th>
                      <th>Médico</th>
                      <th>Motivo</th>
                      <th>Status</th>
                      <th>Check-in</th>
                      <th aria-label="Ações" />
                    </tr>
                  </thead>
                  <tbody>
                    {consultasFiltradas.map((consulta) => (
                      <tr key={consulta.id}>
                        <td>
                          <div className="appointments-date-cell">
                            <span>
                              <FaCalendarAlt />
                            </span>
                            <div>
                              <strong>{formatDate(consulta.data_consulta)}</strong>
                              <small>
                                <FaClock />
                                {formatTime(consulta.hora_consulta)}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="appointments-person">
                            <span className="appointments-person__icon appointments-person__icon--patient">
                              <FaUserInjured />
                            </span>
                            <div>
                              <strong>{consulta.paciente_nome || 'Paciente'}</strong>
                              <small>Paciente</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="appointments-person">
                            <span className="appointments-person__icon">
                              <FaUserMd />
                            </span>
                            <div>
                              <strong>{consulta.medico_nome || 'Médico'}</strong>
                              <small>Profissional responsável</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="appointments-reason">
                            {consulta.motivo || 'Não informado'}
                          </span>
                        </td>
                        <td>{renderStatus(consulta.status)}</td>
                        <td>{renderCheckIn(consulta)}</td>
                        <td>{renderActions(consulta)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              <div className="appointments-mobile-list">
                {consultasFiltradas.map((consulta) => {
                  const dateBadge = getDateBadge(consulta.data_consulta)

                  return (
                    <article className="appointment-mobile-card" key={consulta.id}>
                      <header>
                        <div className="appointment-mobile-card__date">
                          <strong>{dateBadge.day}</strong>
                          <span>{dateBadge.month}</span>
                        </div>
                        <div className="appointment-mobile-card__heading">
                          <strong>{formatTime(consulta.hora_consulta)}</strong>
                          <span>{formatLongDate(consulta.data_consulta)}</span>
                        </div>
                        {renderStatus(consulta.status)}
                      </header>

                      <div className="appointment-mobile-card__people">
                        <div>
                          <span className="appointments-person__icon appointments-person__icon--patient">
                            <FaUserInjured />
                          </span>
                          <div>
                            <small>Paciente</small>
                            <strong>{consulta.paciente_nome || 'Paciente'}</strong>
                          </div>
                        </div>
                        <div>
                          <span className="appointments-person__icon">
                            <FaUserMd />
                          </span>
                          <div>
                            <small>Médico</small>
                            <strong>{consulta.medico_nome || 'Médico'}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="appointment-mobile-card__reason">
                        <small>Motivo</small>
                        <p>{consulta.motivo || 'Não informado'}</p>
                      </div>

                      <footer>
                        {renderCheckIn(consulta)}
                        {renderActions(consulta)}
                      </footer>
                    </article>
                  )
                })}
              </div>
            </>
          )}
        </section>
      </div>

      <Modal
        show={showModal}
        onHide={fecharModalCadastro}
        centered
        size="lg"
        dialogClassName="appointments-form-modal"
      >
        <Modal.Header closeButton={!salvando}>
          <div className="appointments-modal-title">
            <span>
              <FaCalendarCheck />
            </span>
            <div>
              <Modal.Title>Agendar consulta</Modal.Title>
              <p>Selecione o paciente, o profissional e um horário disponível.</p>
            </div>
          </div>
        </Modal.Header>

        <Form onSubmit={handleCadastrarConsulta}>
          <Modal.Body>
            {erroCadastro && (
              <Alert variant="danger" className="appointments-modal-alert">
                {erroCadastro}
              </Alert>
            )}

            <div className="appointments-form-grid">
              <Form.Group className="appointments-form-group">
                <Form.Label>Paciente</Form.Label>
                {perfil === 'PACIENTE' ? (
                  <Form.Control
                    type="text"
                    value={user?.nome || ''}
                    readOnly
                    disabled
                  />
                ) : (
                  <Form.Select
                    name="paciente_id"
                    value={formData.paciente_id}
                    onChange={handleChange}
                    required
                    disabled={salvando}
                  >
                    <option value="">Selecione um paciente</option>
                    {pacientes.map((paciente) => (
                      <option key={paciente.id} value={paciente.id}>
                        {paciente.nome}
                      </option>
                    ))}
                  </Form.Select>
                )}
              </Form.Group>

              <Form.Group className="appointments-form-group">
                <Form.Label>Médico</Form.Label>
                <Form.Select
                  name="medico_id"
                  value={formData.medico_id}
                  onChange={handleChange}
                  required
                  disabled={salvando}
                >
                  <option value="">Selecione um médico</option>
                  {medicos.map((medico) => (
                    <option key={medico.id} value={medico.id}>
                      {medico.nome} — {medico.especialidade}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="appointments-form-group appointments-form-group--full">
                <Form.Label>Horário disponível</Form.Label>
                <Form.Select
                  name="agenda_id"
                  value={formData.agenda_id}
                  onChange={handleSelecionarAgenda}
                  required
                  disabled={!formData.medico_id || salvando}
                >
                  <option value="">
                    {formData.medico_id
                      ? 'Selecione uma data e horário'
                      : 'Selecione primeiro o médico'}
                  </option>
                  {agendasDisponiveisDoMedico.map((agenda) => (
                    <option key={agenda.id} value={agenda.id}>
                      {formatDate(agenda.data_agenda)} —{' '}
                      {formatTime(agenda.hora_inicio)} às {formatTime(agenda.hora_fim)}
                    </option>
                  ))}
                </Form.Select>
                {formData.medico_id && agendasDisponiveisDoMedico.length === 0 && (
                  <Form.Text>Nenhum horário disponível para este médico.</Form.Text>
                )}
              </Form.Group>
            </div>

            <div className="appointments-selected-slot">
              <span>
                <FaCalendarAlt />
                <small>Data selecionada</small>
                <strong>{formatDate(formData.data_consulta)}</strong>
              </span>
              <span>
                <FaClock />
                <small>Horário</small>
                <strong>{formatTime(formData.hora_consulta)}</strong>
              </span>
            </div>

            <div className="appointments-form-grid">
              <Form.Group className="appointments-form-group appointments-form-group--full">
                <Form.Label>Motivo da consulta</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="motivo"
                  value={formData.motivo}
                  onChange={handleChange}
                  placeholder="Descreva brevemente o motivo do atendimento"
                  disabled={salvando}
                />
              </Form.Group>

              <Form.Group className="appointments-form-group appointments-form-group--full">
                <Form.Label>Observações</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  name="observacoes"
                  value={formData.observacoes}
                  onChange={handleChange}
                  placeholder="Informações adicionais para a equipe"
                  disabled={salvando}
                />
              </Form.Group>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="light" onClick={fecharModalCadastro} disabled={salvando}>
              Cancelar
            </Button>
            <Button
              className="appointments-primary-button"
              type="submit"
              disabled={salvando}
            >
              {salvando ? (
                <>
                  <Spinner animation="border" size="sm" />
                  Agendando...
                </>
              ) : (
                <>
                  <FaCheckCircle />
                  Confirmar agendamento
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal
        show={showStatusModal}
        onHide={fecharModalStatus}
        centered
        dialogClassName="appointments-status-modal"
      >
        <Modal.Header closeButton={!atualizando}>
          <div className="appointments-modal-title">
            <span
              className={
                perfil === 'PACIENTE' ? 'appointments-modal-title__danger' : ''
              }
            >
              {perfil === 'PACIENTE' ? <FaTimesCircle /> : <FaPen />}
            </span>
            <div>
              <Modal.Title>
                {perfil === 'PACIENTE' ? 'Cancelar consulta' : 'Atualizar consulta'}
              </Modal.Title>
              <p>
                {perfil === 'PACIENTE'
                  ? 'Confirme o cancelamento do seu atendimento.'
                  : 'Altere o status e registre uma observação.'}
              </p>
            </div>
          </div>
        </Modal.Header>

        <Form onSubmit={handleAtualizarStatus}>
          <Modal.Body>
            {erroStatus && (
              <Alert variant="danger" className="appointments-modal-alert">
                {erroStatus}
              </Alert>
            )}

            {consultaSelecionada && (
              <div className="appointments-status-summary">
                <div>
                  <FaCalendarAlt />
                  <span>
                    <small>Data</small>
                    <strong>{formatDate(consultaSelecionada.data_consulta)}</strong>
                  </span>
                </div>
                <div>
                  <FaClock />
                  <span>
                    <small>Horário</small>
                    <strong>{formatTime(consultaSelecionada.hora_consulta)}</strong>
                  </span>
                </div>
              </div>
            )}

            <Form.Group className="appointments-form-group">
              <Form.Label>Status</Form.Label>
              {perfil === 'PACIENTE' ? (
                <Form.Control value="Cancelada" readOnly disabled />
              ) : (
                <Form.Select
                  name="status"
                  value={statusData.status}
                  onChange={(event) =>
                    setStatusData((current) => ({
                      ...current,
                      status: event.target.value
                    }))
                  }
                  required
                  disabled={atualizando}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </Form.Select>
              )}
            </Form.Group>

            <Form.Group className="appointments-form-group">
              <Form.Label>Observações</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="observacoes"
                value={statusData.observacoes}
                onChange={(event) =>
                  setStatusData((current) => ({
                    ...current,
                    observacoes: event.target.value
                  }))
                }
                placeholder="Registre informações sobre esta alteração"
                disabled={atualizando}
              />
            </Form.Group>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="light" onClick={fecharModalStatus} disabled={atualizando}>
              Voltar
            </Button>
            <Button
              className={
                perfil === 'PACIENTE'
                  ? 'appointments-danger-button'
                  : 'appointments-primary-button'
              }
              type="submit"
              disabled={atualizando}
            >
              {atualizando ? (
                <>
                  <Spinner animation="border" size="sm" />
                  Salvando...
                </>
              ) : perfil === 'PACIENTE' ? (
                <>
                  <FaTimesCircle />
                  Confirmar cancelamento
                </>
              ) : (
                <>
                  <FaCheckCircle />
                  Salvar alteração
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal
        show={Boolean(consultaParaExcluir)}
        onHide={fecharConfirmacaoExclusao}
        centered
        dialogClassName="appointments-delete-modal"
      >
        <Modal.Body>
          <span className="appointments-delete-modal__icon">
            <FaTrash />
          </span>
          <h3>Excluir esta consulta?</h3>
          <p>
            A consulta de <strong>{consultaParaExcluir?.paciente_nome}</strong> com{' '}
            <strong>{consultaParaExcluir?.medico_nome}</strong> será removida
            permanentemente.
          </p>

          {erroExclusao && (
            <Alert variant="danger" className="appointments-modal-alert">
              {erroExclusao}
            </Alert>
          )}

          <div className="appointments-delete-modal__actions">
            <Button
              variant="light"
              onClick={fecharConfirmacaoExclusao}
              disabled={excluindo}
            >
              Manter consulta
            </Button>
            <Button variant="danger" onClick={confirmarExclusao} disabled={excluindo}>
              {excluindo ? (
                <>
                  <Spinner animation="border" size="sm" />
                  Excluindo...
                </>
              ) : (
                <>
                  <FaTrash />
                  Excluir consulta
                </>
              )}
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </MainLayout>
  )
}

export default ConsultasPage
