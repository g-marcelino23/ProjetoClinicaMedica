import { useEffect, useState } from 'react'
import {
  Card,
  Row,
  Col,
  Badge,
  Spinner,
  Alert,
  Form,
  Button,
  Modal
} from 'react-bootstrap'
import MainLayout from '../../components/layout/MainLayout'
import {
  listarAgendas,
  criarAgenda,
  atualizarAgenda,
  excluirAgenda
} from '../../services/agendaService'
import { listarMedicos } from '../../services/medicosService'
import { useAuth } from '../../context/AuthContext'

function AgendaPage() {
  const { user } = useAuth()

  const [agendaMedicos, setAgendaMedicos] = useState([])
  const [medicos, setMedicos] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [modoEdicao, setModoEdicao] = useState(false)
  const [agendaSelecionada, setAgendaSelecionada] = useState(null)

  const [formData, setFormData] = useState({
    medico_id: '',
    data_agenda: '',
    hora_inicio: '',
    hora_fim: '',
    disponivel: true,
    observacao: ''
  })

  const perfil = user?.perfil
  const podeGerenciarAgenda = perfil === 'SECRETARIO'

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      setLoading(true)
      setErro('')

      const [dadosAgendas, dadosMedicos] = await Promise.all([
        listarAgendas(),
        listarMedicos()
      ])

      setMedicos(dadosMedicos)
      setAgendaMedicos(agruparAgendasPorMedico(dadosAgendas))
    } catch (error) {
      setErro(error.response?.data?.erro || 'Erro ao carregar agenda.')
    } finally {
      setLoading(false)
    }
  }

  const agruparAgendasPorMedico = (agendas) => {
    const agrupado = {}

    agendas.forEach((agenda) => {
      if (!agrupado[agenda.medico_id]) {
        agrupado[agenda.medico_id] = {
          id: agenda.medico_id,
          medico: agenda.medico_nome,
          especialidade: agenda.especialidade,
          horarios: []
        }
      }

      agrupado[agenda.medico_id].horarios.push({
        id: agenda.id,
        medico_id: agenda.medico_id,
        data: agenda.data_agenda,
        hora: agenda.hora_inicio?.slice(0, 5),
        horaFim: agenda.hora_fim?.slice(0, 5),
        status: agenda.disponivel ? 'Disponível' : 'Ocupado',
        disponivel: agenda.disponivel,
        observacao: agenda.observacao || ''
      })
    })

    return Object.values(agrupado)
  }

  const getBadgeVariant = (status) => {
    if (status === 'Disponível') return 'success'
    if (status === 'Ocupado') return 'danger'
    return 'secondary'
  }

  const formatarData = (data) => {
    if (!data) return ''
    return new Date(data).toLocaleDateString('pt-BR')
  }

  const limparFormulario = () => {
    setFormData({
      medico_id: '',
      data_agenda: '',
      hora_inicio: '',
      hora_fim: '',
      disponivel: true,
      observacao: ''
    })
    setAgendaSelecionada(null)
    setModoEdicao(false)
  }

  const abrirModalCadastro = () => {
    if (!podeGerenciarAgenda) {
      setErro('Você não tem permissão para cadastrar agenda.')
      return
    }

    limparFormulario()
    setShowModal(true)
  }

  const fecharModal = () => {
    setShowModal(false)
    limparFormulario()
  }

  const abrirModalEdicao = (agenda) => {
    if (!podeGerenciarAgenda) {
      setErro('Você não tem permissão para editar agenda.')
      return
    }

    setModoEdicao(true)
    setAgendaSelecionada(agenda)

    setFormData({
      medico_id: agenda.medico_id,
      data_agenda: agenda.data?.slice(0, 10),
      hora_inicio: agenda.hora,
      hora_fim: agenda.horaFim,
      disponivel: agenda.disponivel,
      observacao: agenda.observacao || ''
    })

    setShowModal(true)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!podeGerenciarAgenda) {
      setErro('Você não tem permissão para salvar agenda.')
      return
    }

    if (formData.hora_inicio >= formData.hora_fim) {
      setErro('A hora de fim deve ser maior que a hora de início.')
      return
    }

    try {
      setErro('')
      setSucesso('')

      if (modoEdicao && agendaSelecionada) {
        await atualizarAgenda(agendaSelecionada.id, {
          data_agenda: formData.data_agenda,
          hora_inicio: formData.hora_inicio,
          hora_fim: formData.hora_fim,
          disponivel: formData.disponivel,
          observacao: formData.observacao
        })

        setSucesso('Agenda atualizada com sucesso.')
      } else {
        await criarAgenda({
          medico_id: Number(formData.medico_id),
          data_agenda: formData.data_agenda,
          hora_inicio: formData.hora_inicio,
          hora_fim: formData.hora_fim,
          disponivel: formData.disponivel,
          observacao: formData.observacao
        })

        setSucesso('Agenda cadastrada com sucesso.')
      }

      fecharModal()
      carregarDados()
    } catch (error) {
      setErro(error.response?.data?.erro || 'Erro ao salvar agenda.')
    }
  }

  const handleExcluir = async (id) => {
    if (!podeGerenciarAgenda) {
      setErro('Você não tem permissão para excluir agenda.')
      return
    }

    const confirmar = window.confirm('Deseja realmente excluir esta agenda?')
    if (!confirmar) return

    try {
      setErro('')
      setSucesso('')

      await excluirAgenda(id)
      setSucesso('Agenda excluída com sucesso.')
      carregarDados()
    } catch (error) {
      setErro(error.response?.data?.erro || 'Erro ao excluir agenda.')
    }
  }

  return (
    <MainLayout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title">Agenda</h1>
          <p className="page-subtitle mb-0">
            Visualize os horários dos médicos da clínica.
          </p>
        </div>

        {podeGerenciarAgenda && (
          <Button variant="primary" onClick={abrirModalCadastro}>
            Nova Agenda
          </Button>
        )}
      </div>

      {erro && <Alert variant="danger">{erro}</Alert>}
      {sucesso && <Alert variant="success">{sucesso}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : agendaMedicos.length === 0 ? (
        <Alert variant="info">Nenhuma agenda cadastrada.</Alert>
      ) : (
        <Row className="g-4">
          {agendaMedicos.map((item) => (
            <Col md={6} lg={4} key={item.id}>
              <Card className="p-3">
                <h4>{item.medico}</h4>
                <p>{item.especialidade}</p>

                {item.horarios.map((h) => (
                  <div key={h.id} className="border p-2 mb-2">
                    {h.hora} - {h.horaFim} <br />
                    {formatarData(h.data)}

                    <Badge bg={getBadgeVariant(h.status)} className="ms-2">
                      {h.status}
                    </Badge>

                    {podeGerenciarAgenda && (
                      <div className="mt-2">
                        <Button size="sm" onClick={() => abrirModalEdicao(h)}>
                          Editar
                        </Button>{' '}
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleExcluir(h.id)}
                        >
                          Excluir
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal show={showModal} onHide={fecharModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {modoEdicao ? 'Editar Agenda' : 'Nova Agenda'}
          </Modal.Title>
        </Modal.Header>

        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Select
              name="medico_id"
              value={formData.medico_id}
              onChange={handleChange}
              required
              disabled={modoEdicao}
            >
              <option value="">Selecione o médico</option>
              {medicos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </Form.Select>

            <Form.Control
              type="date"
              name="data_agenda"
              value={formData.data_agenda}
              onChange={handleChange}
              className="mt-2"
              required
            />

            <Form.Control
              type="time"
              name="hora_inicio"
              value={formData.hora_inicio}
              onChange={handleChange}
              className="mt-2"
              required
            />

            <Form.Control
              type="time"
              name="hora_fim"
              value={formData.hora_fim}
              onChange={handleChange}
              className="mt-2"
              required
            />
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={fecharModal}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </MainLayout>
  )
}

export default AgendaPage