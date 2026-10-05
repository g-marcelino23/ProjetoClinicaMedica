import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'
import {
  FaCalendarCheck,
  FaCheckCircle,
  FaClipboardList,
  FaEdit,
  FaEye,
  FaFileMedical,
  FaFilter,
  FaNotesMedical,
  FaPlus,
  FaSearch,
  FaStethoscope,
  FaSyncAlt,
  FaUserInjured,
  FaUserMd,
  FaUsers
} from 'react-icons/fa'
import MainLayout from '../../components/layout/MainLayout'
import { listarConsultas } from '../../services/consultaService'
import {
  listarProntuarios,
  criarProntuario,
  atualizarProntuario
} from '../../services/prontuariosService'
import { useAuth } from '../../context/AuthContext'
import './ProntuariosPage.css'

const FORM_INICIAL = {
  id: null,
  consulta_id: '',
  paciente_id: '',
  medico_id: '',
  queixa_principal: '',
  anamnese: '',
  diagnostico: '',
  observacoes: ''
}

const FILTROS_REGISTRO = [
  { value: '', label: 'Todos os registros' },
  { value: 'COM_DIAGNOSTICO', label: 'Com diagnóstico' },
  { value: 'SEM_DIAGNOSTICO', label: 'Sem diagnóstico' }
]

function parseLocalDate(value) {
  if (!value) return null

  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number)

  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function formatarData(value) {
  const date = parseLocalDate(value)

  if (!date) return 'Não informada'
  return date.toLocaleDateString('pt-BR')
}

