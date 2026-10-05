import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'
import {
  FaBan,
  FaBell,
  FaCalendarAlt,
  FaCheck,
  FaCheckCircle,
  FaClock,
  FaFilter,
  FaHourglassHalf,
  FaPlus,
  FaSearch,
  FaStethoscope,
  FaSyncAlt,
  FaUserClock,
  FaUserInjured,
  FaUserMd,
  FaUsers
} from 'react-icons/fa'
import MainLayout from '../components/layout/MainLayout'
import { listarPacientes } from '../services/pacientesService'
import { listarMedicos } from '../services/medicosService'
import {
  adicionarListaEspera,
  cancelarItemListaEspera,
  chamarPacienteListaEspera,
  encerrarItemListaEspera,
  listarListaEspera
} from '../services/listaEsperaService'
import './ListaEspera.css'

const FORM_INICIAL = {
  paciente_id: '',
  medico_id: '',
  especialidade: '',
  data_desejada: ''
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'ATIVO', label: 'Aguardando' },
  { value: 'CHAMADO', label: 'Chamado' },
  { value: 'ENCERRADO', label: 'Encerrado' },
  { value: 'CANCELADO', label: 'Cancelado' }
]

const STATUS_LABELS = {
  ATIVO: 'Aguardando',
  CHAMADO: 'Chamado',
  ENCERRADO: 'Encerrado',
  CANCELADO: 'Cancelado'
}

function extrairLista(dados, chavePrincipal) {
  if (Array.isArray(dados)) return dados
  if (Array.isArray(dados?.[chavePrincipal])) return dados[chavePrincipal]
  if (Array.isArray(dados?.data)) return dados.data
  if (Array.isArray(dados?.items)) return dados.items
  return []
}

function nomePaciente(paciente) {
  return (
    paciente.nome ||
    paciente.paciente_nome ||
    paciente.usuario_nome ||
    paciente.nome_usuario ||
    paciente.nome_paciente ||
    `Paciente #${paciente.id}`
  )
}

function nomeMedico(medico) {
  return (
    medico.nome ||
    medico.medico_nome ||
    medico.usuario_nome ||
    medico.nome_usuario ||
    medico.nome_medico ||
    `Médico #${medico.id}`
  )
}

function obterEspecialidadeMedico(medico) {
  return (
    medico.especialidade ||
    medico.especialidade_medica ||
    medico.area ||
    medico.area_atuacao ||
    medico.crm_especialidade ||
    ''
  )
}

function parseLocalDate(value) {
  if (!value) return null

  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number)

  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function formatarData(value, fallback = 'Não informada') {
  const date = parseLocalDate(value)

  if (!date) return fallback
  return date.toLocaleDateString('pt-BR')
}

