import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronRight,
  FaClock,
  FaPen,
  FaPlus,
  FaRegCalendarCheck,
  FaSearch,
  FaTimes,
  FaTrash,
  FaUserMd
} from 'react-icons/fa'
import MainLayout from '../../components/layout/MainLayout'
import {
  atualizarAgenda,
  criarAgenda,
  excluirAgenda,
  listarAgendas
} from '../../services/agendaService'
import { listarMedicos } from '../../services/medicosService'
import { useAuth } from '../../context/AuthContext'
import './AgendaPage.css'

const STATUS = {
  AVAILABLE: 'Disponível',
  OCCUPIED: 'Ocupado'
}

function parseLocalDate(date) {
  if (!date) return null

  const [year, month, day] = date.slice(0, 10).split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatFullDate(date) {
  const parsedDate = parseLocalDate(date)

  if (!parsedDate) return ''

  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
    .format(parsedDate)
    .replace('.', '')
}

function getDateBadge(date) {
  const parsedDate = parseLocalDate(date)

  if (!parsedDate) {
    return { day: '--', month: '---' }
  }

  return {
    day: String(parsedDate.getDate()).padStart(2, '0'),
    month: new Intl.DateTimeFormat('pt-BR', { month: 'short' })
      .format(parsedDate)
      .replace('.', '')
      .toUpperCase()
  }
}

function getInitials(name) {
  if (!name) return 'MD'

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function groupSchedulesByDoctor(schedules) {
  const grouped = new Map()

  schedules.forEach((schedule) => {
    if (!grouped.has(schedule.medico_id)) {
      grouped.set(schedule.medico_id, {
        id: schedule.medico_id,
        medico: schedule.medico_nome,
        especialidade: schedule.especialidade,
        horarios: []
      })
    }

    grouped.get(schedule.medico_id).horarios.push({
      id: schedule.id,
      medico_id: schedule.medico_id,
      data: schedule.data_agenda,
      hora: schedule.hora_inicio?.slice(0, 5),
      horaFim: schedule.hora_fim?.slice(0, 5),
      status: schedule.disponivel ? STATUS.AVAILABLE : STATUS.OCCUPIED,
      disponivel: schedule.disponivel,
      observacao: schedule.observacao || ''
    })
  })

  return Array.from(grouped.values())
    .map((doctor) => ({
      ...doctor,
      horarios: doctor.horarios.sort((first, second) =>
        `${first.data} ${first.hora}`.localeCompare(`${second.data} ${second.hora}`)
      )
    }))
    .sort((first, second) => first.medico.localeCompare(second.medico, 'pt-BR'))
}

function AgendaPage() {
  const { user } = useAuth()

  const [agendaMedicos, setAgendaMedicos] = useState([])
  const [medicos, setMedicos] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)

  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('TODOS')
  const [filtroData, setFiltroData] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [agendaSelecionada, setAgendaSelecionada] = useState(null)
  const [agendaParaExcluir, setAgendaParaExcluir] = useState(null)

  const [formData, setFormData] = useState({
    medico_id: '',
    data_agenda: '',
    hora_inicio: '',
    hora_fim: '',
    disponivel: true,
    observacao: ''
  })

  const perfil = user?.perfil
  const podeGerenciarAgenda = perfil === 'SECRETARIO'

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true)
      setErro('')

      const [dadosAgendas, dadosMedicos] = await Promise.all([
        listarAgendas(),
        listarMedicos()
      ])

      setMedicos(Array.isArray(dadosMedicos) ? dadosMedicos : [])
      setAgendaMedicos(
        groupSchedulesByDoctor(Array.isArray(dadosAgendas) ? dadosAgendas : [])
      )
    } catch (error) {
      setErro(error.response?.data?.erro || 'Erro ao carregar agenda.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  const todosHorarios = useMemo(
    () => agendaMedicos.flatMap((doctor) => doctor.horarios),
    [agendaMedicos]
  )

  const indicadores = useMemo(() => {
    const disponiveis = todosHorarios.filter((schedule) => schedule.disponivel).length
    const ocupados = todosHorarios.length - disponiveis

    return {
      medicos: agendaMedicos.length,
      horarios: todosHorarios.length,
      disponiveis,
      ocupados
    }
  }, [agendaMedicos.length, todosHorarios])

  const agendaFiltrada = useMemo(() => {
    const term = busca.trim().toLocaleLowerCase('pt-BR')

    return agendaMedicos
      .filter((doctor) => {
        if (!term) return true

        return (
          doctor.medico.toLocaleLowerCase('pt-BR').includes(term) ||
          doctor.especialidade.toLocaleLowerCase('pt-BR').includes(term)
        )
      })
      .map((doctor) => ({
        ...doctor,
        horarios: doctor.horarios.filter((schedule) => {
          const statusMatches =
            filtroStatus === 'TODOS' ||
            (filtroStatus === 'DISPONIVEL' && schedule.disponivel) ||
            (filtroStatus === 'OCUPADO' && !schedule.disponivel)
          const dateMatches =
            !filtroData || schedule.data?.slice(0, 10) === filtroData

          return statusMatches && dateMatches
        })
      }))
      .filter((doctor) => doctor.horarios.length > 0)
  }, [agendaMedicos, busca, filtroData, filtroStatus])

  const totalResultados = useMemo(
    () => agendaFiltrada.reduce((total, doctor) => total + doctor.horarios.length, 0),
    [agendaFiltrada]
  )

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
      medico_id: '',
      data_agenda: '',
      hora_inicio: '',
      hora_fim: '',
      disponivel: true,
      observacao: ''
    })
    setAgendaSelecionada(null)
    setModoEdicao(false)
  }

  const abrirModalCadastro = () => {
    if (!podeGerenciarAgenda) {
      setErro('Você não tem permissão para cadastrar agenda.')
      return
    }

    setErro('')
    limparFormulario()
    setShowModal(true)
  }

  const fecharModal = () => {
    if (salvando) return

    setShowModal(false)
    limparFormulario()
  }

  const abrirModalEdicao = (agenda) => {
    if (!podeGerenciarAgenda) {
      setErro('Você não tem permissão para editar agenda.')
      return
    }

    setErro('')
    setModoEdicao(true)
    setAgendaSelecionada(agenda)
    setFormData({
      medico_id: agenda.medico_id,
      data_agenda: agenda.data?.slice(0, 10),
      hora_inicio: agenda.hora,
      hora_fim: agenda.horaFim,
      disponivel: agenda.disponivel,
      observacao: agenda.observacao || ''
    })
    setShowModal(true)
  }

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target

    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!podeGerenciarAgenda) {
      setErro('Você não tem permissão para salvar agenda.')
      return
    }

    if (formData.hora_inicio >= formData.hora_fim) {
      setErro('A hora de fim deve ser maior que a hora de início.')
      return
    }

    try {
      setSalvando(true)
      setErro('')
      setSucesso('')

      if (modoEdicao && agendaSelecionada) {
        await atualizarAgenda(agendaSelecionada.id, {
          data_agenda: formData.data_agenda,
          hora_inicio: formData.hora_inicio,
          hora_fim: formData.hora_fim,
          disponivel: formData.disponivel,
          observacao: formData.observacao
        })
        setSucesso('Agenda atualizada com sucesso.')
      } else {
        await criarAgenda({
          medico_id: Number(formData.medico_id),
          data_agenda: formData.data_agenda,
          hora_inicio: formData.hora_inicio,
          hora_fim: formData.hora_fim,
          disponivel: formData.disponivel,
          observacao: formData.observacao
        })
        setSucesso('Agenda cadastrada com sucesso.')
      }

      setShowModal(false)
      limparFormulario()
      await carregarDados()
    } catch (error) {
      setErro(error.response?.data?.erro || 'Erro ao salvar agenda.')
    } finally {
      setSalvando(false)
    }
  }

  const confirmarExclusao = async () => {
    if (!agendaParaExcluir || !podeGerenciarAgenda) return

    try {
      setExcluindo(true)
      setErro('')
      setSucesso('')
      await excluirAgenda(agendaParaExcluir.id)
      setAgendaParaExcluir(null)
      setSucesso('Agenda excluída com sucesso.')
      await carregarDados()
    } catch (error) {
      setErro(error.response?.data?.erro || 'Erro ao excluir agenda.')
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <MainLayout>
      <div className="agenda-page">
        <section className="agenda-hero">
          <div className="agenda-hero__content">
            <span className="agenda-eyebrow">
              <FaRegCalendarCheck />
              Central de horários
            </span>
            <h1>Agenda médica</h1>
            <p>
              Acompanhe a disponibilidade da equipe e organize os atendimentos
              da clínica em um só lugar.
            </p>
          </div>

          {podeGerenciarAgenda && (
            <Button className="agenda-primary-button" onClick={abrirModalCadastro}>
              <FaPlus />
              Novo horário
            </Button>
          )}

          <div className="agenda-hero__decoration" aria-hidden="true">
            <FaCalendarAlt />
          </div>
        </section>

        <section className="agenda-stats" aria-label="Resumo da agenda">
          <article className="agenda-stat-card">
            <span className="agenda-stat-card__icon agenda-stat-card__icon--blue">
              <FaUserMd />
            </span>
            <div>
              <small>Profissionais</small>
              <strong>{indicadores.medicos}</strong>
              <span>com agenda cadastrada</span>
            </div>
          </article>

          <article className="agenda-stat-card">
            <span className="agenda-stat-card__icon agenda-stat-card__icon--violet">
              <FaClock />
            </span>
            <div>
              <small>Total de horários</small>
              <strong>{indicadores.horarios}</strong>
              <span>na agenda atual</span>
            </div>
          </article>

          <article className="agenda-stat-card">
            <span className="agenda-stat-card__icon agenda-stat-card__icon--green">
              <FaCheckCircle />
            </span>
            <div>
              <small>Disponíveis</small>
              <strong>{indicadores.disponiveis}</strong>
              <span>prontos para agendar</span>
            </div>
          </article>

          <article className="agenda-stat-card">
            <span className="agenda-stat-card__icon agenda-stat-card__icon--rose">
              <FaTimes />
            </span>
            <div>
              <small>Ocupados</small>
              <strong>{indicadores.ocupados}</strong>
              <span>horários reservados</span>
            </div>
          </article>
        </section>

        {erro && (
          <Alert
            variant="danger"
            dismissible
            onClose={() => setErro('')}
            className="agenda-feedback"
          >
            {erro}
          </Alert>
        )}

        {sucesso && (
          <Alert
            variant="success"
            dismissible
            onClose={() => setSucesso('')}
            className="agenda-feedback"
          >
            {sucesso}
          </Alert>
        )}

        <section className="agenda-toolbar">
          <div className="agenda-toolbar__heading">
            <div>
              <h2>Horários por médico</h2>
              <p>
                {loading
                  ? 'Atualizando agenda...'
                  : `${totalResultados} horário${totalResultados === 1 ? '' : 's'} encontrado${totalResultados === 1 ? '' : 's'}`}
              </p>
            </div>
          </div>

          <div className="agenda-filters">
            <div className="agenda-search">
              <FaSearch aria-hidden="true" />
              <input
                type="search"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar médico ou especialidade"
                aria-label="Buscar médico ou especialidade"
              />
            </div>

            <Form.Select
              value={filtroStatus}
              onChange={(event) => setFiltroStatus(event.target.value)}
              aria-label="Filtrar por disponibilidade"
              className="agenda-filter-select"
            >
              <option value="TODOS">Todos os status</option>
              <option value="DISPONIVEL">Disponíveis</option>
              <option value="OCUPADO">Ocupados</option>
            </Form.Select>

            <div className="agenda-date-filter">
              <FaCalendarAlt aria-hidden="true" />
              <input
                type="date"
                value={filtroData}
                onChange={(event) => setFiltroData(event.target.value)}
                aria-label="Filtrar por data"
              />
            </div>

            {filtrosAtivos && (
              <button className="agenda-clear-filters" type="button" onClick={limparFiltros}>
                Limpar filtros
              </button>
            )}
          </div>
        </section>

        {loading ? (
          <div className="agenda-loading">
            <Spinner animation="border" role="status" />
            <span>Organizando os horários...</span>
          </div>
        ) : agendaMedicos.length === 0 ? (
          <div className="agenda-empty">
            <span className="agenda-empty__icon">
              <FaCalendarAlt />
            </span>
            <h3>Nenhum horário cadastrado</h3>
            <p>Cadastre o primeiro horário para começar a organizar a agenda da clínica.</p>
            {podeGerenciarAgenda && (
              <Button className="agenda-primary-button" onClick={abrirModalCadastro}>
                <FaPlus />
                Cadastrar horário
              </Button>
            )}
          </div>
        ) : agendaFiltrada.length === 0 ? (
          <div className="agenda-empty agenda-empty--compact">
            <span className="agenda-empty__icon">
              <FaSearch />
            </span>
            <h3>Nenhum resultado encontrado</h3>
            <p>Tente alterar os filtros para visualizar outros horários.</p>
            <button type="button" className="agenda-clear-filters" onClick={limparFiltros}>
              Limpar filtros
            </button>
          </div>
        ) : (
          <section className="agenda-doctor-grid">
            {agendaFiltrada.map((doctor) => {
              const availableCount = doctor.horarios.filter(
                (schedule) => schedule.disponivel
              ).length

              return (
                <article className="agenda-doctor-card" key={doctor.id}>
                  <header className="agenda-doctor-card__header">
                    <div className="agenda-doctor-avatar">
                      {getInitials(doctor.medico)}
                      <span aria-hidden="true" />
                    </div>

                    <div className="agenda-doctor-card__identity">
                      <h3>{doctor.medico}</h3>
                      <p>{doctor.especialidade}</p>
                    </div>

                    <div className="agenda-doctor-card__summary">
                      <strong>{availableCount}</strong>
                      <span>livres</span>
                    </div>
                  </header>

                  <div className="agenda-schedule-list">
                    {doctor.horarios.map((schedule) => {
                      const dateBadge = getDateBadge(schedule.data)

                      return (
                        <div className="agenda-schedule" key={schedule.id}>
                          <div className="agenda-date-badge" aria-hidden="true">
                            <strong>{dateBadge.day}</strong>
                            <span>{dateBadge.month}</span>
                          </div>

                          <div className="agenda-schedule__details">
                            <div className="agenda-schedule__topline">
                              <span className="agenda-schedule__time">
                                <FaClock />
                                {schedule.hora} — {schedule.horaFim}
                              </span>
                              <span
                                className={`agenda-status agenda-status--${schedule.disponivel ? 'available' : 'occupied'}`}
                              >
                                <i aria-hidden="true" />
                                {schedule.status}
                              </span>
                            </div>

                            <span className="agenda-schedule__date">
                              {formatFullDate(schedule.data)}
                            </span>

                            {schedule.observacao && (
                              <p className="agenda-schedule__note">
                                {schedule.observacao}
                              </p>
                            )}
                          </div>

                          {podeGerenciarAgenda ? (
                            <div className="agenda-schedule__actions">
                              <button
                                type="button"
                                className="agenda-icon-button"
                                onClick={() => abrirModalEdicao(schedule)}
                                title="Editar horário"
                                aria-label={`Editar horário de ${doctor.medico}`}
                              >
                                <FaPen />
                              </button>
                              <button
                                type="button"
                                className="agenda-icon-button agenda-icon-button--danger"
                                onClick={() =>
                                  setAgendaParaExcluir({
                                    ...schedule,
                                    medico: doctor.medico
                                  })
                                }
                                title="Excluir horário"
                                aria-label={`Excluir horário de ${doctor.medico}`}
                              >
                                <FaTrash />
                              </button>
                            </div>
                          ) : (
                            <FaChevronRight className="agenda-schedule__chevron" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>

      <Modal
        show={showModal}
        onHide={fecharModal}
        centered
        size="lg"
        dialogClassName="agenda-form-modal"
      >
        <Modal.Header closeButton={!salvando}>
          <div className="agenda-modal-title">
            <span>
              <FaCalendarAlt />
            </span>
            <div>
              <Modal.Title>
                {modoEdicao ? 'Editar horário' : 'Novo horário'}
              </Modal.Title>
              <p>
                {modoEdicao
                  ? 'Atualize os dados e a disponibilidade deste horário.'
                  : 'Adicione uma nova disponibilidade à agenda médica.'}
              </p>
            </div>
          </div>
        </Modal.Header>

        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="agenda-form-group">
              <Form.Label>Médico responsável</Form.Label>
              <Form.Select
                name="medico_id"
                value={formData.medico_id}
                onChange={handleChange}
                required
                disabled={modoEdicao || salvando}
              >
                <option value="">Selecione um médico</option>
                {medicos.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.nome} — {doctor.especialidade}
                  </option>
                ))}
              </Form.Select>
              <Form.Text>O profissional não poderá ser alterado depois do cadastro.</Form.Text>
            </Form.Group>

            <div className="agenda-form-grid">
              <Form.Group className="agenda-form-group agenda-form-group--date">
                <Form.Label>Data do atendimento</Form.Label>
                <Form.Control
                  type="date"
                  name="data_agenda"
                  value={formData.data_agenda}
                  onChange={handleChange}
                  required
                  disabled={salvando}
                />
              </Form.Group>

              <Form.Group className="agenda-form-group">
                <Form.Label>Horário inicial</Form.Label>
                <Form.Control
                  type="time"
                  name="hora_inicio"
                  value={formData.hora_inicio}
                  onChange={handleChange}
                  required
                  disabled={salvando}
                />
              </Form.Group>

              <Form.Group className="agenda-form-group">
                <Form.Label>Horário final</Form.Label>
                <Form.Control
                  type="time"
                  name="hora_fim"
                  value={formData.hora_fim}
                  onChange={handleChange}
                  required
                  disabled={salvando}
                />
              </Form.Group>
            </div>

            <Form.Group className="agenda-form-group">
              <Form.Label>Observação</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="observacao"
                value={formData.observacao}
                onChange={handleChange}
                placeholder="Ex.: Atendimento presencial, encaixe ou orientação importante"
                disabled={salvando}
              />
            </Form.Group>

            <div className="agenda-availability-switch">
              <div>
                <strong>Horário disponível</strong>
                <span>Permite que este horário seja utilizado em novos agendamentos.</span>
              </div>
              <Form.Check
                type="switch"
                id="agenda-disponivel"
                name="disponivel"
                checked={formData.disponivel}
                onChange={handleChange}
                disabled={salvando}
                aria-label="Definir horário como disponível"
              />
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="light" onClick={fecharModal} disabled={salvando}>
              Cancelar
            </Button>
            <Button className="agenda-primary-button" type="submit" disabled={salvando}>
              {salvando ? (
                <>
                  <Spinner animation="border" size="sm" />
                  Salvando...
                </>
              ) : (
                <>
                  <FaCheckCircle />
                  {modoEdicao ? 'Salvar alterações' : 'Cadastrar horário'}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal
        show={Boolean(agendaParaExcluir)}
        onHide={() => !excluindo && setAgendaParaExcluir(null)}
        centered
        dialogClassName="agenda-delete-modal"
      >
        <Modal.Body>
          <span className="agenda-delete-modal__icon">
            <FaTrash />
          </span>
          <h3>Excluir este horário?</h3>
          <p>
            O horário de <strong>{agendaParaExcluir?.medico}</strong>, em{' '}
            <strong>{formatFullDate(agendaParaExcluir?.data)}</strong>, será
            removido permanentemente.
          </p>
          <div className="agenda-delete-modal__actions">
            <Button
              variant="light"
              onClick={() => setAgendaParaExcluir(null)}
              disabled={excluindo}
            >
              Manter horário
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
                  Excluir horário
                </>
              )}
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </MainLayout>
  )
}

export default AgendaPage
