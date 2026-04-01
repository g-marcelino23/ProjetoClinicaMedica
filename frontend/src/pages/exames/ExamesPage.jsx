import { useEffect, useMemo, useState } from 'react'
import {
  Modal,
  Button,
  Form,
  Table,
  Badge,
  Card,
  Row,
  Col,
  Alert,
  Spinner
} from 'react-bootstrap'
import { FaFlask, FaPlus, FaEdit, FaTrash, FaSearch } from 'react-icons/fa'
import MainLayout from '../../components/layout/MainLayout'
import {
  listarExames,
  criarExame,
  atualizarExame,
  deletarExame
} from '../../services/exameService'
import { listarConsultas } from '../../services/consultaService'
import { useAuth } from '../../context/AuthContext'

function ExamesPage() {
  const { user } = useAuth()

  const [exames, setExames] = useState([])
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
    nome_exame: '',
    descricao: '',
    status: 'SOLICITADO',
    data_exame: '',
    resultado: '',
    observacoes: ''
  })

  const perfil = user?.perfil
  const podeCriarExame = perfil === 'MEDICO' || perfil === 'SECRETARIO'
  const podeEditarExame = perfil === 'MEDICO' || perfil === 'SECRETARIO'
  const podeExcluirExame = perfil === 'SECRETARIO'

  const precisaResultado =
    formData.status === 'REALIZADO' || formData.status === 'ENTREGUE'

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
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
  }

  const formatarData = (data) => {
    if (!data) return ''
    return new Date(data).toLocaleDateString('pt-BR')
  }

  const examesFiltrados = useMemo(() => {
    const termo = busca.toLowerCase()

    return exames.filter((exame) => {
      return (
        (exame.nome_exame || '').toLowerCase().includes(termo) ||
        (exame.paciente_nome || '').toLowerCase().includes(termo) ||
        (exame.medico_nome || '').toLowerCase().includes(termo) ||
        (exame.status || '').toLowerCase().includes(termo)
      )
    })
  }, [busca, exames])

  const limparFormulario = () => {
    setFormData({
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
    })
  }

  const abrirModalCadastro = () => {
    if (!podeCriarExame) {
      setErro('Você não tem permissão para cadastrar exame.')
      return
    }

    setModoEdicao(false)
    limparFormulario()
    setShowModal(true)
  }

  const abrirModalEdicao = (exame) => {
    if (!podeEditarExame) {
      setErro('Você não tem permissão para editar exame.')
      return
    }

    setModoEdicao(true)
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

    if (name === 'status') {
      setFormData((prev) => ({
        ...prev,
        status: value,
        resultado:
          value === 'REALIZADO' || value === 'ENTREGUE'
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

  const salvarExame = async (e) => {
    e.preventDefault()

    if (modoEdicao && !podeEditarExame) {
      setErro('Você não tem permissão para editar exame.')
      return
    }

    if (!modoEdicao && !podeCriarExame) {
      setErro('Você não tem permissão para cadastrar exame.')
      return
    }

    try {
      setErro('')
      setSucesso('')

      if (
        !formData.consulta_id ||
        !formData.paciente_id ||
        !formData.medico_id ||
        !formData.nome_exame
      ) {
        setErro('Preencha consulta e nome do exame.')
        return
      }

      if (precisaResultado && !formData.resultado.trim()) {
        setErro('Resultado é obrigatório para exames com status REALIZADO ou ENTREGUE.')
        return
      }

      const payload = {
        consulta_id: Number(formData.consulta_id),
        paciente_id: Number(formData.paciente_id),
        medico_id: Number(formData.medico_id),
        nome_exame: formData.nome_exame,
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

      fecharModal()
      carregarDados()
    } catch (error) {
      console.error('Erro ao salvar exame:', error)
      setErro(error.response?.data?.erro || 'Erro ao salvar exame.')
    }
  }

  const handleExcluir = async (id) => {
    if (!podeExcluirExame) {
      setErro('Você não tem permissão para excluir exame.')
      return
    }

    const confirmar = window.confirm('Deseja realmente excluir este exame?')
    if (!confirmar) return

    try {
      setErro('')
      setSucesso('')

      await deletarExame(id)
      setSucesso('Exame excluído com sucesso.')
      carregarDados()
    } catch (error) {
      console.error('Erro ao excluir exame:', error)
      setErro(error.response?.data?.erro || 'Erro ao excluir exame.')
    }
  }

  const renderStatusBadge = (status) => {
    if (status === 'REALIZADO' || status === 'ENTREGUE') {
      return <Badge bg="success">{status}</Badge>
    }

    if (status === 'AGENDADO') {
      return (
        <Badge bg="warning" text="dark">
          {status}
        </Badge>
      )
    }

    if (status === 'CANCELADO') {
      return <Badge bg="danger">{status}</Badge>
    }

    return <Badge bg="secondary">{status}</Badge>
  }

  const totalExames = exames.length
  const solicitados = exames.filter((item) => item.status === 'SOLICITADO').length
  const agendados = exames.filter((item) => item.status === 'AGENDADO').length
  const realizados = exames.filter((item) => item.status === 'REALIZADO').length
  const entregues = exames.filter((item) => item.status === 'ENTREGUE').length

  return (
    <MainLayout>
      <div className="container-fluid py-4">
        {erro && <Alert variant="danger">{erro}</Alert>}
        {sucesso && <Alert variant="success">{sucesso}</Alert>}

        <Row className="g-3 mb-4">
          <Col md={3}>
            <Card className="border-0 shadow-sm rounded-4 h-100">
              <Card.Body>
                <small className="text-muted">Total de exames</small>
                <div className="d-flex justify-content-between align-items-center mt-2">
                  <h3 className="fw-bold mb-0">{totalExames}</h3>
                  <FaFlask size={24} className="text-primary" />
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={3}>
            <Card className="border-0 shadow-sm rounded-4 h-100">
              <Card.Body>
                <small className="text-muted">Solicitados</small>
                <h3 className="fw-bold mt-2 mb-0">{solicitados}</h3>
              </Card.Body>
            </Card>
          </Col>

          <Col md={2}>
            <Card className="border-0 shadow-sm rounded-4 h-100">
              <Card.Body>
                <small className="text-muted">Agendados</small>
                <h3 className="fw-bold mt-2 mb-0">{agendados}</h3>
              </Card.Body>
            </Card>
          </Col>

          <Col md={2}>
            <Card className="border-0 shadow-sm rounded-4 h-100">
              <Card.Body>
                <small className="text-muted">Realizados</small>
                <h3 className="fw-bold mt-2 mb-0">{realizados}</h3>
              </Card.Body>
            </Card>
          </Col>

          <Col md={2}>
            <Card className="border-0 shadow-sm rounded-4 h-100">
              <Card.Body>
                <small className="text-muted">Entregues</small>
                <h3 className="fw-bold mt-2 mb-0">{entregues}</h3>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Card className="border-0 shadow-sm rounded-4">
          <Card.Body>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
              <div>
                <h4 className="fw-bold mb-1">Gestão de Exames</h4>
                <p className="text-muted mb-0">
                  Cadastre, acompanhe e edite os exames dos pacientes.
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
                    placeholder="Buscar exame..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="rounded-3 ps-5"
                  />
                </div>

                {podeCriarExame && (
                  <Button
                    variant="primary"
                    className="rounded-3 d-flex align-items-center gap-2"
                    onClick={abrirModalCadastro}
                  >
                    <FaPlus />
                    Novo Exame
                  </Button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="d-flex justify-content-center py-5">
                <Spinner animation="border" />
              </div>
            ) : (
              <div className="table-responsive">
                <Table hover align="middle" className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>ID</th>
                      <th>Consulta</th>
                      <th>Exame</th>
                      <th>Paciente</th>
                      <th>Médico</th>
                      <th>Data</th>
                      <th>Status</th>
                      <th>Resultado</th>
                      <th className="text-center">Ações</th>
                    </tr>
                  </thead>

                  <tbody>
                    {examesFiltrados.length > 0 ? (
                      examesFiltrados.map((exame) => (
                        <tr key={exame.id}>
                          <td>#{exame.id}</td>
                          <td>#{exame.consulta_id}</td>
                          <td className="fw-semibold">{exame.nome_exame}</td>
                          <td>{exame.paciente_nome}</td>
                          <td>{exame.medico_nome}</td>
                          <td>{exame.data_exame ? formatarData(exame.data_exame) : '-'}</td>
                          <td>{renderStatusBadge(exame.status)}</td>
                          <td style={{ maxWidth: '240px' }}>
                            {exame.resultado ? (
                              exame.resultado
                            ) : (
                              <span className="text-muted">Sem resultado</span>
                            )}
                          </td>
                          <td className="text-center">
                            <div className="d-flex justify-content-center gap-2 align-items-center">
                              {podeEditarExame && (
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  className="rounded-3"
                                  onClick={() => abrirModalEdicao(exame)}
                                >
                                  <FaEdit />
                                </Button>
                              )}

                              {podeExcluirExame && (
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  className="rounded-3"
                                  onClick={() => handleExcluir(exame.id)}
                                >
                                  <FaTrash />
                                </Button>
                              )}

                              {!podeEditarExame && !podeExcluirExame && (
                                <span className="text-muted small">Somente visualização</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="9" className="text-center py-4 text-muted">
                          Nenhum exame encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            )}
          </Card.Body>
        </Card>

        <Modal show={showModal} onHide={fecharModal} centered size="lg">
          <Modal.Header closeButton>
            <Modal.Title>{modoEdicao ? 'Editar Exame' : 'Cadastrar Exame'}</Modal.Title>
          </Modal.Header>

          <Form onSubmit={salvarExame}>
            <Modal.Body>
              {!modoEdicao && (
                <Row>
                  <Col md={12} className="mb-3">
                    <Form.Label>Consulta</Form.Label>
                    <Form.Select
                      name="consulta_id"
                      value={formData.consulta_id}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Selecione uma consulta</option>
                      {consultas.map((consulta) => (
                        <option key={consulta.id} value={consulta.id}>
                          Consulta #{consulta.id} - {consulta.paciente_nome} / {consulta.medico_nome}
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
                </Row>
              )}

              <Row>
                <Col md={6} className="mb-3">
                  <Form.Label>Nome do exame</Form.Label>
                  <Form.Control
                    type="text"
                    name="nome_exame"
                    value={formData.nome_exame}
                    onChange={handleChange}
                    placeholder="Digite o nome do exame"
                    required
                  />
                </Col>

                <Col md={6} className="mb-3">
                  <Form.Label>Data do exame</Form.Label>
                  <Form.Control
                    type="date"
                    name="data_exame"
                    value={formData.data_exame}
                    onChange={handleChange}
                  />
                </Col>

                <Col md={6} className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="SOLICITADO">SOLICITADO</option>
                    <option value="AGENDADO">AGENDADO</option>
                    <option value="REALIZADO">REALIZADO</option>
                    <option value="ENTREGUE">ENTREGUE</option>
                    <option value="CANCELADO">CANCELADO</option>
                  </Form.Select>
                </Col>

                <Col md={6} className="mb-3">
                  <Form.Label>Descrição</Form.Label>
                  <Form.Control
                    type="text"
                    name="descricao"
                    value={formData.descricao}
                    onChange={handleChange}
                    placeholder="Descrição do exame"
                  />
                </Col>

                <Col md={12} className="mb-3">
                  <Form.Label>Resultado</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    name="resultado"
                    value={formData.resultado}
                    onChange={handleChange}
                    placeholder={
                      precisaResultado
                        ? 'Digite o resultado do exame'
                        : 'Resultado só é necessário quando o exame estiver REALIZADO ou ENTREGUE'
                    }
                    disabled={!precisaResultado}
                    required={precisaResultado}
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
                {modoEdicao ? 'Salvar alterações' : 'Cadastrar exame'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      </div>
    </MainLayout>
  )
}

export default ExamesPage