import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'
import { useNavigate } from 'react-router'
import {
  FaAward,
  FaCheckCircle,
  FaEnvelope,
  FaHeartbeat,
  FaIdCard,
  FaPen,
  FaPhoneAlt,
  FaPlus,
  FaSearch,
  FaStethoscope,
  FaSyncAlt,
  FaTrash,
  FaUserMd,
  FaUserPlus,
  FaUsers
} from 'react-icons/fa'
import MainLayout from '../../components/layout/MainLayout'
import {
  atualizarMedico,
  criarMedico,
  excluirMedico as excluirMedicoApi,
  listarMedicos
} from '../../services/medicosService'
import './MedicosPage.css'

const EMPTY_FORM = {
  id: null,
  usuario_id: '',
  nome: '',
  email: '',
  crm: '',
  especialidade: '',
  telefone: ''
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

function formatPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '')

  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }

  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }

  return phone || 'Não informado'
}

function MedicosPage() {
  const navigate = useNavigate()
  const [medicos, setMedicos] = useState([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [erroModal, setErroModal] = useState('')
  const [erroExclusao, setErroExclusao] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [medicoParaExcluir, setMedicoParaExcluir] = useState(null)
  const [busca, setBusca] = useState('')
  const [filtroEspecialidade, setFiltroEspecialidade] = useState('TODAS')
  const [formData, setFormData] = useState(EMPTY_FORM)

  const carregarMedicos = useCallback(async () => {
    try {
      setLoading(true)
      setErro('')
      const dados = await listarMedicos()
      setMedicos(Array.isArray(dados) ? dados : [])
    } catch (error) {
      console.error('Erro ao carregar médicos:', error)
      setErro(error.response?.data?.erro || 'Erro ao carregar médicos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarMedicos()
  }, [carregarMedicos])

  const especialidades = useMemo(
    () =>
      Array.from(
        new Set(
          medicos
            .map((medico) => medico.especialidade?.trim())
            .filter(Boolean)
        )
      ).sort((first, second) => first.localeCompare(second, 'pt-BR')),
    [medicos]
  )

  const indicadores = useMemo(() => {
    const withPhone = medicos.filter((medico) => Boolean(medico.telefone?.trim())).length
    const completeProfiles = medicos.filter(
      (medico) =>
        Boolean(medico.crm?.trim()) &&
        Boolean(medico.especialidade?.trim()) &&
        Boolean(medico.telefone?.trim())
    ).length
    const specialtyCounts = medicos.reduce((counts, medico) => {
      const specialty = medico.especialidade?.trim()

      if (specialty) {
        counts[specialty] = (counts[specialty] || 0) + 1
      }

      return counts
    }, {})
    const leadingSpecialty =
      Object.entries(specialtyCounts).sort((first, second) => second[1] - first[1])[0] ||
      null

    return {
      total: medicos.length,
      specialties: especialidades.length,
      withPhone,
      completeProfiles,
      leadingSpecialty
    }
  }, [medicos, especialidades.length])

  const medicosFiltrados = useMemo(() => {
    const term = busca.trim().toLocaleLowerCase('pt-BR')

    return medicos
      .filter((medico) => {
        const matchesSearch =
          !term ||
          [
            medico.nome,
            medico.email,
            medico.crm,
            medico.especialidade,
            medico.telefone
          ].some((value) =>
            String(value || '')
              .toLocaleLowerCase('pt-BR')
              .includes(term)
          )
        const matchesSpecialty =
          filtroEspecialidade === 'TODAS' ||
          medico.especialidade === filtroEspecialidade

        return matchesSearch && matchesSpecialty
      })
      .sort((first, second) =>
        String(first.nome || '').localeCompare(String(second.nome || ''), 'pt-BR')
      )
  }, [medicos, busca, filtroEspecialidade])

  const filtrosAtivos = Boolean(busca || filtroEspecialidade !== 'TODAS')

  const limparFiltros = () => {
    setBusca('')
    setFiltroEspecialidade('TODAS')
  }

  const abrirCadastroUsuario = () => navigate('/cadastro/medico')

  const abrirModalVinculo = () => {
    setModoEdicao(false)
    setErroModal('')
    setFormData(EMPTY_FORM)
    setShowModal(true)
  }

  const abrirModalEdicao = (medico) => {
    setModoEdicao(true)
    setErroModal('')
    setFormData({
      id: medico.id,
      usuario_id: medico.usuario_id || '',
      nome: medico.nome || '',
      email: medico.email || '',
      crm: medico.crm || '',
      especialidade: medico.especialidade || '',
      telefone: medico.telefone || ''
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

  const handleSalvarMedico = async (event) => {
    event.preventDefault()

    if (
      !modoEdicao &&
      (!formData.usuario_id || !formData.crm || !formData.especialidade)
    ) {
      setErroModal('O ID do usuário, CRM e especialidade são obrigatórios.')
      return
    }

    try {
      setSalvando(true)
      setErroModal('')
      setErro('')
      setSucesso('')

      if (modoEdicao) {
        await atualizarMedico(formData.id, {
          crm: formData.crm,
          especialidade: formData.especialidade,
          telefone: formData.telefone
        })
        setSucesso('Médico atualizado com sucesso.')
      } else {
        await criarMedico({
          usuario_id: Number(formData.usuario_id),
          crm: formData.crm,
          especialidade: formData.especialidade,
          telefone: formData.telefone
        })
        setSucesso('Usuário MEDICO vinculado com sucesso.')
      }

      setShowModal(false)
      setFormData(EMPTY_FORM)
      await carregarMedicos()
    } catch (error) {
      console.error('Erro ao salvar médico:', error)
      setErroModal(
        error.response?.data?.erro ||
          error.response?.data?.message ||
          'Erro ao salvar médico.'
      )
    } finally {
      setSalvando(false)
    }
  }

  const abrirConfirmacaoExclusao = (medico) => {
    setErroExclusao('')
    setMedicoParaExcluir(medico)
  }

  const fecharConfirmacaoExclusao = () => {
    if (excluindo) return

    setMedicoParaExcluir(null)
    setErroExclusao('')
  }

  const confirmarExclusao = async () => {
    if (!medicoParaExcluir) return

    try {
      setExcluindo(true)
      setErroExclusao('')
      setErro('')
      setSucesso('')
      await excluirMedicoApi(medicoParaExcluir.id)
      setMedicoParaExcluir(null)
      setSucesso('Médico excluído com sucesso.')
      await carregarMedicos()
    } catch (error) {
      console.error('Erro ao excluir médico:', error)
      setErroExclusao(
        error.response?.data?.erro ||
          error.response?.data?.message ||
          'Erro ao excluir médico.'
      )
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <MainLayout>
      <div className="doctors-page">
        <section className="doctors-hero">
          <div className="doctors-hero__content">
            <span className="doctors-eyebrow">
              <FaHeartbeat />
              Corpo clínico
            </span>
            <h1>Equipe médica</h1>
            <p>
              Gerencie os profissionais, especialidades e contatos que compõem o
              atendimento da clínica.
            </p>
          </div>

          <div className="doctors-hero__actions">
            <button
              type="button"
              className="doctors-refresh-button"
              onClick={carregarMedicos}
              disabled={loading}
              title="Atualizar médicos"
              aria-label="Atualizar médicos"
            >
              <FaSyncAlt className={loading ? 'is-spinning' : ''} />
            </button>
            <Button variant="light" onClick={abrirModalVinculo}>
              <FaIdCard />
              Vincular usuário existente
            </Button>
            <Button className="doctors-primary-button" onClick={abrirCadastroUsuario}>
              <FaUserPlus />
              Novo médico
            </Button>
          </div>

          <FaStethoscope className="doctors-hero__decoration" aria-hidden="true" />
        </section>

        <section className="doctors-stats" aria-label="Resumo da equipe médica">
          <article className="doctors-stat-card">
            <span className="doctors-stat-card__icon doctors-stat-card__icon--blue">
              <FaUsers />
            </span>
            <div>
              <small>Total de médicos</small>
              <strong>{indicadores.total}</strong>
              <span>profissionais cadastrados</span>
            </div>
          </article>

          <article className="doctors-stat-card">
            <span className="doctors-stat-card__icon doctors-stat-card__icon--violet">
              <FaStethoscope />
            </span>
            <div>
              <small>Especialidades</small>
              <strong>{indicadores.specialties}</strong>
              <span>áreas de atendimento</span>
            </div>
          </article>

          <article className="doctors-stat-card">
            <span className="doctors-stat-card__icon doctors-stat-card__icon--green">
              <FaPhoneAlt />
            </span>
            <div>
              <small>Com contato</small>
              <strong>{indicadores.withPhone}</strong>
              <span>telefones informados</span>
            </div>
          </article>

          <article className="doctors-stat-card">
            <span className="doctors-stat-card__icon doctors-stat-card__icon--amber">
              <FaAward />
            </span>
            <div>
              <small>Perfis completos</small>
              <strong>{indicadores.completeProfiles}</strong>
              <span>
                {indicadores.leadingSpecialty
                  ? `Destaque: ${indicadores.leadingSpecialty[0]}`
                  : 'Dados da equipe'}
              </span>
            </div>
          </article>
        </section>

        {erro && (
          <Alert
            variant="danger"
            dismissible
            onClose={() => setErro('')}
            className="doctors-feedback"
          >
            {erro}
          </Alert>
        )}

        {sucesso && (
          <Alert
            variant="success"
            dismissible
            onClose={() => setSucesso('')}
            className="doctors-feedback"
          >
            {sucesso}
          </Alert>
        )}

        <section className="doctors-directory">
          <header className="doctors-directory__header">
            <div>
              <span className="doctors-section-eyebrow">Diretório profissional</span>
              <h2>Médicos cadastrados</h2>
              <p>
                {loading
                  ? 'Atualizando equipe...'
                  : `${medicosFiltrados.length} ${
                      medicosFiltrados.length === 1
                        ? 'profissional encontrado'
                        : 'profissionais encontrados'
                    }`}
              </p>
            </div>

            <div className="doctors-filters">
              <div className="doctors-search">
                <FaSearch aria-hidden="true" />
                <input
                  type="search"
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar nome, CRM, contato ou especialidade"
                  aria-label="Buscar médicos"
                />
              </div>

              <Form.Select
                value={filtroEspecialidade}
                onChange={(event) => setFiltroEspecialidade(event.target.value)}
                aria-label="Filtrar médicos por especialidade"
                className="doctors-filter-select"
              >
                <option value="TODAS">Todas as especialidades</option>
                {especialidades.map((specialty) => (
                  <option key={specialty} value={specialty}>
                    {specialty}
                  </option>
                ))}
              </Form.Select>

              {filtrosAtivos && (
                <button
                  type="button"
                  className="doctors-clear-filters"
                  onClick={limparFiltros}
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </header>

          {loading ? (
            <div className="doctors-loading">
              <span>
                <Spinner animation="border" />
              </span>
              <strong>Carregando equipe médica</strong>
              <p>Organizando as informações dos profissionais...</p>
            </div>
          ) : medicos.length === 0 ? (
            <div className="doctors-empty">
              <span>
                <FaUserPlus />
              </span>
              <h3>Nenhum médico cadastrado</h3>
              <p>Adicione o primeiro profissional ao corpo clínico.</p>
              <Button className="doctors-primary-button" onClick={abrirCadastroUsuario}>
                <FaPlus />
                Cadastrar médico
              </Button>
            </div>
          ) : medicosFiltrados.length === 0 ? (
            <div className="doctors-empty doctors-empty--compact">
              <span>
                <FaSearch />
              </span>
              <h3>Nenhum resultado encontrado</h3>
              <p>Tente buscar outro termo ou selecionar uma especialidade diferente.</p>
              <button
                type="button"
                className="doctors-clear-filters"
                onClick={limparFiltros}
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="doctors-grid">
              {medicosFiltrados.map((medico) => (
                <article className="doctor-card" key={medico.id}>
                  <header className="doctor-card__header">
                    <span className="doctor-avatar">
                      {getInitials(medico.nome)}
                      <i aria-hidden="true" />
                    </span>
                    <div className="doctor-card__identity">
                      <h3>{medico.nome || 'Nome não informado'}</h3>
                      <span>
                        <FaIdCard />
                        {medico.crm || 'CRM não informado'}
                      </span>
                    </div>
                    <span className="doctor-card__specialty">
                      <FaStethoscope />
                      {medico.especialidade || 'Sem especialidade'}
                    </span>
                  </header>

                  <div className="doctor-card__details">
                    <div>
                      <span className="doctor-card__detail-icon doctor-card__detail-icon--blue">
                        <FaEnvelope />
                      </span>
                      <div>
                        <small>E-mail profissional</small>
                        <strong>{medico.email || 'Não informado'}</strong>
                      </div>
                    </div>
                    <div>
                      <span className="doctor-card__detail-icon doctor-card__detail-icon--green">
                        <FaPhoneAlt />
                      </span>
                      <div>
                        <small>Telefone</small>
                        <strong>{formatPhone(medico.telefone)}</strong>
                      </div>
                    </div>
                  </div>

                  <footer className="doctor-card__footer">
                    <span>Cadastro #{medico.id}</span>
                    <div className="doctors-actions">
                      <button
                        type="button"
                        className="doctors-icon-button"
                        onClick={() => abrirModalEdicao(medico)}
                        title="Editar médico"
                        aria-label={`Editar médico ${medico.nome}`}
                      >
                        <FaPen />
                      </button>
                      <button
                        type="button"
                        className="doctors-icon-button doctors-icon-button--danger"
                        onClick={() => abrirConfirmacaoExclusao(medico)}
                        title="Excluir médico"
                        aria-label={`Excluir médico ${medico.nome}`}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </footer>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <Modal
        show={showModal}
        onHide={fecharModal}
        centered
        size="lg"
        dialogClassName="doctors-form-modal"
      >
        <Modal.Header closeButton={!salvando}>
          <div className="doctors-modal-title">
            <span>
              {modoEdicao ? <FaPen /> : <FaUserPlus />}
            </span>
            <div>
              <Modal.Title>
                {modoEdicao ? 'Editar médico' : 'Vincular usuário MEDICO existente'}
              </Modal.Title>
              <p>
                {modoEdicao
                  ? 'Atualize os dados profissionais deste médico.'
                  : 'Vincule um usuário existente ao corpo clínico.'}
              </p>
            </div>
          </div>
        </Modal.Header>

        <Form onSubmit={handleSalvarMedico}>
          <Modal.Body>
            {erroModal && (
              <Alert variant="danger" className="doctors-modal-alert">
                {erroModal}
              </Alert>
            )}

            {!modoEdicao && (
              <div className="doctors-user-link-callout">
                <span>
                  <FaIdCard />
                </span>
                <div>
                  <strong>Vínculo com usuário</strong>
                  <p>
                    Informe o ID de um usuário já cadastrado com o perfil MEDICO.
                  </p>
                </div>
              </div>
            )}

            <div className="doctors-form-grid">
              {!modoEdicao && (
                <Form.Group className="doctors-form-group doctors-form-group--full">
                  <Form.Label>ID do usuário MEDICO</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    name="usuario_id"
                    value={formData.usuario_id}
                    onChange={handleChange}
                    placeholder="Ex.: 42"
                    required
                    disabled={salvando}
                  />
                </Form.Group>
              )}

              {modoEdicao && (
                <>
                  <Form.Group className="doctors-form-group">
                    <Form.Label>Nome</Form.Label>
                    <Form.Control type="text" value={formData.nome} disabled />
                  </Form.Group>
                  <Form.Group className="doctors-form-group">
                    <Form.Label>E-mail</Form.Label>
                    <Form.Control type="email" value={formData.email} disabled />
                  </Form.Group>
                </>
              )}

              <Form.Group className="doctors-form-group">
                <Form.Label>CRM</Form.Label>
                <Form.Control
                  type="text"
                  name="crm"
                  value={formData.crm}
                  onChange={handleChange}
                  placeholder="Ex.: 123456-CE"
                  required
                  disabled={salvando}
                />
              </Form.Group>

              <Form.Group className="doctors-form-group">
                <Form.Label>Especialidade</Form.Label>
                <Form.Control
                  type="text"
                  name="especialidade"
                  value={formData.especialidade}
                  onChange={handleChange}
                  placeholder="Ex.: Cardiologia"
                  required
                  disabled={salvando}
                />
              </Form.Group>

              <Form.Group className="doctors-form-group doctors-form-group--full">
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
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="light" onClick={fecharModal} disabled={salvando}>
              Cancelar
            </Button>
            <Button
              className="doctors-primary-button"
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
                  {modoEdicao ? 'Salvar alterações' : 'Vincular usuário'}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal
        show={Boolean(medicoParaExcluir)}
        onHide={fecharConfirmacaoExclusao}
        centered
        dialogClassName="doctors-delete-modal"
      >
        <Modal.Body>
          <span className="doctors-delete-modal__icon">
            <FaTrash />
          </span>
          <h3>Excluir este médico?</h3>
          <p>
            O cadastro de <strong>{medicoParaExcluir?.nome}</strong> será removido.
            Essa ação pode afetar agendas e registros vinculados ao profissional.
          </p>

          {erroExclusao && (
            <Alert variant="danger" className="doctors-modal-alert">
              {erroExclusao}
            </Alert>
          )}

          <div className="doctors-delete-modal__actions">
            <Button
              variant="light"
              onClick={fecharConfirmacaoExclusao}
              disabled={excluindo}
            >
              Manter médico
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
                  Excluir médico
                </>
              )}
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </MainLayout>
  )
}

export default MedicosPage
