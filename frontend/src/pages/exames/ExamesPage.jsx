import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'
import {
  FaCalendarAlt,
  FaCalendarCheck,
  FaCheckCircle,
  FaClipboardCheck,
  FaEdit,
  FaFileMedical,
  FaFilter,
  FaFlask,
  FaMicroscope,
  FaPlus,
  FaSearch,
  FaSyncAlt,
  FaTrash,
  FaUserInjured,
  FaUserMd
} from 'react-icons/fa'
import MainLayout from '../../components/layout/MainLayout'
import {
  listarExames,
  criarExame,
  atualizarExame,
  deletarExame
} from '../../services/exameService'
import { listarConsultas } from '../../services/consultaService'
import { useAuth } from '../../context/AuthContext'
import './ExamesPage.css'

const FORM_INICIAL = {
  id: null,
  consulta_id: '',
  paciente_id: '',
  medico_id: '',
  nome_exame: '',
  descricao: '',
  status: 'SOLICITADO',
  data_exame: '',
  resultado: '',
  observacoes: ''
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'SOLICITADO', label: 'Solicitado' },
  { value: 'AGENDADO', label: 'Agendado' },
  { value: 'REALIZADO', label: 'Realizado' },
  { value: 'ENTREGUE', label: 'Entregue' },
  { value: 'CANCELADO', label: 'Cancelado' }
]

const STATUS_LABELS = {
  SOLICITADO: 'Solicitado',
  AGENDADO: 'Agendado',
  REALIZADO: 'Realizado',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado'
}

function parseLocalDate(value) {
  if (!value) return null

  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number)

  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function formatarData(value) {
  const date = parseLocalDate(value)

  if (!date) return 'Não agendado'
  return date.toLocaleDateString('pt-BR')
}

function obterIniciais(nome) {
  if (!nome) return '--'

  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()
}

