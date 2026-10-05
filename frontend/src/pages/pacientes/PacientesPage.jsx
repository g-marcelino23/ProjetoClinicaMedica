import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Form, Modal, Spinner, Table } from 'react-bootstrap'
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaEnvelope,
  FaHeartbeat,
  FaIdCard,
  FaMapMarkerAlt,
  FaPen,
  FaPhoneAlt,
  FaPlus,
  FaSearch,
  FaShieldAlt,
  FaSyncAlt,
  FaTrash,
  FaUserInjured,
  FaUserPlus,
  FaUsers
} from 'react-icons/fa'
import MainLayout from '../../components/layout/MainLayout'
import {
  atualizarPaciente,
  criarPaciente,
  excluirPaciente as excluirPacienteApi,
  listarPacientes
} from '../../services/pacientesService'
import './PacientesPage.css'

const EMPTY_FORM = {
  id: null,
  usuario_id: '',
  nome: '',
  email: '',
  cpf: '',
  data_nascimento: '',
  telefone: '',
  endereco: '',
  convenio: '',
  numero_convenio: ''
}

function getInitials(name) {
  if (!name) return 'PA'

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function formatCpf(cpf) {
  const digits = String(cpf || '').replace(/\D/g, '')

  if (digits.length !== 11) return cpf || '-'

  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

function formatPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '')

  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }

  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }

  return phone || '-'
}

function parseLocalDate(value) {
  if (!value) return null

  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number)

  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function calculateAge(birthDate) {
  const parsedDate = parseLocalDate(birthDate)

  if (!parsedDate) return null

  const today = new Date()
  let age = today.getFullYear() - parsedDate.getFullYear()
  const monthDifference = today.getMonth() - parsedDate.getMonth()

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < parsedDate.getDate())
  ) {
    age -= 1
  }

  return age >= 0 ? age : null
}

