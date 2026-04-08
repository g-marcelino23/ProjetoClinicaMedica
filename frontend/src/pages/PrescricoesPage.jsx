import { useEffect, useState } from 'react'
import { Container, Form, Button, Alert, Table } from 'react-bootstrap'
import {
  criarPrescricao,
  listarPrescricoes,
  listarMinhasPrescricoes
} from '../services/prescricaoService'

function PrescricoesPage() {
  const user = JSON.parse(localStorage.getItem('user'))
  const perfil = user?.perfil

  const [form, setForm] = useState({
    consulta_id: '',
    medicamento: '',
    dosagem: '',
    frequencia: '',
    duracao: '',
    observacoes: ''
  })

  const [prescricoes, setPrescricoes] = useState([])
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  const carregarPrescricoes = async () => {
    try {
      setErro('')

      let data = []

      if (perfil === 'PACIENTE') {
        data = await listarMinhasPrescricoes()
      } else {
        data = await listarPrescricoes()
      }

      setPrescricoes(data)
    } catch (error) {
      setErro(error.response?.data?.mensagem || 'Erro ao carregar prescrições')
    }
  }

  useEffect(() => {
    carregarPrescricoes()
  }, [])

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      setErro('')
      setMensagem('')

      await criarPrescricao({
        ...form,
        consulta_id: Number(form.consulta_id)
      })

      setMensagem('Prescrição criada com sucesso!')

      setForm({
        consulta_id: '',
        medicamento: '',
        dosagem: '',
        frequencia: '',
        duracao: '',
        observacoes: ''
      })

      await carregarPrescricoes()
    } catch (error) {
      setErro(error.response?.data?.mensagem || 'Erro ao criar prescrição')
    }
  }

  return (
    <Container className="mt-4">
      <h2 className="mb-4">
        {perfil === 'PACIENTE' ? 'Minhas Prescrições' : 'Prescrições'}
      </h2>

      {mensagem && <Alert variant="success">{mensagem}</Alert>}
      {erro && <Alert variant="danger">{erro}</Alert>}

      {(perfil === 'MEDICO' || perfil === 'SECRETARIO') && (
        <Form onSubmit={handleSubmit} className="mb-5">
          <Form.Group className="mb-3">
            <Form.Label>ID da Consulta</Form.Label>
            <Form.Control
              type="number"
              name="consulta_id"
              value={form.consulta_id}
              onChange={handleChange}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Medicamento</Form.Label>
            <Form.Control
              type="text"
              name="medicamento"
              value={form.medicamento}
              onChange={handleChange}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Dosagem</Form.Label>
            <Form.Control
              type="text"
              name="dosagem"
              value={form.dosagem}
              onChange={handleChange}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Frequência</Form.Label>
            <Form.Control
              type="text"
              name="frequencia"
              value={form.frequencia}
              onChange={handleChange}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Duração</Form.Label>
            <Form.Control
              type="text"
              name="duracao"
              value={form.duracao}
              onChange={handleChange}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Observações</Form.Label>
            <Form.Control
              as="textarea"
              name="observacoes"
              value={form.observacoes}
              onChange={handleChange}
            />
          </Form.Group>

          <Button type="submit">Salvar Prescrição</Button>
        </Form>
      )}

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>ID</th>
            {perfil !== 'PACIENTE' && <th>Paciente</th>}
            <th>Medicamento</th>
            <th>Dosagem</th>
            <th>Frequência</th>
            <th>Duração</th>
            <th>Observações</th>
            <th>Data</th>
            {perfil === 'PACIENTE' && <th>Médico</th>}
          </tr>
        </thead>
        <tbody>
          {prescricoes.length > 0 ? (
            prescricoes.map((prescricao) => (
              <tr key={prescricao.id}>
                <td>{prescricao.id}</td>
                {perfil !== 'PACIENTE' && (
                  <td>{prescricao.paciente_nome || '-'}</td>
                )}
                <td>{prescricao.medicamento}</td>
                <td>{prescricao.dosagem}</td>
                <td>{prescricao.frequencia}</td>
                <td>{prescricao.duracao}</td>
                <td>{prescricao.observacoes || '-'}</td>
                <td>
                  {new Date(prescricao.data_prescricao).toLocaleString('pt-BR')}
                </td>
                {perfil === 'PACIENTE' && (
                  <td>{prescricao.medico_nome || '-'}</td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="8" className="text-center">
                Nenhuma prescrição encontrada.
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </Container>
  )
}

export default PrescricoesPage