function formatarEntrada(value) {
  if (!value) return 'Data não informada'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Data não informada'

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
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

function ListaEspera() {
  const [lista, setLista] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [medicos, setMedicos] = useState([])
  const [formData, setFormData] = useState(FORM_INICIAL)

  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [acaoEmAndamento, setAcaoEmAndamento] = useState(null)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [erroModal, setErroModal] = useState('')
  const [mostrarModal, setMostrarModal] = useState(false)
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true)
      setErro('')

      const [dadosLista, dadosPacientes, dadosMedicos] = await Promise.all([
        listarListaEspera(),
        listarPacientes(),
        listarMedicos()
      ])

      setLista(extrairLista(dadosLista, 'lista'))
      setPacientes(extrairLista(dadosPacientes, 'pacientes'))
      setMedicos(extrairLista(dadosMedicos, 'medicos'))
    } catch (error) {
      console.error('Erro ao carregar a lista de espera:', error)
      setErro(error.response?.data?.erro || 'Erro ao carregar a lista de espera.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  const estatisticas = useMemo(
    () => ({
      total: lista.length,
      ativos: lista.filter((item) => item.status === 'ATIVO').length,
      chamados: lista.filter((item) => item.status === 'CHAMADO').length,
      encerrados: lista.filter((item) => item.status === 'ENCERRADO').length
    }),
    [lista]
  )

  const posicoesAtivas = useMemo(() => {
    const posicoes = new Map()
    let posicao = 0

    lista.forEach((item) => {
      if (item.status === 'ATIVO') {
        posicao += 1
        posicoes.set(item.id, posicao)
      }
    })

    return posicoes
  }, [lista])

  const listaFiltrada = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR')

    return lista.filter((item) => {
      const correspondeStatus = !statusFiltro || item.status === statusFiltro
      const textoBusca = [
        item.id,
        item.paciente_nome,
        item.medico_nome,
        item.especialidade,
        STATUS_LABELS[item.status],
        item.status
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('pt-BR')
      const correspondeBusca = !termo || textoBusca.includes(termo)

      return correspondeStatus && correspondeBusca
    })
  }, [busca, lista, statusFiltro])

  const abrirModal = () => {
    setFormData(FORM_INICIAL)
    setErroModal('')
    setMostrarModal(true)
  }

  const fecharModal = () => {
    if (salvando) return

    setMostrarModal(false)
    setErroModal('')
  }

  const handleFormChange = (event) => {
    const { name, value } = event.target

    setErroModal('')
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const selecionarMedico = (event) => {
    const medicoId = event.target.value
    const medicoSelecionado = medicos.find(
      (medico) => Number(medico.id) === Number(medicoId)
    )

    setErroModal('')
    setFormData((prev) => ({
      ...prev,
      medico_id: medicoId,
      especialidade: medicoSelecionado
        ? obterEspecialidadeMedico(medicoSelecionado)
        : ''
    }))
  }

  const cadastrarNaLista = async (event) => {
    event.preventDefault()

    if (!formData.paciente_id) {
      setErroModal('Selecione um paciente.')
      return
    }

    try {
      setSalvando(true)
      setErroModal('')
      setErro('')
      setMensagem('')

      const resultado = await adicionarListaEspera({
        paciente_id: Number(formData.paciente_id),
        medico_id: formData.medico_id ? Number(formData.medico_id) : null,
        especialidade: formData.especialidade || null,
        data_desejada: formData.data_desejada || null
      })

      setMensagem(
        resultado.mensagem || 'Paciente adicionado à lista de espera com sucesso!'
      )
      setMostrarModal(false)
      setFormData(FORM_INICIAL)
      await carregarDados()
    } catch (error) {
      console.error('Erro ao cadastrar na lista:', error)
      setErroModal(
        error.response?.data?.erro || 'Erro ao adicionar o paciente à lista.'
      )
    } finally {
      setSalvando(false)
    }
  }

  const alterarStatus = async (item, acao) => {
    try {
      setAcaoEmAndamento(`${item.id}-${acao}`)
      setMensagem('')
      setErro('')

      let resultado

      if (acao === 'chamar') {
        resultado = await chamarPacienteListaEspera(item.id)
      }

      if (acao === 'encerrar') {
        resultado = await encerrarItemListaEspera(item.id)
      }

      if (acao === 'cancelar') {
        resultado = await cancelarItemListaEspera(item.id)
      }

      setMensagem(resultado?.mensagem || 'Status atualizado com sucesso!')
      await carregarDados()
    } catch (error) {
      console.error('Erro ao alterar status:', error)
      setErro(error.response?.data?.erro || 'Erro ao atualizar o item.')
    } finally {
      setAcaoEmAndamento(null)
    }
  }

  const renderStatus = (status) => (
    <span className={`waiting-status waiting-status--${status?.toLowerCase()}`}>
      <span />
      {STATUS_LABELS[status] || status || 'Sem status'}
    </span>
  )

  const renderAcoes = (item) => {
    const podeChamar = item.status === 'ATIVO'
    const podeFinalizar = !['ENCERRADO', 'CANCELADO'].includes(item.status)

    return (
      <div className="waiting-actions">
        <button
          type="button"
          className="waiting-action waiting-action--call"
          onClick={() => alterarStatus(item, 'chamar')}
          disabled={!podeChamar || Boolean(acaoEmAndamento)}
          title="Chamar paciente"
        >
          {acaoEmAndamento === `${item.id}-chamar` ? (
            <Spinner animation="border" size="sm" />
          ) : (
            <FaBell />
          )}
          <span>Chamar</span>
        </button>

        <button
          type="button"
          className="waiting-action waiting-action--finish"
          onClick={() => alterarStatus(item, 'encerrar')}
          disabled={!podeFinalizar || Boolean(acaoEmAndamento)}
          title="Encerrar item"
        >
          {acaoEmAndamento === `${item.id}-encerrar` ? (
            <Spinner animation="border" size="sm" />
          ) : (
            <FaCheck />
          )}
          <span>Encerrar</span>
        </button>

        <button
          type="button"
          className="waiting-action waiting-action--cancel"
          onClick={() => alterarStatus(item, 'cancelar')}
          disabled={!podeFinalizar || Boolean(acaoEmAndamento)}
          title="Cancelar item"
        >
          {acaoEmAndamento === `${item.id}-cancelar` ? (
            <Spinner animation="border" size="sm" />
          ) : (
            <FaBan />
          )}
          <span>Cancelar</span>
        </button>
      </div>
    )
  }

  return (
    <MainLayout>
      <div className="waiting-page">
        <section className="waiting-hero">
          <div className="waiting-hero__content">
            <span className="waiting-hero__eyebrow">
              <FaUserClock />
              Organização de demanda
            </span>
            <h1>
              Uma fila mais clara, um atendimento <span>mais ágil</span>
            </h1>
            <p>
              Acompanhe quem aguarda disponibilidade, chame pacientes e mantenha
              cada etapa da lista de espera sob controle.
            </p>
          </div>

          <div className="waiting-hero__actions">
            <div className="waiting-hero__active">
              <span>
                <FaHourglassHalf />
              </span>
              <div>
                <small>Aguardando agora</small>
                <strong>{estatisticas.ativos} pacientes</strong>
              </div>
            </div>
            <Button className="waiting-add-button" onClick={abrirModal}>
              <FaPlus />
              Adicionar à fila
            </Button>
          </div>

          <FaUsers className="waiting-hero__decoration" aria-hidden="true" />
        </section>

        {mensagem && (
          <Alert
            variant="success"
            className="waiting-feedback"
            dismissible
            onClose={() => setMensagem('')}
          >
            {mensagem}
          </Alert>
        )}

        {erro && (
          <Alert
            variant="danger"
            className="waiting-feedback"
            dismissible
            onClose={() => setErro('')}
          >
            {erro}
          </Alert>
        )}

        <section className="waiting-stats" aria-label="Resumo da lista de espera">
          <article className="waiting-stat waiting-stat--blue">
            <span className="waiting-stat__icon">
              <FaUsers />
            </span>
            <span>
              <small>Total na lista</small>
              <strong>{estatisticas.total}</strong>
              <p>Todos os registros</p>
            </span>
          </article>

          <article className="waiting-stat waiting-stat--amber">
            <span className="waiting-stat__icon">
              <FaHourglassHalf />
            </span>
            <span>
              <small>Aguardando</small>
              <strong>{estatisticas.ativos}</strong>
              <p>Na fila de atendimento</p>
            </span>
          </article>

          <article className="waiting-stat waiting-stat--violet">
            <span className="waiting-stat__icon">
              <FaBell />
            </span>
            <span>
              <small>Chamados</small>
              <strong>{estatisticas.chamados}</strong>
              <p>Pacientes convocados</p>
            </span>
          </article>

          <article className="waiting-stat waiting-stat--green">
            <span className="waiting-stat__icon">
              <FaCheckCircle />
            </span>
            <span>
              <small>Encerrados</small>
              <strong>{estatisticas.encerrados}</strong>
              <p>Fluxos finalizados</p>
            </span>
          </article>
        </section>

        <section className="waiting-workspace">
          <div className="waiting-workspace__header">
            <div className="waiting-workspace__title">
              <span className="waiting-workspace__icon">
                <FaUserClock />
              </span>
              <div>
                <span>Fila de atendimento</span>
                <h2>Pacientes na lista de espera</h2>
                <p>
                  {listaFiltrada.length}{' '}
                  {listaFiltrada.length === 1 ? 'registro exibido' : 'registros exibidos'}
                </p>
              </div>
            </div>

            <div className="waiting-toolbar">
              <div className="waiting-search">
                <FaSearch />
                <Form.Control
                  type="search"
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar paciente ou médico..."
                  aria-label="Buscar na lista de espera"
                />
              </div>

              <div className="waiting-status-filter">
                <FaFilter />
                <Form.Select
                  value={statusFiltro}
                  onChange={(event) => setStatusFiltro(event.target.value)}
                  aria-label="Filtrar por status"
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
                className="waiting-refresh"
                onClick={carregarDados}
                disabled={loading}
                aria-label="Atualizar lista"
                title="Atualizar lista"
              >
                <FaSyncAlt className={loading ? 'is-spinning' : ''} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="waiting-loading">
              <div className="waiting-loading__icon">
                <Spinner animation="border" />
              </div>
              <strong>Organizando a fila</strong>
              <p>Estamos carregando os pacientes e as disponibilidades.</p>
            </div>
          ) : listaFiltrada.length > 0 ? (
            <>
              <div className="waiting-table-wrap">
                <table className="waiting-table">
                  <thead>
                    <tr>
                      <th>Posição</th>
                      <th>Paciente</th>
                      <th>Preferência médica</th>
                      <th>Data desejada</th>
                      <th>Entrada na fila</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listaFiltrada.map((item) => (
                      <tr key={item.id}>
                        <td>
                          {item.status === 'ATIVO' ? (
                            <span className="waiting-position">
                              {String(posicoesAtivas.get(item.id)).padStart(2, '0')}
                            </span>
                          ) : (
                            <span className="waiting-position is-inactive">—</span>
                          )}
                        </td>
                        <td>
                          <div className="waiting-person">
                            <span className="waiting-avatar">
                              {obterIniciais(item.paciente_nome)}
                            </span>
                            <span>
                              <strong>
                                {item.paciente_nome || `Paciente #${item.paciente_id}`}
                              </strong>
                              <small>Registro #{item.id}</small>
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="waiting-doctor">
                            <strong>{item.medico_nome || 'Sem médico definido'}</strong>
                            <span>
                              {item.especialidade || 'Especialidade não informada'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="waiting-date">
                            <FaCalendarAlt />
                            {formatarData(item.data_desejada)}
                          </div>
                        </td>
                        <td>
                          <div className="waiting-entry">
                            <FaClock />
                            {formatarEntrada(item.created_at)}
                          </div>
                        </td>
                        <td>{renderStatus(item.status)}</td>
                        <td>{renderAcoes(item)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="waiting-mobile-list">
                {listaFiltrada.map((item) => (
                  <article key={item.id} className="waiting-mobile-card">
                    <div className="waiting-mobile-card__header">
                      <div className="waiting-person">
                        <span className="waiting-avatar">
                          {obterIniciais(item.paciente_nome)}
                        </span>
                        <span>
                          <strong>
                            {item.paciente_nome || `Paciente #${item.paciente_id}`}
                          </strong>
                          <small>Registro #{item.id}</small>
                        </span>
                      </div>
                      {item.status === 'ATIVO' && (
                        <span className="waiting-mobile-card__position">
                          #{posicoesAtivas.get(item.id)} na fila
                        </span>
                      )}
                    </div>

                    <div className="waiting-mobile-card__status">
                      {renderStatus(item.status)}
                    </div>

                    <div className="waiting-mobile-card__details">
                      <div>
                        <span>Médico</span>
                        <strong>{item.medico_nome || 'Não informado'}</strong>
                      </div>
                      <div>
                        <span>Especialidade</span>
                        <strong>{item.especialidade || 'Não informada'}</strong>
                      </div>
                      <div>
                        <span>Data desejada</span>
                        <strong>{formatarData(item.data_desejada)}</strong>
                      </div>
                      <div>
                        <span>Entrada</span>
                        <strong>{formatarEntrada(item.created_at)}</strong>
                      </div>
                    </div>

                    {renderAcoes(item)}
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="waiting-empty">
              {busca || statusFiltro ? <FaSearch /> : <FaUserClock />}
              <h3>
                {busca || statusFiltro
                  ? 'Nenhum paciente encontrado'
                  : 'A lista de espera está vazia'}
              </h3>
              <p>
                {busca || statusFiltro
                  ? 'Ajuste os filtros para visualizar outros registros.'
                  : 'Adicione um paciente quando houver demanda por uma nova disponibilidade.'}
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
                <Button className="waiting-empty__button" onClick={abrirModal}>
                  <FaPlus />
                  Adicionar paciente
                </Button>
              )}
            </div>
          )}
        </section>
      </div>

      <Modal
        show={mostrarModal}
        onHide={fecharModal}
        centered
        size="lg"
        dialogClassName="waiting-modal"
      >
        <Form onSubmit={cadastrarNaLista}>
          <Modal.Header closeButton={!salvando}>
            <div className="waiting-modal__heading">
              <span>
                <FaUserClock />
              </span>
              <div>
                <small>Nova solicitação</small>
                <Modal.Title>Adicionar à lista de espera</Modal.Title>
                <p>Informe as preferências do paciente para a próxima vaga.</p>
              </div>
            </div>
          </Modal.Header>

          <Modal.Body>
            {erroModal && (
              <Alert variant="danger" className="waiting-modal__alert">
                {erroModal}
              </Alert>
            )}

            <div className="waiting-modal__section-title">
              <FaUserInjured />
              Paciente
            </div>

            <Form.Group className="waiting-modal__field">
              <Form.Label>
                Selecione o paciente <span>*</span>
              </Form.Label>
              <Form.Select
                name="paciente_id"
                value={formData.paciente_id}
                onChange={handleFormChange}
                required
              >
                <option value="">Selecione um paciente</option>
                {pacientes.map((paciente) => (
                  <option key={paciente.id} value={paciente.id}>
                    {nomePaciente(paciente)}
                  </option>
                ))}
              </Form.Select>
              {pacientes.length === 0 && (
                <Form.Text>Nenhum paciente disponível para seleção.</Form.Text>
              )}
            </Form.Group>

            <div className="waiting-modal__section-title">
              <FaStethoscope />
              Preferência de atendimento
            </div>

            <div className="waiting-modal__grid">
              <Form.Group className="waiting-modal__field">
                <Form.Label>Médico</Form.Label>
                <Form.Select
                  name="medico_id"
                  value={formData.medico_id}
                  onChange={selecionarMedico}
                >
                  <option value="">Sem preferência de médico</option>
                  {medicos.map((medico) => (
                    <option key={medico.id} value={medico.id}>
                      {nomeMedico(medico)}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="waiting-modal__field">
                <Form.Label>Especialidade</Form.Label>
                <div className="waiting-modal__readonly">
                  <FaUserMd />
                  <Form.Control
                    type="text"
                    name="especialidade"
                    value={formData.especialidade}
                    readOnly
                    placeholder="Preenchida pelo médico"
                  />
                </div>
              </Form.Group>

              <Form.Group className="waiting-modal__field waiting-modal__field--full">
                <Form.Label>Data desejada</Form.Label>
                <div className="waiting-modal__date">
                  <FaCalendarAlt />
                  <Form.Control
                    type="date"
                    name="data_desejada"
                    value={formData.data_desejada}
                    onChange={handleFormChange}
                  />
                </div>
                <Form.Text>
                  Campo opcional. A data ajuda a organizar a preferência do paciente.
                </Form.Text>
              </Form.Group>
            </div>
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
            <Button type="submit" className="waiting-modal__submit" disabled={salvando}>
              {salvando ? (
                <>
                  <Spinner animation="border" size="sm" />
                  Adicionando
                </>
              ) : (
                <>
                  <FaPlus />
                  Adicionar à fila
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </MainLayout>
  )
}

export default ListaEspera
