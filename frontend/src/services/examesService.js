import { useEffect, useMemo, useState } from 'react'
import { Modal, Button, Form, Table, Badge, Card, Row, Col } from 'react-bootstrap'
import { FaFlask, FaPlus, FaEdit, FaTrash, FaSearch } from 'react-icons/fa'
import {
  listarExames,
  criarExame,
  atualizarExame,
  excluirExame as excluirExameApi,
} from '../../services/examesService'

function ExamesPage() {
  const pacientesMock = [
    { id: 1, nome: 'Gabriel Marcelino' },
    { id: 2, nome: 'Mariana Souza' },
    { id: 3, nome: 'Carlos Henrique' },
  ]

  const medicosMock = [
    { id: 1, nome: 'Dra. Ana Paula', especialidade: 'Clínica Geral' },
    { id: 2, nome: 'Dr. Ricardo Lima', especialidade: 'Radiologia' },
    { id: 3, nome: 'Dra. Fernanda Rocha', especialidade: 'Endocrinologia' },
  ]

  const [exames, setExames] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [busca, setBusca] = useState('')

  const [formData, setFormData] = useState({
    id: null,
    nome: '',
    pacienteId: '',
    medicoId: '',
    data: '',
    status: 'Pendente',
    resultado: '',
  })

  const carregarExames = async () => {
    try {
      setLoading(true)
      const dados = await listarExames()
      setExames(Array.isArray(dados) ? dados : [])
    } catch (error) {
      console.error('Erro ao listar exames:', error)
      alert('Erro ao carregar exames do sistema.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarExames()
  }, [])

  const getPacienteNome = (pacienteId) => {
    const paciente = pacientesMock.find((p) => p.id === Number(pacienteId))
    return paciente ? paciente.nome : 'Não informado'
  }

  const getMedicoNome = (medicoId) => {
    const medico = medicosMock.find((m) => m.id === Number(medicoId))
    return medico ? medico.nome : 'Não informado'
  }

  const examesFiltrados = useMemo(() => {
    const termo = busca.toLowerCase()

    return exames.filter((exame) => {
      const pacienteNome = getPacienteNome(exame.pacienteId).toLowerCase()
      const medicoNome = getMedicoNome(exame.medicoId).toLowerCase()

      return (
        (exame.nome || '').toLowerCase().includes(termo) ||
        pacienteNome.includes(termo) ||
        medicoNome.includes(termo) ||
        (exame.status || '').toLowerCase().includes(termo)
      )
    })
  }, [busca, exames])

  const abrirModalCadastro = () => {
    setModoEdicao(false)
    setFormData({
      id: null,
      nome: '',
      pacienteId: '',
      medicoId: '',
      data: '',
      status: 'Pendente',
      resultado: '',
    })
    setShowModal(true)
  }

  const abrirModalEdicao = (exame) => {
    setModoEdicao(true)
    setFormData({
      id: exame.id,
      nome: exame.nome || '',
      pacienteId: String(exame.pacienteId || ''),
      medicoId: String(exame.medicoId || ''),
      data: exame.data ? exame.data.split('T')[0] : '',
      status: exame.status || 'Pendente',
      resultado: exame.resultado || '',
    })
    setShowModal(true)
  }

  const fecharModal = () => {
    setShowModal(false)
  }

  const handleChange = (e) => {
    const { name, value } = e.target

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const salvarExame = async (e) => {
    e.preventDefault()

    if (!formData.nome || !formData.pacienteId || !formData.medicoId || !formData.data) {
      alert('Preencha todos os campos obrigatórios.')
      return
    }

    const payload = {
      nome: formData.nome,
      pacienteId: Number(formData.pacienteId),
      medicoId: Number(formData.medicoId),
      data: formData.data,
      status: formData.status,
      resultado: formData.resultado,
    }

    try {
      if (modoEdicao) {
        await atualizarExame(formData.id, payload)
        alert('Exame atualizado com sucesso!')
      } else {
        await criarExame(payload)
        alert('Exame cadastrado com sucesso!')
      }

      fecharModal()
      carregarExames()
    } catch (error) {
      console.error('Erro ao salvar exame:', error)
      alert('Erro ao salvar exame.')
    }
  }

  const excluirExame = async (id) => {
    const confirmar = window.confirm('Deseja realmente excluir este exame?')
    if (!confirmar) return

    try {
      await excluirExameApi(id)
      alert('Exame excluído com sucesso!')
      carregarExames()
    } catch (error) {
      console.error('Erro ao excluir exame:', error)
      alert('Erro ao excluir exame.')
    }
  }

  const renderStatusBadge = (status) => {
    if (status === 'Concluído') {
      return <Badge bg="success">{status}</Badge>
    }

    if (status === 'Em andamento') {
      return (
        <Badge bg="warning" text="dark">
          {status}
        </Badge>
      )
    }

    return <Badge bg="secondary">{status}</Badge>
  }

  const totalExames = exames.length
  const pendentes = exames.filter((item) => item.status === 'Pendente').length
  const andamento = exames.filter((item) => item.status === 'Em andamento').length
  const concluidos = exames.filter((item) => item.status === 'Concluído').length

  return (
    <div className="container-fluid py-4">
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
              <small className="text-muted">Pendentes</small>
              <h3 className="fw-bold mt-2 mb-0">{pendentes}</h3>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm rounded-4 h-100">
            <Card.Body>
              <small className="text-muted">Em andamento</small>
              <h3 className="fw-bold mt-2 mb-0">{andamento}</h3>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm rounded-4 h-100">
            <Card.Body>
              <small className="text-muted">Concluídos</small>
              <h3 className="fw-bold mt-2 mb-0">{concluidos}</h3>
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

              <Button
                variant="primary"
                className="rounded-3 d-flex align-items-center gap-2"
                onClick={abrirModalCadastro}
              >
                <FaPlus />
                Novo Exame
              </Button>
            </div>
          </div>

          <div className="table-responsive">
            <Table hover align="middle" className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
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
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4">
                      Carregando exames...
                    </td>
                  </tr>
                ) : examesFiltrados.length > 0 ? (
                  examesFiltrados.map((exame) => (
                    <tr key={exame.id}>
                      <td>#{exame.id}</td>
                      <td className="fw-semibold">{exame.nome}</td>
                      <td>{getPacienteNome(exame.pacienteId)}</td>
                      <td>{getMedicoNome(exame.medicoId)}</td>
                      <td>{exame.data ? exame.data.split('T')[0] : ''}</td>
                      <td>{renderStatusBadge(exame.status)}</td>
                      <td style={{ maxWidth: '240px' }}>
                        {exame.resultado ? (
                          exame.resultado
                        ) : (
                          <span className="text-muted">Sem resultado</span>
                        )}
                      </td>
                      <td className="text-center">
                        <div className="d-flex justify-content-center gap-2">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="rounded-3"
                            onClick={() => abrirModalEdicao(exame)}
                          >
                            <FaEdit />
                          </Button>

                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="rounded-3"
                            onClick={() => excluirExame(exame.id)}
                          >
                            <FaTrash />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-muted">
                      Nenhum exame encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={fecharModal} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{modoEdicao ? 'Editar Exame' : 'Cadastrar Exame'}</Modal.Title>
        </Modal.Header>

        <Form onSubmit={salvarExame}>
          <Modal.Body>
            <Row>
              <Col md={6} className="mb-3">
                <Form.Label>Nome do exame</Form.Label>
                <Form.Control
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  placeholder="Digite o nome do exame"
                />
              </Col>

              <Col md={6} className="mb-3">
                <Form.Label>Data do exame</Form.Label>
                <Form.Control
                  type="date"
                  name="data"
                  value={formData.data}
                  onChange={handleChange}
                />
              </Col>

              <Col md={6} className="mb-3">
                <Form.Label>Paciente</Form.Label>
                <Form.Select
                  name="pacienteId"
                  value={formData.pacienteId}
                  onChange={handleChange}
                >
                  <option value="">Selecione um paciente</option>
                  {pacientesMock.map((paciente) => (
                    <option key={paciente.id} value={paciente.id}>
                      {paciente.nome}
                    </option>
                  ))}
                </Form.Select>
              </Col>

              <Col md={6} className="mb-3">
                <Form.Label>Médico</Form.Label>
                <Form.Select
                  name="medicoId"
                  value={formData.medicoId}
                  onChange={handleChange}
                >
                  <option value="">Selecione um médico</option>
                  {medicosMock.map((medico) => (
                    <option key={medico.id} value={medico.id}>
                      {medico.nome} - {medico.especialidade}
                    </option>
                  ))}
                </Form.Select>
              </Col>

              <Col md={6} className="mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Em andamento">Em andamento</option>
                  <option value="Concluído">Concluído</option>
                </Form.Select>
              </Col>

              <Col md={12} className="mb-3">
                <Form.Label>Resultado</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  name="resultado"
                  value={formData.resultado}
                  onChange={handleChange}
                  placeholder="Digite o resultado do exame"
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
  )
}

export default ExamesPage