import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Form, Spinner } from 'react-bootstrap'
import {
  FaCalendarAlt,
  FaCalendarCheck,
  FaChartBar,
  FaCheckCircle,
  FaClipboardList,
  FaFileMedicalAlt,
  FaFilter,
  FaFlask,
  FaSearch,
  FaSyncAlt,
  FaUserMd
} from 'react-icons/fa'
import MainLayout from '../../components/layout/MainLayout'
import {
  obterRelatorioConsultas,
  obterRelatorioExames,
  obterRelatorioAtendimentosPorMedico
} from '../../services/relatorioService'
import './Relatorios.css'

const FILTROS_INICIAIS = {
  data_inicial: '',
  data_final: '',
  status: ''
}

const TIPOS_RELATORIO = [
  {
    id: 'consultas',
    title: 'Consultas',
    description: 'Agenda, pacientes e situação dos atendimentos',
    icon: FaCalendarCheck,
    tone: 'blue'
  },
  {
    id: 'exames',
    title: 'Exames',
    description: 'Solicitações, resultados e acompanhamento',
    icon: FaFlask,
    tone: 'violet'
  },
  {
    id: 'atendimentos-medico',
    title: 'Atendimentos por médico',
    description: 'Volume de consultas por profissional',
    icon: FaUserMd,
    tone: 'green'
  }
]

const STATUS_CONSULTAS = [
  { value: '', label: 'Todos os status' },
  { value: 'AGENDADA', label: 'Agendada' },
  { value: 'CONFIRMADA', label: 'Confirmada' },
  { value: 'REALIZADA', label: 'Realizada' },
  { value: 'CANCELADA', label: 'Cancelada' },
  { value: 'FALTOU', label: 'Faltou' }
]

const STATUS_EXAMES = [
  { value: '', label: 'Todos os status' },
  { value: 'SOLICITADO', label: 'Solicitado' },
  { value: 'AGENDADO', label: 'Agendado' },
  { value: 'REALIZADO', label: 'Realizado' },
  { value: 'ENTREGUE', label: 'Entregue' },
  { value: 'CANCELADO', label: 'Cancelado' }
]

const STATUS_LABELS = {
  AGENDADA: 'Agendada',
  CONFIRMADA: 'Confirmada',
  REALIZADA: 'Realizada',
  CANCELADA: 'Cancelada',
  FALTOU: 'Faltou',
  SOLICITADO: 'Solicitado',
  AGENDADO: 'Agendado',
  REALIZADO: 'Realizado',
  ENTREGUE: 'Entregue',
  CANCELADO: 'Cancelado'
}

function parseLocalDate(value) {
  if (!value) return null

  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number)

  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function formatarData(value) {
  const date = parseLocalDate(value)

  if (!date) return '-'
  return date.toLocaleDateString('pt-BR')
}

function formatarDataCurta(value) {
  const date = parseLocalDate(value)

  if (!date) return ''

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
    .format(date)
    .replace('.', '')
}