function ExamesPage() {
  const { user } = useAuth()

  const [exames, setExames] = useState([])
  const [consultas, setConsultas] = useState([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erro, setErro] = useState('')
  const [erroModal, setErroModal] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [exameParaExcluir, setExameParaExcluir] = useState(null)
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')
  const [formData, setFormData] = useState(FORM_INICIAL)

  const perfil = user?.perfil
  const podeCriarExame = perfil === 'MEDICO'
  const podeEditarExame = perfil === 'MEDICO'
  const podeExcluirExame = perfil === 'SECRETARIO'
  const perfilLabel = {
    SECRETARIO: 'Secretário',
    MEDICO: 'Médico',
    PACIENTE: 'Paciente'
  }[perfil]

  const precisaResultado =
    formData.status === 'REALIZADO' || formData.status === 'ENTREGUE'

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true)
      setErro('')

      const [dadosExames, dadosConsultas] = await Promise.all([
        listarExames(),
        listarConsultas()
      ])

      setExames(Array.isArray(dadosExames) ? dadosExames : [])
      setConsultas(Array.isArray(dadosConsultas) ? dadosConsultas : [])
    } catch (error) {
      console.error('Erro ao carregar dados dos exames:', error)
      setErro(error.response?.data?.erro || 'Erro ao carregar exames.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  const consultaSelecionada = useMemo(
    () =>
      consultas.find(
        (consulta) => Number(consulta.id) === Number(formData.consulta_id)
      ),
    [consultas, formData.consulta_id]
  )

  const examesFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR')

    return exames.filter((exame) => {
      const correspondeStatus = !statusFiltro || exame.status === statusFiltro
      const textoBusca = [
        exame.id,
        exame.consulta_id,
        exame.nome_exame,
        exame.paciente_nome,
        exame.medico_nome,
        exame.status,
        STATUS_LABELS[exame.status],
        exame.resultado
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('pt-BR')
      const correspondeBusca = !termo || textoBusca.includes(termo)

      return correspondeStatus && correspondeBusca
    })
  }, [busca, exames, statusFiltro])

  const estatisticas = useMemo(
    () => ({
      total: exames.length,
      solicitados: exames.filter((item) => item.status === 'SOLICITADO').length,
      agendados: exames.filter((item) => item.status === 'AGENDADO').length,
      realizados: exames.filter((item) => item.status === 'REALIZADO').length,
      entregues: exames.filter((item) => item.status === 'ENTREGUE').length
    }),
    [exames]
  )

  const limparFormulario = () => {
    setFormData(FORM_INICIAL)
  }

  const abrirModalCadastro = () => {
    if (!podeCriarExame) {
      setErro('Você não tem permissão para cadastrar exame.')
      return
    }

    setModoEdicao(false)
    setErroModal('')
    limparFormulario()
    setShowModal(true)
  }

  const abrirModalEdicao = (exame) => {
    if (!podeEditarExame) {
      setErro('Você não tem permissão para editar exame.')
      return
    }

    setModoEdicao(true)
    setErroModal('')
    setFormData({
      id: exame.id,
      consulta_id: String(exame.consulta_id || ''),
      paciente_id: String(exame.paciente_id || ''),
      medico_id: String(exame.medico_id || ''),
      nome_exame: exame.nome_exame || '',
      descricao: exame.descricao || '',
      status: exame.status || 'SOLICITADO',
      data_exame: exame.data_exame ? exame.data_exame.slice(0, 10) : '',
      resultado: exame.resultado || '',
      observacoes: exame.observacoes || ''
    })
    setShowModal(true)
  }

  const fecharModal = () => {
    if (salvando) return

    setShowModal(false)
    setErroModal('')
    limparFormulario()
  }

  const handleChange = (event) => {
    const { name, value } = event.target

    setErroModal('')

    if (name === 'consulta_id') {
      const consulta = consultas.find(
        (item) => Number(item.id) === Number(value)
      )

      setFormData((prev) => ({
        ...prev,
        consulta_id: value,
        paciente_id: consulta ? String(consulta.paciente_id) : '',
        medico_id: consulta ? String(consulta.medico_id) : ''
      }))
      return
    }

    if (name === 'status') {
      setFormData((prev) => ({
        ...prev,
        status: value,
        resultado: ['REALIZADO', 'ENTREGUE'].includes(value)
          ? prev.resultado
          : ''
      }))
      return
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const salvarExame = async (event) => {
    event.preventDefault()

    if (modoEdicao && !podeEditarExame) {
      setErroModal('Você não tem permissão para editar exame.')
      return
    }

    if (!modoEdicao && !podeCriarExame) {
      setErroModal('Você não tem permissão para cadastrar exame.')
      return
    }

    if (
      !formData.consulta_id ||
      !formData.paciente_id ||
      !formData.medico_id ||
      !formData.nome_exame.trim()
    ) {
      setErroModal('Preencha a consulta e o nome do exame.')
      return
    }

    if (precisaResultado && !formData.resultado.trim()) {
      setErroModal(
        'O resultado é obrigatório para exames realizados ou entregues.'
      )
      return
    }

    try {
      setSalvando(true)
      setErroModal('')
      setErro('')
      setSucesso('')

      const payload = {
        consulta_id: Number(formData.consulta_id),
        paciente_id: Number(formData.paciente_id),
        medico_id: Number(formData.medico_id),
        nome_exame: formData.nome_exame.trim(),
        descricao: formData.descricao,
        status: formData.status,
        data_exame: formData.data_exame || null,
        resultado: formData.resultado,
        observacoes: formData.observacoes
      }

      if (modoEdicao) {
        await atualizarExame(formData.id, {
          nome_exame: payload.nome_exame,
          descricao: payload.descricao,
          status: payload.status,
          data_exame: payload.data_exame,
          resultado: payload.resultado,
          observacoes: payload.observacoes
        })
        setSucesso('Exame atualizado com sucesso.')
      } else {
        await criarExame(payload)
        setSucesso('Exame cadastrado com sucesso.')
      }

      setShowModal(false)
      limparFormulario()
      await carregarDados()
    } catch (error) {
      console.error('Erro ao salvar exame:', error)
      setErroModal(error.response?.data?.erro || 'Erro ao salvar exame.')
    } finally {
      setSalvando(false)
    }
  }

  const abrirExclusao = (exame) => {
    if (!podeExcluirExame) {
      setErro('Você não tem permissão para excluir exame.')
      return
    }

    setExameParaExcluir(exame)
    setShowDeleteModal(true)
  }

  const fecharExclusao = () => {
    if (excluindo) return

    setShowDeleteModal(false)
    setExameParaExcluir(null)
  }

  const confirmarExclusao = async () => {
    if (!exameParaExcluir) return

    try {
      setExcluindo(true)
      setErro('')
      setSucesso('')

      await deletarExame(exameParaExcluir.id)
      setSucesso('Exame excluído com sucesso.')
      setShowDeleteModal(false)
      setExameParaExcluir(null)
      await carregarDados()
    } catch (error) {
      console.error('Erro ao excluir exame:', error)
      setErro(error.response?.data?.erro || 'Erro ao excluir exame.')
    } finally {
      setExcluindo(false)
    }
  }

  const renderStatus = (status) => (
    <span className={`exams-status exams-status--${status?.toLowerCase()}`}>
      <span />
      {STATUS_LABELS[status] || status || 'Sem status'}
    </span>
  )

  const renderAcoes = (exame) => {
    if (!podeEditarExame && !podeExcluirExame) {
      return <span className="exams-readonly">Somente visualização</span>
    }

    return (
      <div className="exams-actions">
        {podeEditarExame && (
          <button
            type="button"
            className="exams-action exams-action--edit"
            onClick={() => abrirModalEdicao(exame)}
            title="Editar exame"
            aria-label={`Editar ${exame.nome_exame}`}
          >
            <FaEdit />
          </button>
        )}

        {podeExcluirExame && (
          <button
            type="button"
            className="exams-action exams-action--delete"
            onClick={() => abrirExclusao(exame)}
            title="Excluir exame"
            aria-label={`Excluir ${exame.nome_exame}`}
          >
            <FaTrash />
          </button>
        )}
      </div>
    )
  }

  return (
    <MainLayout>
      <div className="exams-page">
        <section className="exams-hero">
          <div className="exams-hero__content">
            <span className="exams-hero__eyebrow">
              <FaMicroscope />
              Acompanhamento diagnóstico
            </span>
            <h1>
              Exames organizados, resultados <span>sempre acessíveis</span>
            </h1>
            <p>
              Acompanhe solicitações, agendamentos e resultados em uma visão
              simples para toda a jornada do paciente.
            </p>
          </div>

          <div className="exams-hero__actions">
            <div className="exams-hero__profile">
              <span>
                <FaFileMedical />
              </span>
              <div>
                <small>Visualização atual</small>
                <strong>{perfilLabel || 'Usuário'}</strong>
              </div>
            </div>

            {podeCriarExame && (
              <Button className="exams-add-button" onClick={abrirModalCadastro}>
                <FaPlus />
                Novo exame
              </Button>
            )}
          </div>

          <FaFlask className="exams-hero__decoration" aria-hidden="true" />
        </section>

        {erro && (
          <Alert
            variant="danger"
            className="exams-feedback"
            dismissible
            onClose={() => setErro('')}
          >
            {erro}
          </Alert>
        )}

        {sucesso && (
          <Alert
            variant="success"
            className="exams-feedback"
            dismissible
            onClose={() => setSucesso('')}
          >
            {sucesso}
          </Alert>
        )}

        <section className="exams-stats" aria-label="Resumo dos exames">
          <article className="exams-stat exams-stat--blue">
            <span className="exams-stat__icon">
              <FaFlask />
            </span>
            <span>
              <small>Total de exames</small>
              <strong>{estatisticas.total}</strong>
              <p>Registros disponíveis</p>
            </span>
          </article>

          <article className="exams-stat exams-stat--slate">
            <span className="exams-stat__icon">
              <FaClipboardCheck />
            </span>
            <span>
              <small>Solicitados</small>
              <strong>{estatisticas.solicitados}</strong>
              <p>Aguardando agendamento</p>
            </span>
          </article>

          <article className="exams-stat exams-stat--amber">
            <span className="exams-stat__icon">
              <FaCalendarCheck />
            </span>
            <span>
              <small>Agendados</small>
              <strong>{estatisticas.agendados}</strong>
              <p>Com data programada</p>
            </span>
          </article>

          <article className="exams-stat exams-stat--violet">
            <span className="exams-stat__icon">
              <FaMicroscope />
            </span>
            <span>
              <small>Realizados</small>
              <strong>{estatisticas.realizados}</strong>
              <p>Com resultado registrado</p>
            </span>
          </article>

          <article className="exams-stat exams-stat--green">
            <span className="exams-stat__icon">
              <FaCheckCircle />
            </span>
            <span>
              <small>Entregues</small>
              <strong>{estatisticas.entregues}</strong>
              <p>Resultados disponibilizados</p>
            </span>
          </article>
        </section>

        <section className="exams-workspace">
          <div className="exams-workspace__header">
            <div className="exams-workspace__title">
              <span className="exams-workspace__icon">
                <FaFlask />
              </span>
              <div>
                <span>Central de exames</span>
                <h2>Exames dos pacientes</h2>
                <p>
                  {examesFiltrados.length}{' '}
                  {examesFiltrados.length === 1 ? 'registro exibido' : 'registros exibidos'}
                </p>
              </div>
            </div>

            <div className="exams-toolbar">
              <div className="exams-search">
                <FaSearch />
                <Form.Control
                  type="search"
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar exame ou paciente..."
                  aria-label="Buscar exames"
                />
              </div>

              <div className="exams-status-filter">
                <FaFilter />
                <Form.Select
                  value={statusFiltro}
                  onChange={(event) => setStatusFiltro(event.target.value)}
                  aria-label="Filtrar exames por status"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </Form.Select>
              </div>

              <button
                type="button"
                className="exams-refresh"
                onClick={carregarDados}
                disabled={loading}
                aria-label="Atualizar exames"
                title="Atualizar exames"
              >
                <FaSyncAlt className={loading ? 'is-spinning' : ''} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="exams-loading">
              <div className="exams-loading__icon">
                <Spinner animation="border" />
              </div>
              <strong>Carregando exames</strong>
              <p>Estamos organizando as solicitações e os resultados.</p>
            </div>
          ) : examesFiltrados.length > 0 ? (
            <>
              <div className="exams-table-wrap">
                <table className="exams-table">
                  <thead>
                    <tr>
                      <th>Exame</th>
                      <th>Paciente</th>
                      <th>Médico</th>
                      <th>Data</th>
                      <th>Status</th>
                      <th>Resultado</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examesFiltrados.map((exame) => (
                      <tr key={exame.id}>
                        <td>
                          <div className="exams-name">
                            <span>
                              <FaFlask />
                            </span>
                            <div>
                              <strong>{exame.nome_exame || 'Exame sem nome'}</strong>
                              <small>
                                Exame #{exame.id} · Consulta #{exame.consulta_id}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="exams-person">
                            <span className="exams-avatar exams-avatar--patient">
                              {obterIniciais(exame.paciente_nome)}
                            </span>
                            <strong>{exame.paciente_nome || 'Não informado'}</strong>
                          </div>
                        </td>
                        <td>
                          <div className="exams-person">
                            <span className="exams-avatar exams-avatar--doctor">
                              {obterIniciais(exame.medico_nome)}
                            </span>
                            <strong>{exame.medico_nome || 'Não informado'}</strong>
                          </div>
                        </td>
                        <td>
                          <div className="exams-date">
                            <FaCalendarAlt />
                            {formatarData(exame.data_exame)}
                          </div>
                        </td>
                        <td>{renderStatus(exame.status)}</td>
                        <td>
                          {exame.resultado ? (
                            <span
                              className="exams-result exams-result--available"
                              title={exame.resultado}
                            >
                              <FaFileMedical />
                              {exame.resultado}
                            </span>
                          ) : (
                            <span className="exams-result">
                              <FaFileMedical />
                              Sem resultado
                            </span>
                          )}
                        </td>
                        <td>{renderAcoes(exame)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="exams-mobile-list">
                {examesFiltrados.map((exame) => (
                  <article key={exame.id} className="exams-mobile-card">
                    <div className="exams-mobile-card__header">
                      <div className="exams-name">
                        <span>
                          <FaFlask />
                        </span>
                        <div>
                          <strong>{exame.nome_exame || 'Exame sem nome'}</strong>
                          <small>
                            Exame #{exame.id} · Consulta #{exame.consulta_id}
                          </small>
                        </div>
                      </div>
                      {renderStatus(exame.status)}
                    </div>

                    <div className="exams-mobile-card__details">
                      <div>
                        <span>Paciente</span>
                        <strong>{exame.paciente_nome || 'Não informado'}</strong>
                      </div>
                      <div>
                        <span>Médico</span>
                        <strong>{exame.medico_nome || 'Não informado'}</strong>
                      </div>
                      <div>
                        <span>Data do exame</span>
                        <strong>{formatarData(exame.data_exame)}</strong>
                      </div>
                    </div>

                    <div className="exams-mobile-card__result">
                      <span>Resultado</span>
                      <p>{exame.resultado || 'Ainda não informado'}</p>
                    </div>

                    <div className="exams-mobile-card__footer">
                      {renderAcoes(exame)}
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="exams-empty">
              {busca || statusFiltro ? <FaSearch /> : <FaFlask />}
              <h3>
                {busca || statusFiltro
                  ? 'Nenhum exame encontrado'
                  : 'Nenhum exame cadastrado'}
              </h3>
              <p>
                {busca || statusFiltro
                  ? 'Ajuste a busca ou o filtro para visualizar outros exames.'
                  : 'Os exames cadastrados aparecerão aqui para acompanhamento.'}
              </p>
              {busca || statusFiltro ? (
                <Button
                  variant="light"
                  onClick={() => {
                    setBusca('')
                    setStatusFiltro('')
                  }}
                >
                  Limpar filtros
                </Button>
              ) : (
                podeCriarExame && (
                  <Button className="exams-empty__button" onClick={abrirModalCadastro}>
                    <FaPlus />
                    Cadastrar exame
                  </Button>
                )
              )}
            </div>
          )}
        </section>
      </div>

      <Modal
        show={showModal}
        onHide={fecharModal}
        centered
        size="lg"
        dialogClassName="exams-form-modal"
      >
        <Form onSubmit={salvarExame}>
          <Modal.Header closeButton={!salvando}>
            <div className="exams-modal-heading">
              <span>
                {modoEdicao ? <FaEdit /> : <FaFlask />}
              </span>
              <div>
                <small>{modoEdicao ? 'Atualização de registro' : 'Nova solicitação'}</small>
                <Modal.Title>
                  {modoEdicao ? 'Editar exame' : 'Cadastrar exame'}
                </Modal.Title>
                <p>
                  {modoEdicao
                    ? 'Atualize o andamento e as informações do exame.'
                    : 'Vincule o exame a uma consulta existente.'}
                </p>
              </div>
            </div>
          </Modal.Header>

          <Modal.Body>
            {erroModal && (
              <Alert variant="danger" className="exams-modal-alert">
                {erroModal}
              </Alert>
            )}

            {!modoEdicao && (
              <>
                <div className="exams-modal-section-title">
                  <FaCalendarCheck />
                  Vínculo com a consulta
                </div>

                <Form.Group className="exams-modal-field">
                  <Form.Label>
                    Consulta <span>*</span>
                  </Form.Label>
                  <Form.Select
                    name="consulta_id"
                    value={formData.consulta_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Selecione uma consulta</option>
                    {consultas.map((consulta) => (
                      <option key={consulta.id} value={consulta.id}>
                        Consulta #{consulta.id} — {consulta.paciente_nome} /{' '}
                        {consulta.medico_nome}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                {consultaSelecionada && (
                  <div className="exams-consultation-summary">
                    <div>
                      <span>
                        <FaUserInjured />
                      </span>
                      <div>
                        <small>Paciente</small>
                        <strong>{consultaSelecionada.paciente_nome}</strong>
                      </div>
                    </div>
                    <div>
                      <span>
                        <FaUserMd />
                      </span>
                      <div>
                        <small>Médico</small>
                        <strong>{consultaSelecionada.medico_nome}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {modoEdicao && (
              <div className="exams-edit-context">
                <FaFileMedical />
                <div>
                  <small>Exame vinculado à consulta #{formData.consulta_id}</small>
                  <strong>{formData.nome_exame}</strong>
                </div>
              </div>
            )}

            <div className="exams-modal-section-title">
              <FaMicroscope />
              Informações do exame
            </div>

            <div className="exams-modal-grid">
              <Form.Group className="exams-modal-field">
                <Form.Label>
                  Nome do exame <span>*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="nome_exame"
                  value={formData.nome_exame}
                  onChange={handleChange}
                  placeholder="Ex.: Hemograma completo"
                  required
                />
              </Form.Group>

              <Form.Group className="exams-modal-field">
                <Form.Label>Data do exame</Form.Label>
                <div className="exams-modal-date">
                  <FaCalendarAlt />
                  <Form.Control
                    type="date"
                    name="data_exame"
                    value={formData.data_exame}
                    onChange={handleChange}
                  />
                </div>
              </Form.Group>

              <Form.Group className="exams-modal-field">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  {STATUS_OPTIONS.filter((status) => status.value).map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="exams-modal-field">
                <Form.Label>Descrição</Form.Label>
                <Form.Control
                  type="text"
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleChange}
                  placeholder="Descrição do exame"
                />
              </Form.Group>
            </div>

            <div className="exams-modal-section-title">
              <FaFileMedical />
              Resultado e observações
            </div>

            <Form.Group className="exams-modal-field">
              <Form.Label>
                Resultado {precisaResultado && <span>*</span>}
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="resultado"
                value={formData.resultado}
                onChange={handleChange}
                placeholder={
                  precisaResultado
                    ? 'Digite o resultado do exame'
                    : 'Disponível quando o exame for realizado ou entregue'
                }
                disabled={!precisaResultado}
                required={precisaResultado}
              />
              {!precisaResultado && (
                <Form.Text>
                  O resultado é habilitado nos status Realizado e Entregue.
                </Form.Text>
              )}
            </Form.Group>

            <Form.Group className="exams-modal-field exams-modal-field--spaced">
              <Form.Label>Observações</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="observacoes"
                value={formData.observacoes}
                onChange={handleChange}
                placeholder="Observações adicionais"
              />
            </Form.Group>
          </Modal.Body>

          <Modal.Footer>
            <Button
              type="button"
              variant="light"
              onClick={fecharModal}
              disabled={salvando}
            >
              Cancelar
            </Button>
            <Button type="submit" className="exams-modal-submit" disabled={salvando}>
              {salvando ? (
                <>
                  <Spinner animation="border" size="sm" />
                  Salvando
                </>
              ) : (
                <>
                  {modoEdicao ? <FaCheckCircle /> : <FaPlus />}
                  {modoEdicao ? 'Salvar alterações' : 'Cadastrar exame'}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal
        show={showDeleteModal}
        onHide={fecharExclusao}
        centered
        dialogClassName="exams-delete-modal"
      >
        <Modal.Body>
          <div className="exams-delete-modal__icon">
            <FaTrash />
          </div>
          <h2>Excluir exame?</h2>
          <p>
            O exame <strong>{exameParaExcluir?.nome_exame}</strong> será removido
            permanentemente. Essa ação não poderá ser desfeita.
          </p>
          <div className="exams-delete-modal__actions">
            <Button variant="light" onClick={fecharExclusao} disabled={excluindo}>
              Manter exame
            </Button>
            <Button variant="danger" onClick={confirmarExclusao} disabled={excluindo}>
              {excluindo ? (
                <>
                  <Spinner animation="border" size="sm" />
                  Excluindo
                </>
              ) : (
                <>
                  <FaTrash />
                  Excluir
                </>
              )}
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </MainLayout>
  )
}

export default ExamesPage
