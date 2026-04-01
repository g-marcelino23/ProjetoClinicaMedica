import { useEffect, useMemo, useState } from 'react'
import {
  Modal,
  Button,
  Form,
  Table,
  Card,
  Row,
  Col,
  Spinner,
  Alert
} from 'react-bootstrap'
import { FaNotesMedical, FaPlus, FaEdit, FaSearch } from 'react-icons/fa'
import MainLayout from '../../components/layout/MainLayout'
import { listarConsultas } from '../../services/consultaService'
import {
  listarProntuarios,
  criarProntuario,
  atualizarProntuario
} from '../../services/prontuariosService'
import { useAuth } from '../../context/AuthContext'

function ProntuariosPage() {
  const { user } = useAuth()

  const [prontuarios, setProntuarios] = useState([])
  const [consultas, setConsultas] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [busca, setBusca] = useState('')

  const [formData, setFormData] = useState({
    id: null,
    consulta_id: '',
    paciente_id: '',
    medico_id: '',
    queixa_principal: '',
    anamnese: '',
    diagnostico: '',
    observacoes: ''
  })

  const perfil = user?.perfil
  const podeCriarProntuario = perfil === 'MEDICO'
  const podeEditarProntuario = perfil === 'MEDICO'

  const carregarDados = async () => {
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
      setErro(error.response?.data?.erro || 'Erro ao carregar os dados dos prontuários.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const formatarData = (data) => {
    if (!data) return ''
    return new Date(data).toLocaleDateString('pt-BR')
  }

  const formatarHora = (hora) => {
    if (!hora) return ''
    return String(hora).slice(0, 5)
  }

  const consultasSemProntuario = useMemo(() => {
    const idsUsados = prontuarios.map((item) => Number(item.consulta_id))

    return consultas.filter((consulta) => !idsUsados.includes(Number(consulta.id)))
  }, [consultas, prontuarios])

  const prontuariosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase()

    return prontuarios.filter((prontuario) => {
      return (
        String(prontuario.id || '').includes(termo) ||
        (prontuario.paciente_nome || '').toLowerCase().includes(termo) ||
        (prontuario.medico_nome || '').toLowerCase().includes(termo) ||
        (prontuario.queixa_principal || '').toLowerCase().includes(termo) ||
        (prontuario.anamnese || '').toLowerCase().includes(termo) ||
        (prontuario.diagnostico || '').toLowerCase().includes(termo)
      )
    })
  }, [busca, prontuarios])

  const limparFormulario = () => {
    setFormData({
      id: null,
      consulta_id: '',
      paciente_id: '',
      medico_id: '',
      queixa_principal: '',
      anamnese: '',
      diagnostico: '',
      observacoes: ''
    })
  }

  const abrirModalCadastro = () => {
    if (!podeCriarProntuario) {
      setErro('Você não tem permissão para cadastrar prontuário.')
      return
    }

    setModoEdicao(false)
    limparFormulario()
    setShowModal(true)
  }

  const abrirModalEdicao = (prontuario) => {
    if (!podeEditarProntuario) {
      setErro('Você não tem permissão para editar prontuário.')
      return
    }

    setModoEdicao(true)
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
    setShowModal(true)
  }

  const fecharModal = () => {
    setShowModal(false)
    limparFormulario()
  }

  const handleChange = (e) => {
    const { name, value } = e.target

    if (name === 'consulta_id') {
      const consultaSelecionada = consultas.find(
        (consulta) => Number(consulta.id) === Number(value)
      )

      setFormData((prev) => ({
        ...prev,
        consulta_id: value,
        paciente_id: consultaSelecionada ? String(consultaSelecionada.paciente_id) : '',
        medico_id: consultaSelecionada ? String(consultaSelecionada.medico_id) : ''
      }))
      return
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const salvarProntuario = async (e) => {
    e.preventDefault()

    if (modoEdicao && !podeEditarProntuario) {
      setErro('Você não tem permissão para editar prontuário.')
      return
    }

    if (!modoEdicao && !podeCriarProntuario) {
      setErro('Você não tem permissão para cadastrar prontuário.')
      return
    }

    if (!formData.consulta_id || !formData.paciente_id || !formData.medico_id) {
      setErro('Consulta, paciente e médico são obrigatórios.')
      return
    }

    const payload = {
      consulta_id: Number(formData.consulta_id),
      paciente_id: Number(formData.paciente_id),
      medico_id: Number(formData.medico_id),
      queixa_principal: formData.queixa_principal,
      anamnese: formData.anamnese,
      diagnostico: formData.diagnostico,
      observacoes: formData.observacoes
    }

    try {
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
        await criarProntuario(payload)
        setSucesso('Prontuário cadastrado com sucesso!')
      }

      fecharModal()
      carregarDados()
    } catch (error) {
      console.error('Erro ao salvar prontuário:', error)
      setErro(error.response?.data?.erro || 'Erro ao salvar prontuário.')
    }
  }

  const totalProntuarios = prontuarios.length

  const prontuariosHoje = prontuarios.filter((item) => {
    if (!item.created_at) return false

    const hoje = new Date().toISOString().split('T')[0]
    const dataItem = new Date(item.created_at).toISOString().split('T')[0]

    return dataItem === hoje
  }).length

  const totalPacientesAtendidos = new Set(
    prontuarios.map((item) => item.paciente_id)
  ).size

  return (
    <MainLayout>
      <Row className="g-3 mb-4">
        <Col md={4}>
          <Card className="border-0 shadow-sm rounded-4 h-100">
            <Card.Body>
              <small className="text-muted">Total de prontuários</small>
              <div className="d-flex justify-content-between align-items-center mt-2">
                <h3 className="fw-bold mb-0">{totalProntuarios}</h3>
                <FaNotesMedical size={24} className="text-primary" />
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="border-0 shadow-sm rounded-4 h-100">
            <Card.Body>
              <small className="text-muted">Registros de hoje</small>
              <h3 className="fw-bold mt-2 mb-0">{prontuariosHoje}</h3>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="border-0 shadow-sm rounded-4 h-100">
            <Card.Body>
              <small className="text-muted">Pacientes atendidos</small>
              <h3 className="fw-bold mt-2 mb-0">{totalPacientesAtendidos}</h3>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {erro && <Alert variant="danger">{erro}</Alert>}
      {sucesso && <Alert variant="success">{sucesso}</Alert>}

      <Card className="border-0 shadow-sm rounded-4">
        <Card.Body>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
            <div>
              <h4 className="fw-bold mb-1">Gestão de Prontuários</h4>
              <p className="text-muted mb-0">
                Registre histórico clínico, anamnese e diagnóstico dos pacientes.
              </p>
            </div>

            <div className="d-flex flex-column flex-sm-row gap-2">
              <div className="position-relative">
                <FaSearch
                  className="position-absolute top-50 translate-middle-y text-muted"
                  style={{ left: '12px' }}
                />
                <Form.Control
                  type="text"
                  placeholder="Buscar prontuário..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="rounded-3 ps-5"
                />
              </div>

              {podeCriarProntuario && (
                <Button
                  variant="primary"
                  className="rounded-3 d-flex align-items-center gap-2"
                  onClick={abrirModalCadastro}
                >
                  <FaPlus />
                  Novo Prontuário
                </Button>
              )}
            </div>
          </div>

          <div className="table-responsive">
            <Table hover align="middle" className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Consulta</th>
                  <th>Paciente</th>
                  <th>Médico</th>
                  <th>Queixa principal</th>
                  <th>Diagnóstico</th>
                  <th>Data</th>
                  <th className="text-center">Ações</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4">
                      <Spinner animation="border" size="sm" className="me-2" />
                      Carregando prontuários...
                    </td>
                  </tr>
                ) : prontuariosFiltrados.length > 0 ? (
                  prontuariosFiltrados.map((prontuario) => (
                    <tr key={prontuario.id}>
                      <td>#{prontuario.id}</td>
                      <td>#{prontuario.consulta_id}</td>
                      <td className="fw-semibold">{prontuario.paciente_nome}</td>
                      <td>{prontuario.medico_nome}</td>
                      <td style={{ maxWidth: '220px' }}>
                        {prontuario.queixa_principal || (
                          <span className="text-muted">Sem queixa principal</span>
                        )}
                      </td>
                      <td style={{ maxWidth: '220px' }}>
                        {prontuario.diagnostico || (
                          <span className="text-muted">Sem diagnóstico</span>
                        )}
                      </td>
                      <td>{formatarData(prontuario.created_at)}</td>
                      <td className="text-center">
                        <div className="d-flex justify-content-center gap-2">
                          {podeEditarProntuario ? (
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="rounded-3"
                              onClick={() => abrirModalEdicao(prontuario)}
                            >
                              <FaEdit />
                            </Button>
                          ) : (
                            <span className="text-muted">Somente visualização</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-muted">
                      Nenhum prontuário encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={fecharModal} centered size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            {modoEdicao ? 'Editar Prontuário' : 'Cadastrar Prontuário'}
          </Modal.Title>
        </Modal.Header>

        <Form onSubmit={salvarProntuario}>
          <Modal.Body>
            <Row>
              <Col md={12} className="mb-3">
                <Form.Label>Consulta</Form.Label>
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
                      Consulta #{consulta.id} - {consulta.paciente_nome} / {consulta.medico_nome} - {formatarData(consulta.data_consulta)} às {formatarHora(consulta.hora_consulta)}
                    </option>
                  ))}
                </Form.Select>
              </Col>

              <Col md={6} className="mb-3">
                <Form.Label>Paciente</Form.Label>
                <Form.Control
                  type="text"
                  value={
                    consultas.find((c) => Number(c.id) === Number(formData.consulta_id))
                      ?.paciente_nome || ''
                  }
                  readOnly
                />
              </Col>

              <Col md={6} className="mb-3">
                <Form.Label>Médico</Form.Label>
                <Form.Control
                  type="text"
                  value={
                    consultas.find((c) => Number(c.id) === Number(formData.consulta_id))
                      ?.medico_nome || ''
                  }
                  readOnly
                />
              </Col>

              <Col md={12} className="mb-3">
                <Form.Label>Queixa principal</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  name="queixa_principal"
                  value={formData.queixa_principal}
                  onChange={handleChange}
                  placeholder="Descreva a queixa principal do paciente"
                />
              </Col>

              <Col md={12} className="mb-3">
                <Form.Label>Anamnese</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="anamnese"
                  value={formData.anamnese}
                  onChange={handleChange}
                  placeholder="Informe a anamnese"
                />
              </Col>

              <Col md={12} className="mb-3">
                <Form.Label>Diagnóstico</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="diagnostico"
                  value={formData.diagnostico}
                  onChange={handleChange}
                  placeholder="Informe o diagnóstico"
                />
              </Col>

              <Col md={12} className="mb-3">
                <Form.Label>Observações</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="observacoes"
                  value={formData.observacoes}
                  onChange={handleChange}
                  placeholder="Observações adicionais"
                />
              </Col>
            </Row>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={fecharModal}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {modoEdicao ? 'Salvar alterações' : 'Cadastrar prontuário'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </MainLayout>
  )
}

export default ProntuariosPage