function PacientesPage() {
  const [pacientes, setPacientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [erroModal, setErroModal] = useState('')
  const [erroExclusao, setErroExclusao] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [pacienteParaExcluir, setPacienteParaExcluir] = useState(null)
  const [busca, setBusca] = useState('')
  const [filtroConvenio, setFiltroConvenio] = useState('TODOS')
  const [formData, setFormData] = useState(EMPTY_FORM)

  const carregarPacientes = useCallback(async () => {
    try {
      setLoading(true)
      setErro('')
      const dados = await listarPacientes()
      setPacientes(Array.isArray(dados) ? dados : [])
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error)
      setErro(error.response?.data?.erro || 'Erro ao carregar pacientes.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarPacientes()
  }, [carregarPacientes])

  const indicadores = useMemo(() => {
    const comConvenio = pacientes.filter((paciente) =>
      Boolean(paciente.convenio?.trim())
    ).length
    const idades = pacientes
      .map((paciente) => calculateAge(paciente.data_nascimento))
      .filter((age) => age !== null)
    const idadeMedia =
      idades.length > 0
        ? Math.round(idades.reduce((total, age) => total + age, 0) / idades.length)
        : 0

    return {
      total: pacientes.length,
      comConvenio,
      particulares: pacientes.length - comConvenio,
      idadeMedia
    }
  }, [pacientes])

  const pacientesFiltrados = useMemo(() => {
    const term = busca.trim().toLocaleLowerCase('pt-BR')

    return pacientes
      .filter((paciente) => {
        const matchesSearch =
          !term ||
          [paciente.nome, paciente.email, paciente.cpf, paciente.telefone].some(
            (value) =>
              String(value || '')
                .toLocaleLowerCase('pt-BR')
                .includes(term)
          )
        const hasHealthPlan = Boolean(paciente.convenio?.trim())
        const matchesHealthPlan =
          filtroConvenio === 'TODOS' ||
          (filtroConvenio === 'COM_CONVENIO' && hasHealthPlan) ||
          (filtroConvenio === 'PARTICULAR' && !hasHealthPlan)

        return matchesSearch && matchesHealthPlan
      })
      .sort((first, second) =>
        String(first.nome || '').localeCompare(String(second.nome || ''), 'pt-BR')
      )
  }, [pacientes, busca, filtroConvenio])

  const filtrosAtivos = Boolean(busca || filtroConvenio !== 'TODOS')

  const limparFiltros = () => {
    setBusca('')
    setFiltroConvenio('TODOS')
  }

  const abrirModalCadastro = () => {
    setModoEdicao(false)
    setErroModal('')
    setFormData(EMPTY_FORM)
    setShowModal(true)
  }

  const abrirModalEdicao = (paciente) => {
    setModoEdicao(true)
    setErroModal('')
    setFormData({
      id: paciente.id,
      usuario_id: paciente.usuario_id || '',
      nome: paciente.nome || '',
      email: paciente.email || '',
      cpf: paciente.cpf || '',
      data_nascimento: paciente.data_nascimento
        ? paciente.data_nascimento.split('T')[0]
        : '',
      telefone: paciente.telefone || '',
      endereco: paciente.endereco || '',
      convenio: paciente.convenio || '',
      numero_convenio: paciente.numero_convenio || ''
    })
    setShowModal(true)
  }

  const fecharModal = () => {
    if (salvando) return

    setShowModal(false)
    setErroModal('')
    setFormData(EMPTY_FORM)
  }

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value
    }))
  }

  const handleSalvarPaciente = async (event) => {
    event.preventDefault()

    if (!modoEdicao && (!formData.usuario_id || !formData.cpf)) {
      setErroModal('O ID do usuário e o CPF são obrigatórios.')
      return
    }

    try {
      setSalvando(true)
      setErroModal('')
      setErro('')
      setSucesso('')

      if (modoEdicao) {
        await atualizarPaciente(formData.id, {
          cpf: formData.cpf,
          data_nascimento: formData.data_nascimento || null,
          telefone: formData.telefone,
          endereco: formData.endereco,
          convenio: formData.convenio,
          numero_convenio: formData.numero_convenio
        })
        setSucesso('Paciente atualizado com sucesso.')
      } else {
        await criarPaciente({
          usuario_id: Number(formData.usuario_id),
          cpf: formData.cpf,
          data_nascimento: formData.data_nascimento || null,
          telefone: formData.telefone,
          endereco: formData.endereco,
          convenio: formData.convenio,
          numero_convenio: formData.numero_convenio
        })
        setSucesso('Paciente cadastrado com sucesso.')
      }

      setShowModal(false)
      setFormData(EMPTY_FORM)
      await carregarPacientes()
    } catch (error) {
      console.error('Erro ao salvar paciente:', error)
      setErroModal(
        error.response?.data?.erro ||
          error.response?.data?.message ||
          'Erro ao salvar paciente.'
      )
    } finally {
      setSalvando(false)
    }
  }

  const abrirConfirmacaoExclusao = (paciente) => {
    setErroExclusao('')
    setPacienteParaExcluir(paciente)
  }

  const fecharConfirmacaoExclusao = () => {
    if (excluindo) return

    setPacienteParaExcluir(null)
    setErroExclusao('')
  }

  const confirmarExclusao = async () => {
    if (!pacienteParaExcluir) return

    try {
      setExcluindo(true)
      setErroExclusao('')
      setErro('')
      setSucesso('')
      await excluirPacienteApi(pacienteParaExcluir.id)
      setPacienteParaExcluir(null)
      setSucesso('Paciente excluído com sucesso.')
      await carregarPacientes()
    } catch (error) {
      console.error('Erro ao excluir paciente:', error)
      setErroExclusao(
        error.response?.data?.erro ||
          error.response?.data?.message ||
          'Erro ao excluir paciente.'
      )
    } finally {
      setExcluindo(false)
    }
  }

  const renderActions = (paciente) => (
    <div className="patients-actions">
      <button
        type="button"
        className="patients-icon-button"
        onClick={() => abrirModalEdicao(paciente)}
        title="Editar paciente"
        aria-label={`Editar paciente ${paciente.nome}`}
      >
        <FaPen />
      </button>
      <button
        type="button"
        className="patients-icon-button patients-icon-button--danger"
        onClick={() => abrirConfirmacaoExclusao(paciente)}
        title="Excluir paciente"
        aria-label={`Excluir paciente ${paciente.nome}`}
      >
        <FaTrash />
      </button>
    </div>
  )

  return (
    <MainLayout>
      <div className="patients-page">
        <section className="patients-hero">
          <div className="patients-hero__content">
            <span className="patients-eyebrow">
              <FaHeartbeat />
              Diretório clínico
            </span>
            <h1>Pacientes</h1>
            <p>
              Consulte e mantenha atualizadas as informações administrativas da
              base de pacientes da clínica.
            </p>
          </div>

          <div className="patients-hero__actions">
            <button
              type="button"
              className="patients-refresh-button"
              onClick={carregarPacientes}
              disabled={loading}
              title="Atualizar pacientes"
              aria-label="Atualizar pacientes"
            >
              <FaSyncAlt className={loading ? 'is-spinning' : ''} />
            </button>
            <Button className="patients-primary-button" onClick={abrirModalCadastro}>
              <FaUserPlus />
              Novo paciente
            </Button>
          </div>

          <FaUserInjured className="patients-hero__decoration" aria-hidden="true" />
        </section>

        <section className="patients-stats" aria-label="Resumo dos pacientes">
          <article className="patients-stat-card">
            <span className="patients-stat-card__icon patients-stat-card__icon--blue">
              <FaUsers />
            </span>
            <div>
              <small>Total de pacientes</small>
              <strong>{indicadores.total}</strong>
              <span>cadastros ativos</span>
            </div>
          </article>

          <article className="patients-stat-card">
            <span className="patients-stat-card__icon patients-stat-card__icon--green">
              <FaShieldAlt />
            </span>
            <div>
              <small>Com convênio</small>
              <strong>{indicadores.comConvenio}</strong>
              <span>pacientes conveniados</span>
            </div>
          </article>

          <article className="patients-stat-card">
            <span className="patients-stat-card__icon patients-stat-card__icon--violet">
              <FaIdCard />
            </span>
            <div>
              <small>Atendimento particular</small>
              <strong>{indicadores.particulares}</strong>
              <span>sem convênio informado</span>
            </div>
          </article>

          <article className="patients-stat-card">
            <span className="patients-stat-card__icon patients-stat-card__icon--amber">
              <FaCalendarAlt />
            </span>
            <div>
              <small>Idade média</small>
              <strong>{indicadores.idadeMedia}</strong>
              <span>anos na base cadastrada</span>
            </div>
          </article>
        </section>

        {erro && (
          <Alert
            variant="danger"
            dismissible
            onClose={() => setErro('')}
            className="patients-feedback"
          >
            {erro}
          </Alert>
        )}

        {sucesso && (
          <Alert
            variant="success"
            dismissible
            onClose={() => setSucesso('')}
            className="patients-feedback"
          >
            {sucesso}
          </Alert>
        )}

        <section className="patients-directory">
          <header className="patients-directory__header">
            <div>
              <span className="patients-section-eyebrow">Base cadastral</span>
              <h2>Lista de pacientes</h2>
              <p>
                {loading
                  ? 'Atualizando informações...'
                  : `${pacientesFiltrados.length} paciente${pacientesFiltrados.length === 1 ? '' : 's'} encontrado${pacientesFiltrados.length === 1 ? '' : 's'}`}
              </p>
            </div>

            <div className="patients-filters">
              <div className="patients-search">
                <FaSearch aria-hidden="true" />
                <input
                  type="search"
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar nome, CPF, telefone ou e-mail"
                  aria-label="Buscar pacientes"
                />
              </div>

              <Form.Select
                value={filtroConvenio}
                onChange={(event) => setFiltroConvenio(event.target.value)}
                aria-label="Filtrar pacientes por convênio"
                className="patients-filter-select"
              >
                <option value="TODOS">Todos os atendimentos</option>
                <option value="COM_CONVENIO">Com convênio</option>
                <option value="PARTICULAR">Particular</option>
              </Form.Select>

              {filtrosAtivos && (
                <button
                  type="button"
                  className="patients-clear-filters"
                  onClick={limparFiltros}
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </header>

          {loading ? (
            <div className="patients-loading">
              <span>
                <Spinner animation="border" />
              </span>
              <strong>Carregando pacientes</strong>
              <p>Organizando as informações mais recentes...</p>
            </div>
          ) : pacientes.length === 0 ? (
            <div className="patients-empty">
              <span>
                <FaUserPlus />
              </span>
              <h3>Nenhum paciente cadastrado</h3>
              <p>Cadastre o primeiro paciente para iniciar o diretório clínico.</p>
              <Button className="patients-primary-button" onClick={abrirModalCadastro}>
                <FaPlus />
                Cadastrar paciente
              </Button>
            </div>
          ) : pacientesFiltrados.length === 0 ? (
            <div className="patients-empty patients-empty--compact">
              <span>
                <FaSearch />
              </span>
              <h3>Nenhum resultado encontrado</h3>
              <p>Tente buscar outro termo ou alterar o filtro selecionado.</p>
              <button
                type="button"
                className="patients-clear-filters"
                onClick={limparFiltros}
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <>
              <div className="patients-table-wrapper">
                <Table className="patients-table" responsive>
                  <thead>
                    <tr>
                      <th>Paciente</th>
                      <th>CPF</th>
                      <th>Contato</th>
                      <th>Convênio</th>
                      <th>Idade</th>
                      <th aria-label="Ações" />
                    </tr>
                  </thead>
                  <tbody>
                    {pacientesFiltrados.map((paciente) => {
                      const age = calculateAge(paciente.data_nascimento)

                      return (
                        <tr key={paciente.id}>
                          <td>
                            <div className="patients-identity">
                              <span className="patients-avatar">
                                {getInitials(paciente.nome)}
                                <i aria-hidden="true" />
                              </span>
                              <div>
                                <strong>{paciente.nome || 'Nome não informado'}</strong>
                                <span>
                                  <FaEnvelope />
                                  {paciente.email || 'E-mail não informado'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="patients-data-value">
                              {formatCpf(paciente.cpf)}
                            </span>
                            <small>#{paciente.id}</small>
                          </td>
                          <td>
                            <span className="patients-data-value">
                              {formatPhone(paciente.telefone)}
                            </span>
                          </td>
                          <td>
                            {paciente.convenio ? (
                              <span className="patients-plan-badge">
                                <FaShieldAlt />
                                {paciente.convenio}
                              </span>
                            ) : (
                              <span className="patients-plan-badge patients-plan-badge--private">
                                Particular
                              </span>
                            )}
                          </td>
                          <td>
                            <span className="patients-data-value">
                              {age !== null ? `${age} anos` : '-'}
                            </span>
                          </td>
                          <td>{renderActions(paciente)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
              </div>

              <div className="patients-mobile-list">
                {pacientesFiltrados.map((paciente) => {
                  const age = calculateAge(paciente.data_nascimento)

                  return (
                    <article className="patients-mobile-card" key={paciente.id}>
                      <header>
                        <div className="patients-identity">
                          <span className="patients-avatar">
                            {getInitials(paciente.nome)}
                            <i aria-hidden="true" />
                          </span>
                          <div>
                            <strong>{paciente.nome || 'Nome não informado'}</strong>
                            <span>Paciente #{paciente.id}</span>
                          </div>
                        </div>
                        {renderActions(paciente)}
                      </header>

                      <div className="patients-mobile-card__details">
                        <span>
                          <FaIdCard />
                          <span>{formatCpf(paciente.cpf)}</span>
                        </span>
                        <span>
                          <FaPhoneAlt />
                          <span>{formatPhone(paciente.telefone)}</span>
                        </span>
                        <span>
                          <FaEnvelope />
                          <span>{paciente.email || 'E-mail não informado'}</span>
                        </span>
                        <span>
                          <FaCalendarAlt />
                          <span>{age !== null ? `${age} anos` : 'Idade não informada'}</span>
                        </span>
                        {paciente.endereco && (
                          <span>
                            <FaMapMarkerAlt />
                            <span>{paciente.endereco}</span>
                          </span>
                        )}
                      </div>

                      <footer>
                        {paciente.convenio ? (
                          <span className="patients-plan-badge">
                            <FaShieldAlt />
                            {paciente.convenio}
                          </span>
                        ) : (
                          <span className="patients-plan-badge patients-plan-badge--private">
                            Particular
                          </span>
                        )}
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
        onHide={fecharModal}
        centered
        size="lg"
        dialogClassName="patients-form-modal"
      >
        <Modal.Header closeButton={!salvando}>
          <div className="patients-modal-title">
            <span>
              {modoEdicao ? <FaPen /> : <FaUserPlus />}
            </span>
            <div>
              <Modal.Title>
                {modoEdicao ? 'Editar paciente' : 'Cadastrar paciente'}
              </Modal.Title>
              <p>
                {modoEdicao
                  ? 'Atualize os dados administrativos deste paciente.'
                  : 'Vincule um usuário existente ao cadastro de paciente.'}
              </p>
            </div>
          </div>
        </Modal.Header>

        <Form onSubmit={handleSalvarPaciente}>
          <Modal.Body>
            {erroModal && (
              <Alert variant="danger" className="patients-modal-alert">
                {erroModal}
              </Alert>
            )}

            {!modoEdicao && (
              <div className="patients-user-link-callout">
                <span>
                  <FaIdCard />
                </span>
                <div>
                  <strong>Vínculo com usuário</strong>
                  <p>
                    Informe o ID de um usuário já cadastrado com o perfil PACIENTE.
                  </p>
                </div>
              </div>
            )}

            <div className="patients-form-grid">
              {!modoEdicao && (
                <Form.Group className="patients-form-group patients-form-group--full">
                  <Form.Label>ID do usuário PACIENTE</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    name="usuario_id"
                    value={formData.usuario_id}
                    onChange={handleChange}
                    placeholder="Ex.: 128"
                    required
                    disabled={salvando}
                  />
                </Form.Group>
              )}

              {modoEdicao && (
                <>
                  <Form.Group className="patients-form-group">
                    <Form.Label>Nome</Form.Label>
                    <Form.Control type="text" value={formData.nome} disabled />
                  </Form.Group>
                  <Form.Group className="patients-form-group">
                    <Form.Label>E-mail</Form.Label>
                    <Form.Control type="email" value={formData.email} disabled />
                  </Form.Group>
                </>
              )}

              <Form.Group className="patients-form-group">
                <Form.Label>CPF</Form.Label>
                <Form.Control
                  type="text"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleChange}
                  placeholder="000.000.000-00"
                  required
                  disabled={salvando}
                />
              </Form.Group>

              <Form.Group className="patients-form-group">
                <Form.Label>Telefone</Form.Label>
                <Form.Control
                  type="text"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  placeholder="(00) 00000-0000"
                  disabled={salvando}
                />
              </Form.Group>

              <Form.Group className="patients-form-group">
                <Form.Label>Data de nascimento</Form.Label>
                <Form.Control
                  type="date"
                  name="data_nascimento"
                  value={formData.data_nascimento}
                  onChange={handleChange}
                  disabled={salvando}
                />
              </Form.Group>

              <Form.Group className="patients-form-group">
                <Form.Label>Convênio</Form.Label>
                <Form.Control
                  type="text"
                  name="convenio"
                  value={formData.convenio}
                  onChange={handleChange}
                  placeholder="Nome do convênio"
                  disabled={salvando}
                />
              </Form.Group>

              <Form.Group className="patients-form-group patients-form-group--full">
                <Form.Label>Número do convênio</Form.Label>
                <Form.Control
                  type="text"
                  name="numero_convenio"
                  value={formData.numero_convenio}
                  onChange={handleChange}
                  placeholder="Número da carteirinha"
                  disabled={salvando}
                />
              </Form.Group>

              <Form.Group className="patients-form-group patients-form-group--full">
                <Form.Label>Endereço</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="endereco"
                  value={formData.endereco}
                  onChange={handleChange}
                  placeholder="Rua, número, bairro e cidade"
                  disabled={salvando}
                />
              </Form.Group>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="light" onClick={fecharModal} disabled={salvando}>
              Cancelar
            </Button>
            <Button
              className="patients-primary-button"
              type="submit"
              disabled={salvando}
            >
              {salvando ? (
                <>
                  <Spinner animation="border" size="sm" />
                  Salvando...
                </>
              ) : (
                <>
                  <FaCheckCircle />
                  {modoEdicao ? 'Salvar alterações' : 'Cadastrar paciente'}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal
        show={Boolean(pacienteParaExcluir)}
        onHide={fecharConfirmacaoExclusao}
        centered
        dialogClassName="patients-delete-modal"
      >
        <Modal.Body>
          <span className="patients-delete-modal__icon">
            <FaTrash />
          </span>
          <h3>Excluir este paciente?</h3>
          <p>
            O cadastro de <strong>{pacienteParaExcluir?.nome}</strong> será removido.
            Essa ação pode afetar registros vinculados ao paciente.
          </p>

          {erroExclusao && (
            <Alert variant="danger" className="patients-modal-alert">
              {erroExclusao}
            </Alert>
          )}

          <div className="patients-delete-modal__actions">
            <Button
              variant="light"
              onClick={fecharConfirmacaoExclusao}
              disabled={excluindo}
            >
              Manter paciente
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
                  Excluir paciente
                </>
              )}
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </MainLayout>
  )
}

export default PacientesPage
