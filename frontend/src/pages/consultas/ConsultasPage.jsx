import { useEffect, useMemo, useState } from 'react'
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Row,
  Col,
  Spinner,
  Badge,
  Alert
} from 'react-bootstrap'
import MainLayout from '../../components/layout/MainLayout'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import {
  listarConsultas,
  criarConsulta,
  atualizarConsulta,
  excluirConsulta as excluirConsultaApi
} from '../../services/consultaService'

function ConsultasPage() {
  const { user } = useAuth()

  const perfil = user?.perfil || ''
  const medicoIdLogado = user?.medico_id || null
  const pacienteIdLogado = user?.paciente_id || null

  const [pacientes, setPacientes] = useState([])
  const [medicos, setMedicos] = useState([])
  const [agendas, setAgendas] = useState([])
  const [consultas, setConsultas] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [busca, setBusca] = useState('')

  const [formData, setFormData] = useState({
    paciente_id: '',
    medico_id: '',
    agenda_id: '',
    data_consulta: '',
    hora_consulta: '',
    motivo: '',
    observacoes: ''
  })

  const [consultaSelecionada, setConsultaSelecionada] = useState(null)
  const [statusData, setStatusData] = useState({
    status: '',
    observacoes: '',
    checkin_realizado: false
  })

  const podeCriarConsulta = perfil === 'SECRETARIO' || perfil === 'PACIENTE'
  const podeExcluirConsulta = perfil === 'SECRETARIO'
  const podeAtualizarConsulta =
    perfil === 'SECRETARIO' || perfil === 'MEDICO' || perfil === 'PACIENTE'

  const carregarDados = async () => {
    try {
      setLoading(true)
      setErro('')

      const dadosConsultas = await listarConsultas()
      setConsultas(Array.isArray(dadosConsultas) ? dadosConsultas : [])

      if (perfil === 'SECRETARIO') {
        const [resPacientes, resMedicos, resAgendas] = await Promise.all([
          api.get('/pacientes'),
          api.get('/medicos'),
          api.get('/agendas')
        ])

        setPacientes(Array.isArray(resPacientes.data) ? resPacientes.data : [])
        setMedicos(Array.isArray(resMedicos.data) ? resMedicos.data : [])
        setAgendas(Array.isArray(resAgendas.data) ? resAgendas.data : [])
      }

      if (perfil === 'PACIENTE') {
        const [resMedicos, resAgendas] = await Promise.all([
          api.get('/medicos'),
          api.get('/agendas')
        ])

        setPacientes([])
        setMedicos(Array.isArray(resMedicos.data) ? resMedicos.data : [])
        setAgendas(Array.isArray(resAgendas.data) ? resAgendas.data : [])
      }

      if (perfil === 'MEDICO') {
        setPacientes([])
        setMedicos([])
        setAgendas([])
      }
    } catch (error) {
      console.error('Erro ao carregar consultas:', error)
      setErro(error.response?.data?.erro || 'Erro ao carregar consultas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const consultasVisiveis = useMemo(() => {
    if (perfil === 'SECRETARIO') return consultas

    if (perfil === 'MEDICO') {
      return consultas.filter(
        (consulta) => Number(consulta.medico_id) === Number(medicoIdLogado)
      )
    }

    if (perfil === 'PACIENTE') {
      return consultas.filter(
        (consulta) => Number(consulta.paciente_id) === Number(pacienteIdLogado)
      )
    }

    return []
  }, [consultas, perfil, medicoIdLogado, pacienteIdLogado])

  const consultasFiltradas = useMemo(() => {
    const termo = busca.toLowerCase()

    return consultasVisiveis.filter((consulta) => {
      return (
        (consulta.paciente_nome || '').toLowerCase().includes(termo) ||
        (consulta.medico_nome || '').toLowerCase().includes(termo) ||
        (consulta.motivo || '').toLowerCase().includes(termo) ||
        (consulta.status || '').toLowerCase().includes(termo) ||
        String(consulta.data_consulta || '').toLowerCase().includes(termo)
      )
    })
  }, [consultasVisiveis, busca])

  const medicosVisiveis = useMemo(() => {
    return medicos
  }, [medicos])

  const pacientesVisiveis = useMemo(() => {
    if (perfil === 'PACIENTE') return []
    return pacientes
  }, [pacientes, perfil])

  const agendasDisponiveisDoMedico = useMemo(() => {
    if (!formData.medico_id) return []

    return agendas.filter(
      (agenda) =>
        Number(agenda.medico_id) === Number(formData.medico_id) &&
        agenda.disponivel === true
    )
  }, [agendas, formData.medico_id])

  const formatarData = (data) => {
    if (!data) return ''
    return new Date(data).toLocaleDateString('pt-BR')
  }

  const formatarHora = (hora) => {
    if (!hora) return ''
    return String(hora).slice(0, 5)
  }

  const limparFormulario = () => {
    setFormData({
      paciente_id:
        perfil === 'PACIENTE' && pacienteIdLogado ? String(pacienteIdLogado) : '',
      medico_id: '',
      agenda_id: '',
      data_consulta: '',
      hora_consulta: '',
      motivo: '',
      observacoes: ''
    })
  }

  const abrirModalCadastro = () => {
    if (!podeCriarConsulta) {
      setErro('Você não tem permissão para criar consulta.')
      return
    }

    if (perfil === 'PACIENTE' && !pacienteIdLogado) {
      setErro('Não foi possível identificar o paciente logado.')
      return
    }

    limparFormulario()
    setShowModal(true)
  }

  const fecharModalCadastro = () => {
    setShowModal(false)
    limparFormulario()
  }

  const abrirModalStatus = (consulta) => {
    if (!podeAtualizarConsulta) {
      setErro('Você não tem permissão para atualizar consulta.')
      return
    }

    setConsultaSelecionada(consulta)
    setStatusData({
      status: perfil === 'PACIENTE' ? 'CANCELADA' : consulta.status || 'AGENDADA',
      observacoes: consulta.observacoes || '',
      checkin_realizado: !!consulta.checkin_realizado
    })
    setShowStatusModal(true)
  }

  const fecharModalStatus = () => {
    setShowStatusModal(false)
    setConsultaSelecionada(null)
  }

  const handleChange = (e) => {
    const { name, value } = e.target

    if (name === 'medico_id') {
      setFormData((prev) => ({
        ...prev,
        medico_id: value,
        agenda_id: '',
        data_consulta: '',
        hora_consulta: ''
      }))
      return
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleStatusChange = (e) => {
    const { name, value, type, checked } = e.target

    setStatusData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSelecionarAgenda = (e) => {
    const agendaId = e.target.value

    const agendaSelecionada = agendasDisponiveisDoMedico.find(
      (agenda) => Number(agenda.id) === Number(agendaId)
    )

    setFormData((prev) => ({
      ...prev,
      agenda_id: agendaId,
      data_consulta: agendaSelecionada?.data_agenda || '',
      hora_consulta: agendaSelecionada?.hora_inicio || ''
    }))
  }

  const handleCadastrarConsulta = async (e) => {
    e.preventDefault()

    if (!podeCriarConsulta) {
      setErro('Você não tem permissão para cadastrar consulta.')
      return
    }

    if (!formData.agenda_id) {
      setErro('Agenda é obrigatória.')
      return
    }

    if (perfil === 'PACIENTE' && !pacienteIdLogado) {
      setErro('Não foi possível identificar o paciente logado.')
      return
    }

    if (perfil === 'SECRETARIO' && !formData.paciente_id) {
      setErro('Paciente é obrigatório.')
      return
    }

    try {
      setErro('')
      setSucesso('')

      await criarConsulta({
        paciente_id:
          perfil === 'PACIENTE'
            ? Number(pacienteIdLogado)
            : Number(formData.paciente_id),
        agenda_id: Number(formData.agenda_id),
        motivo: formData.motivo,
        observacoes: formData.observacoes
      })

      setSucesso('Consulta agendada com sucesso!')
      fecharModalCadastro()
      carregarDados()
    } catch (error) {
      console.error('Erro ao cadastrar consulta:', error)

      const mensagem =
        error.response?.data?.erro ||
        error.response?.data?.message ||
        'Erro ao cadastrar consulta.'

      setErro(mensagem)
    }
  }

  const handleAtualizarStatus = async (e) => {
    e.preventDefault()

    if (!consultaSelecionada) {
      setErro('Consulta não selecionada.')
      return
    }

    try {
      setErro('')
      setSucesso('')

      await atualizarConsulta(consultaSelecionada.id, {
        status: statusData.status,
        observacoes: statusData.observacoes,
        checkin_realizado:
          perfil === 'PACIENTE'
            ? consultaSelecionada.checkin_realizado
            : statusData.checkin_realizado
      })

      setSucesso('Consulta atualizada com sucesso!')
      fecharModalStatus()
      carregarDados()
    } catch (error) {
      console.error('Erro ao atualizar consulta:', error)

      const mensagem =
        error.response?.data?.erro ||
        error.response?.data?.message ||
        'Erro ao atualizar consulta.'

      setErro(mensagem)
    }
  }

  const handleExcluirConsulta = async (id) => {
    if (!podeExcluirConsulta) {
      setErro('Você não tem permissão para excluir consulta.')
      return
    }

    const confirmar = window.confirm('Deseja realmente excluir esta consulta?')
    if (!confirmar) return

    try {
      setErro('')
      setSucesso('')

      await excluirConsultaApi(id)
      setSucesso('Consulta excluída com sucesso!')
      carregarDados()
    } catch (error) {
      console.error('Erro ao excluir consulta:', error)

      const mensagem =
        error.response?.data?.erro ||
        error.response?.data?.message ||
        'Erro ao excluir consulta.'

      setErro(mensagem)
    }
  }

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'AGENDADA':
        return <Badge bg="primary">{status}</Badge>
      case 'CONFIRMADA':
        return <Badge bg="info">{status}</Badge>
      case 'REALIZADA':
        return <Badge bg="success">{status}</Badge>
      case 'CANCELADA':
        return <Badge bg="danger">{status}</Badge>
      case 'FALTOU':
        return (
          <Badge bg="warning" text="dark">
            {status}
          </Badge>
        )
      default:
        return <Badge bg="secondary">{status || 'SEM STATUS'}</Badge>
    }
  }

  return (
    <MainLayout>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="page-title">Consultas</h1>
          <p className="page-subtitle">Gerencie as consultas agendadas no sistema.</p>
        </div>

        <div className="d-flex gap-2">
          <Form.Control
            type="text"
            placeholder="Buscar consulta..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ minWidth: '250px' }}
          />

          {podeCriarConsulta && (
            <Button variant="primary" className="px-4" onClick={abrirModalCadastro}>
              + Nova Consulta
            </Button>
          )}
        </div>
      </div>

      {erro && <Alert variant="danger">{erro}</Alert>}
      {sucesso && <Alert variant="success">{sucesso}</Alert>}

      <Card className="content-card p-3">
        <Card.Body>
          <h4 className="fw-bold mb-3">Lista de Consultas</h4>

          <div className="table-responsive">
            <Table hover align="middle">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Médico</th>
                  <th>Data</th>
                  <th>Horário</th>
                  <th>Motivo</th>
                  <th>Status</th>
                  <th>Check-in</th>
                  <th className="text-center">Ações</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4">
                      <Spinner animation="border" size="sm" className="me-2" />
                      Carregando consultas...
                    </td>
                  </tr>
                ) : consultasFiltradas.length > 0 ? (
                  consultasFiltradas.map((consulta) => (
                    <tr key={consulta.id}>
                      <td>{consulta.paciente_nome}</td>
                      <td>{consulta.medico_nome}</td>
                      <td>{formatarData(consulta.data_consulta)}</td>
                      <td>{formatarHora(consulta.hora_consulta)}</td>
                      <td>{consulta.motivo || '-'}</td>
                      <td>{renderStatusBadge(consulta.status)}</td>
                      <td>{consulta.checkin_realizado ? 'Sim' : 'Não'}</td>
                      <td className="text-center">
                        <div className="d-flex justify-content-center gap-2">
                          {podeAtualizarConsulta && (
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="rounded-3"
                              onClick={() => abrirModalStatus(consulta)}
                            >
                              {perfil === 'PACIENTE' ? 'Cancelar' : 'Atualizar'}
                            </Button>
                          )}

                          {podeExcluirConsulta && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              className="rounded-3"
                              onClick={() => handleExcluirConsulta(consulta.id)}
                            >
                              Excluir
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-muted">
                      Nenhuma consulta encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={fecharModalCadastro} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Agendar Consulta</Modal.Title>
        </Modal.Header>

        <Form onSubmit={handleCadastrarConsulta}>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Paciente</Form.Label>

                  {perfil === 'PACIENTE' ? (
                    <Form.Control type="text" value={user?.nome || ''} readOnly />
                  ) : (
                    <Form.Select
                      name="paciente_id"
                      value={formData.paciente_id}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Selecione um paciente</option>
                      {pacientesVisiveis.map((paciente) => (
                        <option key={paciente.id} value={paciente.id}>
                          {paciente.nome}
                        </option>
                      ))}
                    </Form.Select>
                  )}
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Médico</Form.Label>
                  <Form.Select
                    name="medico_id"
                    value={formData.medico_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Selecione um médico</option>
                    {medicosVisiveis.map((medico) => (
                      <option key={medico.id} value={medico.id}>
                        {medico.nome} - {medico.especialidade}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label>Horário disponível</Form.Label>
                  <Form.Select
                    name="agenda_id"
                    value={formData.agenda_id}
                    onChange={handleSelecionarAgenda}
                    required
                    disabled={!formData.medico_id}
                  >
                    <option value="">Selecione um horário disponível</option>
                    {agendasDisponiveisDoMedico.map((agenda) => (
                      <option key={agenda.id} value={agenda.id}>
                        {formatarData(agenda.data_agenda)} - {formatarHora(agenda.hora_inicio)} às{' '}
                        {formatarHora(agenda.hora_fim)}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Data</Form.Label>
                  <Form.Control type="text" value={formatarData(formData.data_consulta)} readOnly />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Horário</Form.Label>
                  <Form.Control type="text" value={formatarHora(formData.hora_consulta)} readOnly />
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label>Motivo da Consulta</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="motivo"
                    value={formData.motivo}
                    onChange={handleChange}
                    placeholder="Descreva o motivo da consulta"
                  />
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label>Observações</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="observacoes"
                    value={formData.observacoes}
                    onChange={handleChange}
                    placeholder="Observações adicionais"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={fecharModalCadastro}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Salvar
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={showStatusModal} onHide={fecharModalStatus} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {perfil === 'PACIENTE' ? 'Cancelar Consulta' : 'Atualizar Consulta'}
          </Modal.Title>
        </Modal.Header>

        <Form onSubmit={handleAtualizarStatus}>
          <Modal.Body>
            <Row className="g-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Status</Form.Label>

                  {perfil === 'PACIENTE' ? (
                    <Form.Control value="CANCELADA" readOnly />
                  ) : (
                    <Form.Select
                      name="status"
                      value={statusData.status}
                      onChange={handleStatusChange}
                      required
                    >
                      <option value="AGENDADA">AGENDADA</option>
                      <option value="CONFIRMADA">CONFIRMADA</option>
                      <option value="REALIZADA">REALIZADA</option>
                      <option value="CANCELADA">CANCELADA</option>
                      <option value="FALTOU">FALTOU</option>
                    </Form.Select>
                  )}
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group>
                  <Form.Label>Observações</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="observacoes"
                    value={statusData.observacoes}
                    onChange={handleStatusChange}
                  />
                </Form.Group>
              </Col>

              {perfil !== 'PACIENTE' && (
                <Col md={12}>
                  <Form.Check
                    type="checkbox"
                    label="Check-in realizado"
                    name="checkin_realizado"
                    checked={statusData.checkin_realizado}
                    onChange={handleStatusChange}
                  />
                </Col>
              )}
            </Row>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={fecharModalStatus}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {perfil === 'PACIENTE' ? 'Confirmar cancelamento' : 'Salvar alterações'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </MainLayout>
  )
}

export default ConsultasPage