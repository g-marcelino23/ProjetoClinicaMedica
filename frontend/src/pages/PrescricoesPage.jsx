import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'
import {
  FaCalendarAlt,
  FaCapsules,
  FaClock,
  FaEdit,
  FaEye,
  FaFilePrescription,
  FaNotesMedical,
  FaPills,
  FaPlus,
  FaPrescriptionBottleAlt,
  FaSearch,
  FaSyncAlt,
  FaTrash,
  FaUserInjured,
  FaUserMd,
  FaUsers
} from 'react-icons/fa'
import MainLayout from '../components/layout/MainLayout'
import { useAuth } from '../context/AuthContext'
import { listarConsultas } from '../services/consultaService'
import {
  atualizarPrescricao,
  criarPrescricao,
  deletarPrescricao,
  listarMinhasPrescricoes,
  listarPrescricoes
} from '../services/prescricaoService'
import './PrescricoesPage.css'

const FORM_INICIAL = {
  id: null,
  consulta_id: '',
  medicamento: '',
  dosagem: '',
  frequencia: '',
  duracao: '',
  observacoes: ''
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

function PrescricoesPage() {
  const { user } = useAuth()
  const perfil = user?.perfil
  const podeGerenciar = perfil === 'MEDICO' || perfil === 'SECRETARIO'
  const perfilLabel = {
    MEDICO: 'Médico',
    SECRETARIO: 'Secretário',
    PACIENTE: 'Paciente'
  }[perfil]

  const [prescricoes, setPrescricoes] = useState([])
  const [consultas, setConsultas] = useState([])
  const [formData, setFormData] = useState(FORM_INICIAL)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [erroModal, setErroModal] = useState('')
  const [busca, setBusca] = useState('')
  const [showFormModal, setShowFormModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [prescricaoSelecionada, setPrescricaoSelecionada] = useState(null)

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true)
      setErro('')

      if (perfil === 'PACIENTE') {
        const dados = await listarMinhasPrescricoes()
        setPrescricoes(Array.isArray(dados) ? dados : [])
        setConsultas([])
      } else {
        const [dadosPrescricoes, dadosConsultas] = await Promise.all([
          listarPrescricoes(),
          listarConsultas()
        ])

        setPrescricoes(Array.isArray(dadosPrescricoes) ? dadosPrescricoes : [])
        setConsultas(Array.isArray(dadosConsultas) ? dadosConsultas : [])
      }
    } catch (error) {
      console.error('Erro ao carregar prescrições:', error)
      setErro(error.response?.data?.mensagem || 'Erro ao carregar prescrições.')
    } finally {
      setLoading(false)
    }
  }, [perfil])

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

  const prescricoesFiltradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR')

    if (!termo) return prescricoes

    return prescricoes.filter((prescricao) =>
      [
        prescricao.id,
        prescricao.consulta_id,
        prescricao.paciente_nome,
        prescricao.medico_nome,
        prescricao.medicamento,
        prescricao.dosagem,
        prescricao.frequencia,
        prescricao.duracao,
        prescricao.observacoes
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('pt-BR')
        .includes(termo)
    )
  }, [busca, prescricoes])

  const estatisticas = useMemo(() => {
    const hoje = new Date().toDateString()
    const unicos = new Set(
      prescricoes.map((item) =>
        perfil === 'PACIENTE' ? item.medico_id : item.paciente_id
      )
    ).size

    return {
      total: prescricoes.length,
      hoje: prescricoes.filter((item) => {
        const date = new Date(item.data_prescricao)
        return !Number.isNaN(date.getTime()) && date.toDateString() === hoje
      }).length,
      medicamentos: new Set(
        prescricoes
          .map((item) => item.medicamento?.trim().toLocaleLowerCase('pt-BR'))
          .filter(Boolean)
      ).size,
      relacionados: unicos
    }
  }, [perfil, prescricoes])

  const limparFormulario = () => setFormData(FORM_INICIAL)

  const abrirCadastro = () => {
    if (!podeGerenciar) return
    setModoEdicao(false)
    setErroModal('')
    limparFormulario()
    setShowFormModal(true)
  }

  const abrirEdicao = (prescricao) => {
    if (!podeGerenciar) return

    setModoEdicao(true)
    setErroModal('')
    setFormData({
      id: prescricao.id,
      consulta_id: String(prescricao.consulta_id || ''),
      medicamento: prescricao.medicamento || '',
      dosagem: prescricao.dosagem || '',
      frequencia: prescricao.frequencia || '',
      duracao: prescricao.duracao || '',
      observacoes: prescricao.observacoes || ''
    })
    setShowDetailsModal(false)
    setShowFormModal(true)
  }

  const fecharFormulario = () => {
    if (salvando) return
    setShowFormModal(false)
    setErroModal('')
    limparFormulario()
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setErroModal('')
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const salvarPrescricao = async (event) => {
    event.preventDefault()

    if (!podeGerenciar) {
      setErroModal('Você não tem permissão para salvar prescrições.')
      return
    }

    if (
      !formData.consulta_id ||
      !formData.medicamento.trim() ||
      !formData.dosagem.trim() ||
      !formData.frequencia.trim() ||
      !formData.duracao.trim()
    ) {
      setErroModal('Preencha todos os campos obrigatórios.')
      return
    }

    try {
      setSalvando(true)
      setErroModal('')
      setErro('')
      setMensagem('')

      const dados = {
        medicamento: formData.medicamento.trim(),
        dosagem: formData.dosagem.trim(),
        frequencia: formData.frequencia.trim(),
        duracao: formData.duracao.trim(),
        observacoes: formData.observacoes
      }

      if (modoEdicao) {
        await atualizarPrescricao(formData.id, dados)
        setMensagem('Prescrição atualizada com sucesso!')
      } else {
        await criarPrescricao({
          consulta_id: Number(formData.consulta_id),
          ...dados
        })
        setMensagem('Prescrição criada com sucesso!')
      }

      setShowFormModal(false)
      limparFormulario()
      await carregarDados()
    } catch (error) {
      console.error('Erro ao salvar prescrição:', error)
      setErroModal(error.response?.data?.mensagem || 'Erro ao salvar prescrição.')
    } finally {
      setSalvando(false)
    }
  }

  const abrirDetalhes = (prescricao) => {
    setPrescricaoSelecionada(prescricao)
    setShowDetailsModal(true)
  }

  const fecharDetalhes = () => {
    setShowDetailsModal(false)
    setPrescricaoSelecionada(null)
  }

  const abrirExclusao = (prescricao) => {
    if (!podeGerenciar) return
    setPrescricaoSelecionada(prescricao)
    setShowDeleteModal(true)
  }

  const fecharExclusao = () => {
    if (excluindo) return
    setShowDeleteModal(false)
    setPrescricaoSelecionada(null)
  }

  const confirmarExclusao = async () => {
    if (!prescricaoSelecionada) return

    try {
      setExcluindo(true)
      setErro('')
      setMensagem('')
      await deletarPrescricao(prescricaoSelecionada.id)
      setMensagem('Prescrição excluída com sucesso!')
      setShowDeleteModal(false)
      setPrescricaoSelecionada(null)
      await carregarDados()
    } catch (error) {
      console.error('Erro ao excluir prescrição:', error)
      setErro(error.response?.data?.mensagem || 'Erro ao excluir prescrição.')
    } finally {
      setExcluindo(false)
    }
  }

  const renderAcoes = (prescricao) => (
    <div className="prescriptions-actions">
      <button
        type="button"
        className="prescriptions-action prescriptions-action--view"
        onClick={() => abrirDetalhes(prescricao)}
        title="Visualizar prescrição"
        aria-label={`Visualizar prescrição de ${prescricao.medicamento}`}
      >
        <FaEye />
      </button>
      {podeGerenciar && (
        <>
          <button
            type="button"
            className="prescriptions-action prescriptions-action--edit"
            onClick={() => abrirEdicao(prescricao)}
            title="Editar prescrição"
            aria-label={`Editar prescrição de ${prescricao.medicamento}`}
          >
            <FaEdit />
          </button>
          <button
            type="button"
            className="prescriptions-action prescriptions-action--delete"
            onClick={() => abrirExclusao(prescricao)}
            title="Excluir prescrição"
            aria-label={`Excluir prescrição de ${prescricao.medicamento}`}
          >
            <FaTrash />
          </button>
        </>
      )}
    </div>
  )

  return (
    <MainLayout>
      <div className="prescriptions-page">
        <section className="prescriptions-hero">
          <div className="prescriptions-hero__content">
            <span className="prescriptions-hero__eyebrow">
              <FaFilePrescription />
              Terapia medicamentosa
            </span>
            <h1>
              Prescrições organizadas para um tratamento <span>mais seguro</span>
            </h1>
            <p>
              Consulte medicamentos, dosagens e orientações com clareza em todas
              as etapas do acompanhamento do paciente.
            </p>
          </div>

          <div className="prescriptions-hero__actions">
            <div className="prescriptions-hero__profile">
              <FaNotesMedical />
              <span>
                <small>Visualização atual</small>
                <strong>{perfilLabel || 'Usuário'}</strong>
              </span>
            </div>
            {podeGerenciar && (
              <Button className="prescriptions-add-button" onClick={abrirCadastro}>
                <FaPlus />
                Nova prescrição
              </Button>
            )}
          </div>

          <FaPrescriptionBottleAlt
            className="prescriptions-hero__decoration"
            aria-hidden="true"
          />
        </section>

        {mensagem && (
          <Alert
            variant="success"
            className="prescriptions-feedback"
            dismissible
            onClose={() => setMensagem('')}
          >
            {mensagem}
          </Alert>
        )}
        {erro && (
          <Alert
            variant="danger"
            className="prescriptions-feedback"
            dismissible
            onClose={() => setErro('')}
          >
            {erro}
          </Alert>
        )}

        <section className="prescriptions-stats" aria-label="Resumo das prescrições">
          <article className="prescriptions-stat prescriptions-stat--blue">
            <span><FaFilePrescription /></span>
            <div><small>Total de prescrições</small><strong>{estatisticas.total}</strong><p>Registros disponíveis</p></div>
          </article>
          <article className="prescriptions-stat prescriptions-stat--green">
            <span><FaCalendarAlt /></span>
            <div><small>Prescritas hoje</small><strong>{estatisticas.hoje}</strong><p>Novas nesta data</p></div>
          </article>
          <article className="prescriptions-stat prescriptions-stat--violet">
            <span><FaPills /></span>
            <div><small>Medicamentos</small><strong>{estatisticas.medicamentos}</strong><p>Medicamentos distintos</p></div>
          </article>
          <article className="prescriptions-stat prescriptions-stat--amber">
            <span>{perfil === 'PACIENTE' ? <FaUserMd /> : <FaUsers />}</span>
            <div>
              <small>{perfil === 'PACIENTE' ? 'Médicos prescritores' : 'Pacientes atendidos'}</small>
              <strong>{estatisticas.relacionados}</strong>
              <p>Vínculos distintos</p>
            </div>
          </article>
        </section>

        <section className="prescriptions-workspace">
          <div className="prescriptions-workspace__header">
            <div className="prescriptions-workspace__title">
              <span><FaCapsules /></span>
              <div>
                <small>Central de medicamentos</small>
                <h2>{perfil === 'PACIENTE' ? 'Minhas prescrições' : 'Prescrições dos pacientes'}</h2>
                <p>{prescricoesFiltradas.length} {prescricoesFiltradas.length === 1 ? 'registro exibido' : 'registros exibidos'}</p>
              </div>
            </div>
            <div className="prescriptions-toolbar">
              <div className="prescriptions-search">
                <FaSearch />
                <Form.Control
                  type="search"
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar medicamento ou paciente..."
                  aria-label="Buscar prescrições"
                />
              </div>
              <button
                type="button"
                className="prescriptions-refresh"
                onClick={carregarDados}
                disabled={loading}
                aria-label="Atualizar prescrições"
                title="Atualizar prescrições"
              >
                <FaSyncAlt className={loading ? 'is-spinning' : ''} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="prescriptions-loading">
              <span><Spinner animation="border" /></span>
              <strong>Carregando prescrições</strong>
              <p>Estamos organizando os medicamentos e orientações.</p>
            </div>
          ) : prescricoesFiltradas.length > 0 ? (
            <>
              <div className="prescriptions-table-wrap">
                <table className="prescriptions-table">
                  <thead>
                    <tr>
                      <th>Prescrição</th>
                      <th>{perfil === 'PACIENTE' ? 'Médico' : 'Paciente'}</th>
                      <th>Dosagem</th>
                      <th>Frequência</th>
                      <th>Duração</th>
                      <th>Data</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescricoesFiltradas.map((prescricao) => (
                      <tr key={prescricao.id}>
                        <td>
                          <div className="prescriptions-medicine">
                            <span><FaPills /></span>
                            <div>
                              <strong>{prescricao.medicamento}</strong>
                              <small>Prescrição #{prescricao.id} · Consulta #{prescricao.consulta_id}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="prescriptions-person">
                            <span className={perfil === 'PACIENTE' ? 'is-doctor' : ''}>
                              {obterIniciais(perfil === 'PACIENTE' ? prescricao.medico_nome : prescricao.paciente_nome)}
                            </span>
                            <strong>{(perfil === 'PACIENTE' ? prescricao.medico_nome : prescricao.paciente_nome) || 'Não informado'}</strong>
                          </div>
                        </td>
                        <td><span className="prescriptions-dose">{prescricao.dosagem}</span></td>
                        <td>{prescricao.frequencia}</td>
                        <td>{prescricao.duracao}</td>
                        <td><span className="prescriptions-date">{formatarDataHora(prescricao.data_prescricao)}</span></td>
                        <td>{renderAcoes(prescricao)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="prescriptions-mobile-list">
                {prescricoesFiltradas.map((prescricao) => (
                  <article key={prescricao.id} className="prescriptions-mobile-card">
                    <div className="prescriptions-mobile-card__header">
                      <div className="prescriptions-medicine">
                        <span><FaPills /></span>
                        <div>
                          <strong>{prescricao.medicamento}</strong>
                          <small>Prescrição #{prescricao.id}</small>
                        </div>
                      </div>
                      {renderAcoes(prescricao)}
                    </div>
                    <div className="prescriptions-mobile-card__person">
                      <span>{perfil === 'PACIENTE' ? 'Médico' : 'Paciente'}</span>
                      <strong>{(perfil === 'PACIENTE' ? prescricao.medico_nome : prescricao.paciente_nome) || 'Não informado'}</strong>
                    </div>
                    <div className="prescriptions-mobile-card__details">
                      <div><span>Dosagem</span><strong>{prescricao.dosagem}</strong></div>
                      <div><span>Frequência</span><strong>{prescricao.frequencia}</strong></div>
                      <div><span>Duração</span><strong>{prescricao.duracao}</strong></div>
                      <div><span>Prescrita em</span><strong>{formatarDataHora(prescricao.data_prescricao)}</strong></div>
                    </div>
                    {prescricao.observacoes && (
                      <p className="prescriptions-mobile-card__note">
                        <span>Observações</span>{prescricao.observacoes}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="prescriptions-empty">
              {busca ? <FaSearch /> : <FaFilePrescription />}
              <h3>{busca ? 'Nenhuma prescrição encontrada' : 'Nenhuma prescrição disponível'}</h3>
              <p>{busca ? 'Tente buscar por outro medicamento ou paciente.' : 'As prescrições aparecerão aqui após o cadastro.'}</p>
              {busca ? (
                <Button variant="light" onClick={() => setBusca('')}>Limpar busca</Button>
              ) : (
                podeGerenciar && <Button className="prescriptions-empty__button" onClick={abrirCadastro}><FaPlus />Nova prescrição</Button>
              )}
            </div>
          )}
        </section>
      </div>

      <Modal show={showFormModal} onHide={fecharFormulario} centered size="lg" dialogClassName="prescriptions-form-modal">
        <Form onSubmit={salvarPrescricao}>
          <Modal.Header closeButton={!salvando}>
            <div className="prescriptions-modal-heading">
              <span>{modoEdicao ? <FaEdit /> : <FaFilePrescription />}</span>
              <div>
                <small>{modoEdicao ? 'Atualização terapêutica' : 'Nova orientação terapêutica'}</small>
                <Modal.Title>{modoEdicao ? 'Editar prescrição' : 'Cadastrar prescrição'}</Modal.Title>
                <p>Informe o medicamento e as orientações de uso.</p>
              </div>
            </div>
          </Modal.Header>
          <Modal.Body>
            {erroModal && <Alert variant="danger" className="prescriptions-modal-alert">{erroModal}</Alert>}

            <div className="prescriptions-modal-section-title"><FaCalendarAlt />Consulta vinculada</div>
            <Form.Group className="prescriptions-modal-field">
              <Form.Label>Consulta <span>*</span></Form.Label>
              <Form.Select name="consulta_id" value={formData.consulta_id} onChange={handleChange} disabled={modoEdicao} required>
                <option value="">Selecione uma consulta</option>
                {consultas.map((consulta) => (
                  <option key={consulta.id} value={consulta.id}>
                    Consulta #{consulta.id} — {consulta.paciente_nome} / {consulta.medico_nome}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            {consultaSelecionada && (
              <div className="prescriptions-consultation-summary">
                <div><FaUserInjured /><span><small>Paciente</small><strong>{consultaSelecionada.paciente_nome}</strong></span></div>
                <div><FaUserMd /><span><small>Médico</small><strong>{consultaSelecionada.medico_nome}</strong></span></div>
              </div>
            )}

            <div className="prescriptions-modal-section-title"><FaPills />Medicamento e posologia</div>
            <div className="prescriptions-modal-grid">
              <Form.Group className="prescriptions-modal-field prescriptions-modal-field--full">
                <Form.Label>Medicamento <span>*</span></Form.Label>
                <Form.Control name="medicamento" value={formData.medicamento} onChange={handleChange} placeholder="Ex.: Amoxicilina 500 mg" required />
              </Form.Group>
              <Form.Group className="prescriptions-modal-field">
                <Form.Label>Dosagem <span>*</span></Form.Label>
                <Form.Control name="dosagem" value={formData.dosagem} onChange={handleChange} placeholder="Ex.: 1 comprimido" required />
              </Form.Group>
              <Form.Group className="prescriptions-modal-field">
                <Form.Label>Frequência <span>*</span></Form.Label>
                <Form.Control name="frequencia" value={formData.frequencia} onChange={handleChange} placeholder="Ex.: A cada 8 horas" required />
              </Form.Group>
              <Form.Group className="prescriptions-modal-field">
                <Form.Label>Duração <span>*</span></Form.Label>
                <Form.Control name="duracao" value={formData.duracao} onChange={handleChange} placeholder="Ex.: 7 dias" required />
              </Form.Group>
              <Form.Group className="prescriptions-modal-field prescriptions-modal-field--full">
                <Form.Label>Observações</Form.Label>
                <Form.Control as="textarea" rows={4} name="observacoes" value={formData.observacoes} onChange={handleChange} placeholder="Orientações adicionais, cuidados ou recomendações" />
              </Form.Group>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button type="button" variant="light" onClick={fecharFormulario} disabled={salvando}>Cancelar</Button>
            <Button type="submit" className="prescriptions-modal-submit" disabled={salvando}>
              {salvando ? <><Spinner animation="border" size="sm" />Salvando</> : <><FaFilePrescription />{modoEdicao ? 'Salvar alterações' : 'Cadastrar prescrição'}</>}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showDetailsModal} onHide={fecharDetalhes} centered dialogClassName="prescriptions-details-modal">
        <Modal.Header closeButton>
          <div className="prescriptions-modal-heading">
            <span><FaFilePrescription /></span>
            <div><small>Orientação terapêutica</small><Modal.Title>{prescricaoSelecionada?.medicamento}</Modal.Title><p>Prescrição #{prescricaoSelecionada?.id}</p></div>
          </div>
        </Modal.Header>
        <Modal.Body>
          <div className="prescriptions-details-patient">
            <span><FaUserInjured /></span>
            <div><small>Paciente</small><strong>{prescricaoSelecionada?.paciente_nome || (perfil === 'PACIENTE' ? user?.nome : 'Não informado')}</strong></div>
          </div>
          <div className="prescriptions-details-grid">
            <section><FaCapsules /><span>Dosagem</span><strong>{prescricaoSelecionada?.dosagem}</strong></section>
            <section><FaClock /><span>Frequência</span><strong>{prescricaoSelecionada?.frequencia}</strong></section>
            <section><FaCalendarAlt /><span>Duração</span><strong>{prescricaoSelecionada?.duracao}</strong></section>
            <section><FaUserMd /><span>Médico</span><strong>{prescricaoSelecionada?.medico_nome || 'Não informado'}</strong></section>
          </div>
          <div className="prescriptions-details-note">
            <span>Observações</span>
            <p>{prescricaoSelecionada?.observacoes || 'Nenhuma observação adicional.'}</p>
          </div>
          <div className="prescriptions-details-date"><FaCalendarAlt />Prescrita em {formatarDataHora(prescricaoSelecionada?.data_prescricao)}</div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={fecharDetalhes}>Fechar</Button>
          {podeGerenciar && prescricaoSelecionada && <Button className="prescriptions-modal-submit" onClick={() => abrirEdicao(prescricaoSelecionada)}><FaEdit />Editar</Button>}
        </Modal.Footer>
      </Modal>

      <Modal show={showDeleteModal} onHide={fecharExclusao} centered dialogClassName="prescriptions-delete-modal">
        <Modal.Body>
          <span className="prescriptions-delete-modal__icon"><FaTrash /></span>
          <h2>Excluir prescrição?</h2>
          <p>A prescrição de <strong>{prescricaoSelecionada?.medicamento}</strong> será removida permanentemente.</p>
          <div>
            <Button variant="light" onClick={fecharExclusao} disabled={excluindo}>Manter prescrição</Button>
            <Button variant="danger" onClick={confirmarExclusao} disabled={excluindo}>
              {excluindo ? <><Spinner animation="border" size="sm" />Excluindo</> : <><FaTrash />Excluir</>}
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </MainLayout>
  )
}

export default PrescricoesPage