function formatarHora(value) {
  if (!value) return '-'
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

function Relatorios() {
  const [tipoRelatorio, setTipoRelatorio] = useState('consultas')
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [erroFiltro, setErroFiltro] = useState('')
  const [dados, setDados] = useState([])
  const [busca, setBusca] = useState('')
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null)
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS)
  const [filtrosAplicados, setFiltrosAplicados] = useState(FILTROS_INICIAIS)

  const carregarRelatorio = useCallback(async (tipo, filtrosConsulta = {}) => {
    try {
      setLoading(true)
      setErro('')

      let resultado = []

      if (tipo === 'consultas') {
        resultado = await obterRelatorioConsultas(filtrosConsulta)
      }

      if (tipo === 'exames') {
        resultado = await obterRelatorioExames(filtrosConsulta)
      }

      if (tipo === 'atendimentos-medico') {
        resultado = await obterRelatorioAtendimentosPorMedico(filtrosConsulta)
      }

      setDados(Array.isArray(resultado) ? resultado : [])
      setUltimaAtualizacao(new Date())
    } catch (error) {
      console.error('Erro ao carregar relatório:', error)
      setErro(error.response?.data?.erro || 'Erro ao carregar relatório.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarRelatorio('consultas')
  }, [carregarRelatorio])

  const tipoAtual = useMemo(
    () => TIPOS_RELATORIO.find((tipo) => tipo.id === tipoRelatorio),
    [tipoRelatorio]
  )

  const statusDisponiveis =
    tipoRelatorio === 'consultas' ? STATUS_CONSULTAS : STATUS_EXAMES

  const periodoLabel = useMemo(() => {
    const inicio = filtrosAplicados.data_inicial
    const fim = filtrosAplicados.data_final

    if (inicio && fim) {
      return `${formatarDataCurta(inicio)} — ${formatarDataCurta(fim)}`
    }

    if (inicio) return `A partir de ${formatarDataCurta(inicio)}`
    if (fim) return `Até ${formatarDataCurta(fim)}`
    return 'Todo o histórico'
  }, [filtrosAplicados])

  const dadosVisiveis = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR')

    if (!termo) return dados

    return dados.filter((item) =>
      Object.values(item).some((valor) =>
        String(valor ?? '')
          .toLocaleLowerCase('pt-BR')
          .includes(termo)
      )
    )
  }, [busca, dados])

  const resumo = useMemo(() => {
    const statusSelecionado = filtrosAplicados.status
      ? STATUS_LABELS[filtrosAplicados.status]
      : 'Todos'

    if (tipoRelatorio === 'consultas') {
      return [
        {
          label: 'Registros encontrados',
          value: dados.length,
          icon: FaClipboardList,
          tone: 'blue'
        },
        {
          label: 'Consultas realizadas',
          value: dados.filter((item) => item.status === 'REALIZADA').length,
          icon: FaCheckCircle,
          tone: 'green'
        },
        {
          label: 'Status selecionado',
          value: statusSelecionado,
          icon: FaFilter,
          tone: 'amber'
        }
      ]
    }

    if (tipoRelatorio === 'exames') {
      return [
        {
          label: 'Registros encontrados',
          value: dados.length,
          icon: FaClipboardList,
          tone: 'blue'
        },
        {
          label: 'Exames finalizados',
          value: dados.filter((item) =>
            ['REALIZADO', 'ENTREGUE'].includes(item.status)
          ).length,
          icon: FaCheckCircle,
          tone: 'green'
        },
        {
          label: 'Status selecionado',
          value: statusSelecionado,
          icon: FaFilter,
          tone: 'amber'
        }
      ]
    }

    const totalAtendimentos = dados.reduce(
      (total, item) => total + (Number(item.total_atendimentos) || 0),
      0
    )

    return [
      {
        label: 'Médicos listados',
        value: dados.length,
        icon: FaUserMd,
        tone: 'blue'
      },
      {
        label: 'Total de atendimentos',
        value: totalAtendimentos,
        icon: FaCalendarCheck,
        tone: 'green'
      },
      {
        label: 'Período analisado',
        value: periodoLabel,
        icon: FaCalendarAlt,
        tone: 'violet'
      }
    ]
  }, [dados, filtrosAplicados.status, periodoLabel, tipoRelatorio])

  const limparObjetoFiltros = (valores = filtros) => {
    const filtrosLimpos = {}

    if (valores.data_inicial) {
      filtrosLimpos.data_inicial = valores.data_inicial
    }

    if (valores.data_final) {
      filtrosLimpos.data_final = valores.data_final
    }

    if (valores.status && tipoRelatorio !== 'atendimentos-medico') {
      filtrosLimpos.status = valores.status
    }

    return filtrosLimpos
  }

  const handleChangeFiltro = (event) => {
    const { name, value } = event.target

    setErroFiltro('')
    setFiltros((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleChangeTipo = (novoTipo) => {
    if (novoTipo === tipoRelatorio || loading) return

    setTipoRelatorio(novoTipo)
    setDados([])
    setBusca('')
    setErro('')
    setErroFiltro('')
    setFiltros(FILTROS_INICIAIS)
    setFiltrosAplicados(FILTROS_INICIAIS)
    carregarRelatorio(novoTipo)
  }

  const aplicarFiltros = (event) => {
    event.preventDefault()

    if (
      filtros.data_inicial &&
      filtros.data_final &&
      filtros.data_inicial > filtros.data_final
    ) {
      setErroFiltro('A data inicial não pode ser posterior à data final.')
      return
    }

    setErroFiltro('')
    setFiltrosAplicados({ ...filtros })
    carregarRelatorio(tipoRelatorio, limparObjetoFiltros())
  }

  const limparFiltros = () => {
    setFiltros(FILTROS_INICIAIS)
    setFiltrosAplicados(FILTROS_INICIAIS)
    setErroFiltro('')
    setBusca('')
    carregarRelatorio(tipoRelatorio)
  }

  const recarregarRelatorio = () => {
    carregarRelatorio(tipoRelatorio, limparObjetoFiltros(filtrosAplicados))
  }

  const renderStatus = (status) => {
    const statusClass = String(status || 'sem-status').toLowerCase()

    return (
      <span className={`reports-status reports-status--${statusClass}`}>
        <span />
        {STATUS_LABELS[status] || status || 'Sem status'}
      </span>
    )
  }

  const renderTabelaConsultas = () => (
    <table className="reports-table">
      <thead>
        <tr>
          <th>Consulta</th>
          <th>Paciente</th>
          <th>Médico</th>
          <th>Data e hora</th>
          <th>Status</th>
          <th>Motivo</th>
        </tr>
      </thead>
      <tbody>
        {dadosVisiveis.map((item) => (
          <tr key={item.id}>
            <td>
              <span className="reports-id">#{item.id}</span>
            </td>
            <td>
              <div className="reports-person">
                <span className="reports-avatar reports-avatar--patient">
                  {obterIniciais(item.paciente_nome)}
                </span>
                <strong>{item.paciente_nome || '-'}</strong>
              </div>
            </td>
            <td>
              <div className="reports-person reports-person--stacked">
                <strong>{item.medico_nome || '-'}</strong>
                <span>{item.especialidade || 'Especialidade não informada'}</span>
              </div>
            </td>
            <td>
              <div className="reports-date">
                <strong>{formatarData(item.data_consulta)}</strong>
                <span>{formatarHora(item.hora_consulta)}</span>
              </div>
            </td>
            <td>{renderStatus(item.status)}</td>
            <td>
              <span className="reports-text-cell" title={item.motivo || '-'}>
                {item.motivo || '-'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  const renderTabelaExames = () => (
    <table className="reports-table">
      <thead>
        <tr>
          <th>Exame</th>
          <th>Paciente</th>
          <th>Médico</th>
          <th>Data</th>
          <th>Status</th>
          <th>Resultado</th>
        </tr>
      </thead>
      <tbody>
        {dadosVisiveis.map((item) => (
          <tr key={item.id}>
            <td>
              <div className="reports-exam-name">
                <span>
                  <FaFlask />
                </span>
                <div>
                  <strong>{item.nome_exame || 'Exame sem nome'}</strong>
                  <small>#{item.id}</small>
                </div>
              </div>
            </td>
            <td>{item.paciente_nome || '-'}</td>
            <td>{item.medico_nome || '-'}</td>
            <td>{formatarData(item.data_exame)}</td>
            <td>{renderStatus(item.status)}</td>
            <td>
              <span className="reports-text-cell" title={item.resultado || '-'}>
                {item.resultado || '-'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  const renderTabelaAtendimentosMedico = () => (
    <table className="reports-table reports-table--ranking">
      <thead>
        <tr>
          <th>Posição</th>
          <th>Médico</th>
          <th>Especialidade</th>
          <th>Atendimentos</th>
        </tr>
      </thead>
      <tbody>
        {dadosVisiveis.map((item, index) => (
          <tr key={item.medico_id}>
            <td>
              <span className={`reports-rank ${index < 3 ? 'is-highlighted' : ''}`}>
                {String(index + 1).padStart(2, '0')}
              </span>
            </td>
            <td>
              <div className="reports-person">
                <span className="reports-avatar reports-avatar--doctor">
                  {obterIniciais(item.medico_nome)}
                </span>
                <strong>{item.medico_nome || '-'}</strong>
              </div>
            </td>
            <td>{item.especialidade || '-'}</td>
            <td>
              <span className="reports-total">
                {item.total_atendimentos}
                <small>consultas</small>
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  const renderTabela = () => {
    if (tipoRelatorio === 'consultas') return renderTabelaConsultas()
    if (tipoRelatorio === 'exames') return renderTabelaExames()
    return renderTabelaAtendimentosMedico()
  }

  const renderMobileCard = (item, index) => {
    if (tipoRelatorio === 'consultas') {
      return (
        <article key={item.id} className="reports-mobile-card">
          <div className="reports-mobile-card__header">
            <div className="reports-person">
              <span className="reports-avatar reports-avatar--patient">
                {obterIniciais(item.paciente_nome)}
              </span>
              <div className="reports-person--stacked">
                <strong>{item.paciente_nome || '-'}</strong>
                <span>Consulta #{item.id}</span>
              </div>
            </div>
            {renderStatus(item.status)}
          </div>
          <div className="reports-mobile-card__details">
            <div>
              <span>Médico</span>
              <strong>{item.medico_nome || '-'}</strong>
            </div>
            <div>
              <span>Especialidade</span>
              <strong>{item.especialidade || '-'}</strong>
            </div>
            <div>
              <span>Data</span>
              <strong>{formatarData(item.data_consulta)}</strong>
            </div>
            <div>
              <span>Horário</span>
              <strong>{formatarHora(item.hora_consulta)}</strong>
            </div>
          </div>
          <p className="reports-mobile-card__note">
            <span>Motivo</span>
            {item.motivo || 'Não informado'}
          </p>
        </article>
      )
    }

    if (tipoRelatorio === 'exames') {
      return (
        <article key={item.id} className="reports-mobile-card">
          <div className="reports-mobile-card__header">
            <div className="reports-exam-name">
              <span>
                <FaFlask />
              </span>
              <div>
                <strong>{item.nome_exame || 'Exame sem nome'}</strong>
                <small>Exame #{item.id}</small>
              </div>
            </div>
            {renderStatus(item.status)}
          </div>
          <div className="reports-mobile-card__details">
            <div>
              <span>Paciente</span>
              <strong>{item.paciente_nome || '-'}</strong>
            </div>
            <div>
              <span>Médico</span>
              <strong>{item.medico_nome || '-'}</strong>
            </div>
            <div>
              <span>Data</span>
              <strong>{formatarData(item.data_exame)}</strong>
            </div>
          </div>
          <p className="reports-mobile-card__note">
            <span>Resultado</span>
            {item.resultado || 'Ainda não informado'}
          </p>
        </article>
      )
    }

    return (
      <article key={item.medico_id} className="reports-mobile-card">
        <div className="reports-mobile-card__header">
          <div className="reports-person">
            <span className="reports-avatar reports-avatar--doctor">
              {obterIniciais(item.medico_nome)}
            </span>
            <div className="reports-person--stacked">
              <strong>{item.medico_nome || '-'}</strong>
              <span>{item.especialidade || '-'}</span>
            </div>
          </div>
          <span className={`reports-rank ${index < 3 ? 'is-highlighted' : ''}`}>
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>
        <div className="reports-mobile-card__total">
          <strong>{item.total_atendimentos}</strong>
          <span>atendimentos no período</span>
        </div>
      </article>
    )
  }

  return (
    <MainLayout>
      <div className="reports-page">
        <section className="reports-hero">
          <div className="reports-hero__content">
            <span className="reports-hero__eyebrow">
              <FaChartBar />
              Central de análises
            </span>
            <h1>
              Relatórios claros para uma <span>gestão mais eficiente</span>
            </h1>
            <p>
              Consulte informações operacionais da clínica, compare períodos e
              encontre os dados importantes com mais facilidade.
            </p>
          </div>

          <div className="reports-hero__summary">
            <div>
              <FaClipboardList />
              <span>
                <small>Relatório atual</small>
                <strong>{tipoAtual?.title}</strong>
              </span>
            </div>
            <div>
              <FaCalendarAlt />
              <span>
                <small>Período</small>
                <strong>{periodoLabel}</strong>
              </span>
            </div>
          </div>

          <FaFileMedicalAlt className="reports-hero__decoration" aria-hidden="true" />
        </section>

        {(erro || erroFiltro) && (
          <Alert variant="danger" className="reports-feedback">
            {erroFiltro || erro}
          </Alert>
        )}

        <section className="reports-type-section">
          <div className="reports-section-heading">
            <div>
              <span>Escolha a análise</span>
              <h2>Qual relatório deseja consultar?</h2>
            </div>
          </div>

          <div className="reports-type-grid">
            {TIPOS_RELATORIO.map((tipo) => {
              const Icon = tipo.icon
              const isActive = tipo.id === tipoRelatorio

              return (
                <button
                  key={tipo.id}
                  type="button"
                  className={`reports-type-card reports-type-card--${tipo.tone} ${
                    isActive ? 'is-active' : ''
                  }`}
                  onClick={() => handleChangeTipo(tipo.id)}
                  disabled={loading}
                  aria-pressed={isActive}
                >
                  <span className="reports-type-card__icon">
                    <Icon />
                  </span>
                  <span className="reports-type-card__text">
                    <strong>{tipo.title}</strong>
                    <small>{tipo.description}</small>
                  </span>
                  <span className="reports-type-card__check">
                    <FaCheckCircle />
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="reports-filter-panel">
          <div className="reports-filter-panel__heading">
            <span className="reports-filter-panel__icon">
              <FaFilter />
            </span>
            <div>
              <strong>Filtros do relatório</strong>
              <p>Refine os registros por período e situação.</p>
            </div>
          </div>

          <Form className="reports-filter-form" onSubmit={aplicarFiltros}>
            <Form.Group className="reports-field">
              <Form.Label>Data inicial</Form.Label>
              <div className="reports-field__control">
                <FaCalendarAlt />
                <Form.Control
                  type="date"
                  name="data_inicial"
                  value={filtros.data_inicial}
                  max={filtros.data_final || undefined}
                  onChange={handleChangeFiltro}
                />
              </div>
            </Form.Group>

            <Form.Group className="reports-field">
              <Form.Label>Data final</Form.Label>
              <div className="reports-field__control">
                <FaCalendarAlt />
                <Form.Control
                  type="date"
                  name="data_final"
                  value={filtros.data_final}
                  min={filtros.data_inicial || undefined}
                  onChange={handleChangeFiltro}
                />
              </div>
            </Form.Group>

            {tipoRelatorio !== 'atendimentos-medico' && (
              <Form.Group className="reports-field">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  name="status"
                  value={filtros.status}
                  onChange={handleChangeFiltro}
                >
                  {statusDisponiveis.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            )}

            <div className="reports-filter-form__actions">
              <Button type="submit" className="reports-filter-button" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" />
                    Atualizando
                  </>
                ) : (
                  <>
                    <FaFilter />
                    Aplicar
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="light"
                className="reports-clear-button"
                onClick={limparFiltros}
                disabled={loading}
              >
                Limpar
              </Button>
            </div>
          </Form>
        </section>

        <section className="reports-summary" aria-label="Resumo do relatório">
          {resumo.map((item) => {
            const Icon = item.icon

            return (
              <article
                key={item.label}
                className={`reports-summary-card reports-summary-card--${item.tone}`}
              >
                <span className="reports-summary-card__icon">
                  <Icon />
                </span>
                <span>
                  <small>{item.label}</small>
                  <strong>{item.value}</strong>
                </span>
              </article>
            )
          })}
        </section>

        <section className="reports-results-panel">
          <div className="reports-results-panel__header">
            <div className="reports-results-panel__title">
              <span className={`reports-results-panel__icon reports-results-panel__icon--${tipoAtual?.tone}`}>
                {tipoAtual && <tipoAtual.icon />}
              </span>
              <div>
                <span>Resultado da consulta</span>
                <h2>{tipoAtual?.title}</h2>
                <p>
                  {dadosVisiveis.length}{' '}
                  {dadosVisiveis.length === 1 ? 'registro exibido' : 'registros exibidos'}
                </p>
              </div>
            </div>

            <div className="reports-results-panel__tools">
              <div className="reports-search">
                <FaSearch />
                <Form.Control
                  type="search"
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar nos resultados..."
                  aria-label="Buscar nos resultados"
                  disabled={loading || dados.length === 0}
                />
              </div>
              <button
                type="button"
                className="reports-refresh"
                onClick={recarregarRelatorio}
                disabled={loading}
                aria-label="Atualizar relatório"
                title="Atualizar relatório"
              >
                <FaSyncAlt className={loading ? 'is-spinning' : ''} />
              </button>
            </div>
          </div>

          {ultimaAtualizacao && (
            <div className="reports-results-panel__meta">
              Dados atualizados às{' '}
              {ultimaAtualizacao.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          )}

          {loading ? (
            <div className="reports-loading">
              <div className="reports-loading__icon">
                <Spinner animation="border" />
              </div>
              <strong>Preparando relatório</strong>
              <p>Estamos organizando os registros selecionados.</p>
            </div>
          ) : dadosVisiveis.length > 0 ? (
            <>
              <div className="reports-table-wrap">{renderTabela()}</div>
              <div className="reports-mobile-list">
                {dadosVisiveis.map(renderMobileCard)}
              </div>
            </>
          ) : (
            <div className="reports-empty">
              {busca ? <FaSearch /> : <FaClipboardList />}
              <h3>{busca ? 'Nenhum resultado para a busca' : 'Nenhum registro encontrado'}</h3>
              <p>
                {busca
                  ? 'Tente buscar por outro nome, status ou informação.'
                  : 'Ajuste os filtros ou selecione outro período para consultar os dados.'}
              </p>
              {busca && (
                <Button variant="light" onClick={() => setBusca('')}>
                  Limpar busca
                </Button>
              )}
            </div>
          )}
        </section>
      </div>
    </MainLayout>
  )
}

export default Relatorios