function formatarDataHora(value) {
  if (!value) return 'Não informada'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Não informada'

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatarHora(value) {
  if (!value) return ''
  return String(value).slice(0, 5)
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

function ProntuariosPage() {
  const { user } = useAuth()

  const [prontuarios, setProntuarios] = useState([])
  const [consultas, setConsultas] = useState([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [erroModal, setErroModal] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [prontuarioSelecionado, setProntuarioSelecionado] = useState(null)
  const [busca, setBusca] = useState('')
  const [filtroRegistro, setFiltroRegistro] = useState('')
  const [formData, setFormData] = useState(FORM_INICIAL)

  const perfil = user?.perfil
  const podeCriarProntuario = perfil === 'MEDICO'
  const podeEditarProntuario = perfil === 'MEDICO'
  const perfilLabel = {
    MEDICO: 'Médico',
    SECRETARIO: 'Secretário',
    PACIENTE: 'Paciente'
  }[perfil]

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true)
      setErro('')

      const [dadosProntuarios, dadosConsultas] = await Promise.all([
        listarProntuarios(),
        listarConsultas()
      ])

      setProntuarios(Array.isArray(dadosProntuarios) ? dadosProntuarios : [])
      setConsultas(Array.isArray(dadosConsultas) ? dadosConsultas : [])
    } catch (error) {
      console.error('Erro ao carregar prontuários:', error)
      setErro(
        error.response?.data?.erro || 'Erro ao carregar os dados dos prontuários.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  const consultasSemProntuario = useMemo(() => {
    const idsUsados = new Set(
      prontuarios.map((item) => Number(item.consulta_id))
    )

    return consultas.filter((consulta) => !idsUsados.has(Number(consulta.id)))
  }, [consultas, prontuarios])

  const consultaSelecionada = useMemo(
    () =>
      consultas.find(
        (consulta) => Number(consulta.id) === Number(formData.consulta_id)
      ),
    [consultas, formData.consulta_id]
  )

  const prontuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR')

    return prontuarios.filter((prontuario) => {
      const possuiDiagnostico = Boolean(prontuario.diagnostico?.trim())
      const correspondeFiltro =
        !filtroRegistro ||
        (filtroRegistro === 'COM_DIAGNOSTICO' && possuiDiagnostico) ||
        (filtroRegistro === 'SEM_DIAGNOSTICO' && !possuiDiagnostico)
      const textoBusca = [
        prontuario.id,
        prontuario.consulta_id,
        prontuario.paciente_nome,
        prontuario.medico_nome,
        prontuario.queixa_principal,
        prontuario.anamnese,
        prontuario.diagnostico,
        prontuario.observacoes
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('pt-BR')
      const correspondeBusca = !termo || textoBusca.includes(termo)

      return correspondeFiltro && correspondeBusca
    })
  }, [busca, filtroRegistro, prontuarios])

  const estatisticas = useMemo(() => {
    const hoje = new Date()
    const chaveHoje = [
      hoje.getFullYear(),
      String(hoje.getMonth() + 1).padStart(2, '0'),
      String(hoje.getDate()).padStart(2, '0')
    ].join('-')

    return {
      total: prontuarios.length,
      hoje: prontuarios.filter(
        (item) => String(item.created_at || '').slice(0, 10) === chaveHoje
      ).length,
      pacientes: new Set(prontuarios.map((item) => item.paciente_id)).size,
      diagnosticados: prontuarios.filter((item) => item.diagnostico?.trim()).length
    }
  }, [prontuarios])

  const limparFormulario = () => {
    setFormData(FORM_INICIAL)
  }

  const abrirModalCadastro = () => {
    if (!podeCriarProntuario) {
      setErro('Você não tem permissão para cadastrar prontuário.')
      return
    }

    setModoEdicao(false)
    setErroModal('')
    limparFormulario()
    setShowModal(true)
  }

  const abrirModalEdicao = (prontuario) => {
    if (!podeEditarProntuario) {
      setErro('Você não tem permissão para editar prontuário.')
      return
    }

    setModoEdicao(true)
    setErroModal('')
    setFormData({
      id: prontuario.id,
      consulta_id: String(prontuario.consulta_id || ''),
      paciente_id: String(prontuario.paciente_id || ''),
      medico_id: String(prontuario.medico_id || ''),
      queixa_principal: prontuario.queixa_principal || '',
      anamnese: prontuario.anamnese || '',
      diagnostico: prontuario.diagnostico || '',
      observacoes: prontuario.observacoes || ''
    })
    setShowDetailsModal(false)
    setShowModal(true)
  }

  const fecharModal = () => {
    if (salvando) return

    setShowModal(false)
    setErroModal('')
    limparFormulario()
  }

  const abrirDetalhes = (prontuario) => {
    setProntuarioSelecionado(prontuario)
    setShowDetailsModal(true)
  }

  const fecharDetalhes = () => {
    setShowDetailsModal(false)
    setProntuarioSelecionado(null)
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

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const salvarProntuario = async (event) => {
    event.preventDefault()

    if (modoEdicao && !podeEditarProntuario) {
      setErroModal('Você não tem permissão para editar prontuário.')
      return
    }

    if (!modoEdicao && !podeCriarProntuario) {
      setErroModal('Você não tem permissão para cadastrar prontuário.')
      return
    }

    if (!formData.consulta_id || !formData.paciente_id || !formData.medico_id) {
      setErroModal('Selecione uma consulta válida.')
      return
    }

    try {
      setSalvando(true)
      setErroModal('')
      setErro('')
      setSucesso('')

      if (modoEdicao) {
        await atualizarProntuario(formData.id, {
          queixa_principal: formData.queixa_principal,
          anamnese: formData.anamnese,
          diagnostico: formData.diagnostico,
          observacoes: formData.observacoes
        })
        setSucesso('Prontuário atualizado com sucesso!')
      } else {
        await criarProntuario({
          consulta_id: Number(formData.consulta_id),
          paciente_id: Number(formData.paciente_id),
          medico_id: Number(formData.medico_id),
          queixa_principal: formData.queixa_principal,
          anamnese: formData.anamnese,
          diagnostico: formData.diagnostico,
          observacoes: formData.observacoes
        })
        setSucesso('Prontuário cadastrado com sucesso!')
      }

      setShowModal(false)
      limparFormulario()
      await carregarDados()
    } catch (error) {
      console.error('Erro ao salvar prontuário:', error)
      setErroModal(error.response?.data?.erro || 'Erro ao salvar prontuário.')
    } finally {
      setSalvando(false)
    }
  }

  const renderAcoes = (prontuario) => (
    <div className="records-actions">
      <button
        type="button"
        className="records-action records-action--view"
        onClick={() => abrirDetalhes(prontuario)}
        title="Visualizar prontuário"
        aria-label={`Visualizar prontuário de ${prontuario.paciente_nome}`}
      >
        <FaEye />
      </button>

      {podeEditarProntuario && (
        <button
          type="button"
          className="records-action records-action--edit"
          onClick={() => abrirModalEdicao(prontuario)}
          title="Editar prontuário"
          aria-label={`Editar prontuário de ${prontuario.paciente_nome}`}
        >
          <FaEdit />
        </button>
      )}
    </div>
  )

  return (
    <MainLayout>
      <div className="records-page">
        <section className="records-hero">
          <div className="records-hero__content">
            <span className="records-hero__eyebrow">
              <FaNotesMedical />
              Histórico clínico
            </span>
            <h1>
              Informações clínicas organizadas para um <span>cuidado contínuo</span>
            </h1>
            <p>
              Consulte queixas, anamneses, diagnósticos e observações em um
              histórico seguro e fácil de acompanhar.
            </p>
          </div>

          <div className="records-hero__actions">
            <div className="records-hero__profile">
              <span>
                <FaFileMedical />
              </span>
              <div>
                <small>Acesso atual</small>
                <strong>{perfilLabel || 'Usuário'}</strong>
              </div>
            </div>

            {podeCriarProntuario && (
              <Button className="records-add-button" onClick={abrirModalCadastro}>
                <FaPlus />
                Novo prontuário
              </Button>
            )}
          </div>

          <FaNotesMedical className="records-hero__decoration" aria-hidden="true" />
        </section>

        {erro && (
          <Alert
            variant="danger"
            className="records-feedback"
            dismissible
            onClose={() => setErro('')}
          >
            {erro}
          </Alert>
        )}

        {sucesso && (
          <Alert
            variant="success"
            className="records-feedback"
            dismissible
            onClose={() => setSucesso('')}
          >
            {sucesso}
          </Alert>
        )}

        <section className="records-stats" aria-label="Resumo dos prontuários">
          <article className="records-stat records-stat--blue">
            <span className="records-stat__icon">
              <FaNotesMedical />
            </span>
            <span>
              <small>Total de prontuários</small>
              <strong>{estatisticas.total}</strong>
              <p>Registros disponíveis</p>
            </span>
          </article>

          <article className="records-stat records-stat--violet">
            <span className="records-stat__icon">
              <FaCalendarCheck />
            </span>
            <span>
              <small>Registros de hoje</small>
              <strong>{estatisticas.hoje}</strong>
              <p>Criados nesta data</p>
            </span>
          </article>

          <article className="records-stat records-stat--green">
            <span className="records-stat__icon">
              <FaUsers />
            </span>
            <span>
              <small>Pacientes atendidos</small>
              <strong>{estatisticas.pacientes}</strong>
              <p>Pacientes distintos</p>
            </span>
          </article>

          <article className="records-stat records-stat--amber">
            <span className="records-stat__icon">
              <FaStethoscope />
            </span>
            <span>
              <small>Com diagnóstico</small>
              <strong>{estatisticas.diagnosticados}</strong>
              <p>Diagnósticos registrados</p>
            </span>
          </article>
        </section>

        <section className="records-workspace">
          <div className="records-workspace__header">
            <div className="records-workspace__title">
              <span className="records-workspace__icon">
                <FaClipboardList />
              </span>
              <div>
                <span>Central clínica</span>
                <h2>Prontuários dos pacientes</h2>
                <p>
                  {prontuariosFiltrados.length}{' '}
                  {prontuariosFiltrados.length === 1
                    ? 'registro exibido'
                    : 'registros exibidos'}
                </p>
              </div>
            </div>

            <div className="records-toolbar">
              <div className="records-search">
                <FaSearch />
                <Form.Control
                  type="search"
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar paciente ou diagnóstico..."
                  aria-label="Buscar prontuários"
                />
              </div>

              <div className="records-filter">
                <FaFilter />
                <Form.Select
                  value={filtroRegistro}
                  onChange={(event) => setFiltroRegistro(event.target.value)}
                  aria-label="Filtrar prontuários"
                >
                  {FILTROS_REGISTRO.map((filtro) => (
                    <option key={filtro.value} value={filtro.value}>
                      {filtro.label}
                    </option>
                  ))}
                </Form.Select>
              </div>

              <button
                type="button"
                className="records-refresh"
                onClick={carregarDados}
                disabled={loading}
                aria-label="Atualizar prontuários"
                title="Atualizar prontuários"
              >
                <FaSyncAlt className={loading ? 'is-spinning' : ''} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="records-loading">
              <div className="records-loading__icon">
                <Spinner animation="border" />
              </div>
              <strong>Carregando prontuários</strong>
              <p>Estamos organizando o histórico clínico dos pacientes.</p>
            </div>
          ) : prontuariosFiltrados.length > 0 ? (
            <>
              <div className="records-table-wrap">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>Prontuário</th>
                      <th>Paciente</th>
                      <th>Médico</th>
                      <th>Queixa principal</th>
                      <th>Diagnóstico</th>
                      <th>Registro</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prontuariosFiltrados.map((prontuario) => (
                      <tr key={prontuario.id}>
                        <td>
                          <div className="records-id">
                            <span>
                              <FaNotesMedical />
                            </span>
                            <div>
                              <strong>Prontuário #{prontuario.id}</strong>
                              <small>Consulta #{prontuario.consulta_id}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="records-person">
                            <span className="records-avatar records-avatar--patient">
                              {obterIniciais(prontuario.paciente_nome)}
                            </span>
                            <strong>{prontuario.paciente_nome || 'Não informado'}</strong>
                          </div>
                        </td>
                        <td>
                          <div className="records-person">
                            <span className="records-avatar records-avatar--doctor">
                              {obterIniciais(prontuario.medico_nome)}
                            </span>
                            <strong>{prontuario.medico_nome || 'Não informado'}</strong>
                          </div>
                        </td>
                        <td>
                          <span
                            className="records-clinical-text"
                            title={prontuario.queixa_principal || ''}
                          >
                            {prontuario.queixa_principal || 'Não informada'}
                          </span>
                        </td>
                        <td>
                          {prontuario.diagnostico ? (
                            <span
                              className="records-diagnosis"
                              title={prontuario.diagnostico}
                            >
                              <FaCheckCircle />
                              {prontuario.diagnostico}
                            </span>
                          ) : (
                            <span className="records-diagnosis is-pending">
                              Sem diagnóstico
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="records-date">
                            {formatarDataHora(prontuario.created_at)}
                          </span>
                        </td>
                        <td>{renderAcoes(prontuario)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="records-mobile-list">
                {prontuariosFiltrados.map((prontuario) => (
                  <article key={prontuario.id} className="records-mobile-card">
                    <div className="records-mobile-card__header">
                      <div className="records-person">
                        <span className="records-avatar records-avatar--patient">
                          {obterIniciais(prontuario.paciente_nome)}
                        </span>
                        <span>
                          <strong>{prontuario.paciente_nome || 'Não informado'}</strong>
                          <small>
                            Prontuário #{prontuario.id} · Consulta #
                            {prontuario.consulta_id}
                          </small>
                        </span>
                      </div>
                      {renderAcoes(prontuario)}
                    </div>

                    <div className="records-mobile-card__meta">
                      <div>
                        <span>Médico</span>
                        <strong>{prontuario.medico_nome || 'Não informado'}</strong>
                      </div>
                      <div>
                        <span>Registrado em</span>
                        <strong>{formatarDataHora(prontuario.created_at)}</strong>
                      </div>
                    </div>

                    <div className="records-mobile-card__clinical">
                      <div>
                        <span>Queixa principal</span>
                        <p>{prontuario.queixa_principal || 'Não informada'}</p>
                      </div>
                      <div>
                        <span>Diagnóstico</span>
                        <p>{prontuario.diagnostico || 'Ainda não informado'}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="records-empty">
              {busca || filtroRegistro ? <FaSearch /> : <FaNotesMedical />}
              <h3>
                {busca || filtroRegistro
                  ? 'Nenhum prontuário encontrado'
                  : 'Nenhum prontuário cadastrado'}
              </h3>
              <p>
                {busca || filtroRegistro
                  ? 'Ajuste a busca ou o filtro para visualizar outros registros.'
                  : 'Os registros clínicos aparecerão aqui após o atendimento.'}
              </p>
              {busca || filtroRegistro ? (
                <Button
                  variant="light"
                  onClick={() => {
                    setBusca('')
                    setFiltroRegistro('')
                  }}
                >
                  Limpar filtros
                </Button>
              ) : (
                podeCriarProntuario && (
                  <Button
                    className="records-empty__button"
                    onClick={abrirModalCadastro}
                  >
                    <FaPlus />
                    Criar prontuário
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
        size="xl"
        dialogClassName="records-form-modal"
      >
        <Form onSubmit={salvarProntuario}>
          <Modal.Header closeButton={!salvando}>
            <div className="records-modal-heading">
              <span>{modoEdicao ? <FaEdit /> : <FaNotesMedical />}</span>
              <div>
                <small>{modoEdicao ? 'Atualização clínica' : 'Novo registro clínico'}</small>
                <Modal.Title>
                  {modoEdicao ? 'Editar prontuário' : 'Cadastrar prontuário'}
                </Modal.Title>
                <p>
                  {modoEdicao
                    ? 'Revise e atualize as informações do atendimento.'
                    : 'Registre as informações clínicas vinculadas à consulta.'}
                </p>
              </div>
            </div>
          </Modal.Header>

          <Modal.Body>
            {erroModal && (
              <Alert variant="danger" className="records-modal-alert">
                {erroModal}
              </Alert>
            )}

            <div className="records-modal-section-title">
              <FaCalendarCheck />
              Consulta vinculada
            </div>

            <Form.Group className="records-modal-field">
              <Form.Label>
                Consulta <span>*</span>
              </Form.Label>
              <Form.Select
                name="consulta_id"
                value={formData.consulta_id}
                onChange={handleChange}
                disabled={modoEdicao}
                required
              >
                <option value="">Selecione uma consulta</option>
                {(modoEdicao ? consultas : consultasSemProntuario).map((consulta) => (
                  <option key={consulta.id} value={consulta.id}>
                    Consulta #{consulta.id} — {consulta.paciente_nome} /{' '}
                    {consulta.medico_nome} — {formatarData(consulta.data_consulta)}{' '}
                    às {formatarHora(consulta.hora_consulta)}
                  </option>
                ))}
              </Form.Select>
              {!modoEdicao && consultasSemProntuario.length === 0 && (
                <Form.Text>
                  Não existem consultas disponíveis sem prontuário.
                </Form.Text>
              )}
            </Form.Group>

            {consultaSelecionada && (
              <div className="records-consultation-summary">
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
                <div>
                  <span>
                    <FaCalendarCheck />
                  </span>
                  <div>
                    <small>Atendimento</small>
                    <strong>
                      {formatarData(consultaSelecionada.data_consulta)} às{' '}
                      {formatarHora(consultaSelecionada.hora_consulta)}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {!modoEdicao && consultaSelecionada && (
              <div className="records-status-note">
                <FaCheckCircle />
                Ao criar o prontuário, esta consulta será marcada como realizada.
              </div>
            )}

            <div className="records-modal-section-title">
              <FaStethoscope />
              Avaliação clínica
            </div>

            <div className="records-modal-grid">
              <Form.Group className="records-modal-field">
                <Form.Label>Queixa principal</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="queixa_principal"
                  value={formData.queixa_principal}
                  onChange={handleChange}
                  placeholder="Descreva a queixa principal do paciente"
                />
              </Form.Group>

              <Form.Group className="records-modal-field">
                <Form.Label>Diagnóstico</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="diagnostico"
                  value={formData.diagnostico}
                  onChange={handleChange}
                  placeholder="Informe o diagnóstico"
                />
              </Form.Group>

              <Form.Group className="records-modal-field">
                <Form.Label>Anamnese</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  name="anamnese"
                  value={formData.anamnese}
                  onChange={handleChange}
                  placeholder="Registre a anamnese do paciente"
                />
              </Form.Group>

              <Form.Group className="records-modal-field">
                <Form.Label>Observações</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  name="observacoes"
                  value={formData.observacoes}
                  onChange={handleChange}
                  placeholder="Observações adicionais do atendimento"
                />
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
            <Button type="submit" className="records-modal-submit" disabled={salvando}>
              {salvando ? (
                <>
                  <Spinner animation="border" size="sm" />
                  Salvando
                </>
              ) : (
                <>
                  {modoEdicao ? <FaCheckCircle /> : <FaPlus />}
                  {modoEdicao ? 'Salvar alterações' : 'Cadastrar prontuário'}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal
        show={showDetailsModal}
        onHide={fecharDetalhes}
        centered
        size="lg"
        dialogClassName="records-details-modal"
      >
        <Modal.Header closeButton>
          <div className="records-modal-heading">
            <span>
              <FaFileMedical />
            </span>
            <div>
              <small>Histórico clínico</small>
              <Modal.Title>
                Prontuário #{prontuarioSelecionado?.id}
              </Modal.Title>
              <p>Consulta #{prontuarioSelecionado?.consulta_id}</p>
            </div>
          </div>
        </Modal.Header>

        <Modal.Body>
          <div className="records-details-people">
            <div>
              <span className="records-avatar records-avatar--patient">
                {obterIniciais(prontuarioSelecionado?.paciente_nome)}
              </span>
              <div>
                <small>Paciente</small>
                <strong>{prontuarioSelecionado?.paciente_nome || 'Não informado'}</strong>
              </div>
            </div>
            <div>
              <span className="records-avatar records-avatar--doctor">
                {obterIniciais(prontuarioSelecionado?.medico_nome)}
              </span>
              <div>
                <small>Médico responsável</small>
                <strong>{prontuarioSelecionado?.medico_nome || 'Não informado'}</strong>
              </div>
            </div>
          </div>

          <div className="records-details-date">
            <FaCalendarCheck />
            Registrado em {formatarDataHora(prontuarioSelecionado?.created_at)}
          </div>

          <div className="records-details-grid">
            <section>
              <span>Queixa principal</span>
              <p>{prontuarioSelecionado?.queixa_principal || 'Não informada'}</p>
            </section>
            <section>
              <span>Diagnóstico</span>
              <p>{prontuarioSelecionado?.diagnostico || 'Não informado'}</p>
            </section>
            <section>
              <span>Anamnese</span>
              <p>{prontuarioSelecionado?.anamnese || 'Não informada'}</p>
            </section>
            <section>
              <span>Observações</span>
              <p>{prontuarioSelecionado?.observacoes || 'Nenhuma observação'}</p>
            </section>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="light" onClick={fecharDetalhes}>
            Fechar
          </Button>
          {podeEditarProntuario && prontuarioSelecionado && (
            <Button
              className="records-modal-submit"
              onClick={() => abrirModalEdicao(prontuarioSelecionado)}
            >
              <FaEdit />
              Editar prontuário
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </MainLayout>
  )
}

export default ProntuariosPage
