import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Form, Spinner } from 'react-bootstrap'
import {
  FaBan,
  FaCalendarAlt,
  FaCalendarCheck,
  FaChartLine,
  FaChartPie,
  FaCheckCircle,
  FaClock,
  FaFilter,
  FaHeartbeat,
  FaSyncAlt,
  FaUserCheck,
  FaUserTimes
} from 'react-icons/fa'
import MainLayout from '../../components/layout/MainLayout'
import { obterIndicadores } from '../../services/indicadorService'
import './Indicadores.css'

const FILTROS_INICIAIS = {
  data_inicial: '',
  data_final: ''
}

function parseLocalDate(value) {
  if (!value) return null

  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number)

  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function formatarData(value) {
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

function converterPercentual(valor) {
  const numero = Number(String(valor ?? 0).replace('%', '')) || 0
  return Math.min(Math.max(numero, 0), 100)
}

function Indicadores() {
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [erroFiltro, setErroFiltro] = useState('')
  const [indicadores, setIndicadores] = useState(null)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null)
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS)
  const [filtrosAplicados, setFiltrosAplicados] = useState(FILTROS_INICIAIS)

  const carregarIndicadores = useCallback(async (filtrosConsulta = {}) => {
    try {
      setLoading(true)
      setErro('')

      const dados = await obterIndicadores(filtrosConsulta)
      setIndicadores(dados)
      setUltimaAtualizacao(new Date())
    } catch (error) {
      console.error('Erro ao carregar indicadores:', error)
      setErro(error.response?.data?.erro || 'Erro ao carregar indicadores.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarIndicadores()
  }, [carregarIndicadores])

  const periodoLabel = useMemo(() => {
    const inicio = filtrosAplicados.data_inicial
    const fim = filtrosAplicados.data_final

    if (inicio && fim) {
      return `${formatarData(inicio)} — ${formatarData(fim)}`
    }

    if (inicio) return `A partir de ${formatarData(inicio)}`
    if (fim) return `Até ${formatarData(fim)}`
    return 'Todo o histórico'
  }, [filtrosAplicados])

  const metricas = useMemo(() => {
    if (!indicadores) return []

    return [
      {
        label: 'Total de consultas',
        value: indicadores.total_consultas,
        description: 'Agendamentos no período',
        icon: FaCalendarCheck,
        tone: 'blue'
      },
      {
        label: 'Realizadas',
        value: indicadores.atendimentos_realizados,
        description: 'Atendimentos concluídos',
        icon: FaCheckCircle,
        tone: 'green'
      },
      {
        label: 'Check-ins',
        value: indicadores.checkins_realizados,
        description: 'Entradas confirmadas',
        icon: FaUserCheck,
        tone: 'violet'
      },
      {
        label: 'Faltas',
        value: indicadores.faltas,
        description: 'Pacientes ausentes',
        icon: FaUserTimes,
        tone: 'rose'
      },
      {
        label: 'Cancelamentos',
        value: indicadores.cancelamentos,
        description: 'Consultas canceladas',
        icon: FaBan,
        tone: 'amber'
      }
    ]
  }, [indicadores])

  const taxas = useMemo(() => {
    if (!indicadores) return []

    return [
      {
        label: 'Comparecimento',
        description: 'Consultas realizadas em relação ao total',
        value: indicadores.taxa_comparecimento,
        percentage: converterPercentual(indicadores.taxa_comparecimento),
        icon: FaHeartbeat,
        tone: 'green'
      },
      {
        label: 'Faltas',
        description: 'Ausências registradas no período',
        value: indicadores.taxa_faltas,
        percentage: converterPercentual(indicadores.taxa_faltas),
        icon: FaUserTimes,
        tone: 'rose'
      },
      {
        label: 'Cancelamentos',
        description: 'Agendamentos cancelados no período',
        value: indicadores.taxa_cancelamentos,
        percentage: converterPercentual(indicadores.taxa_cancelamentos),
        icon: FaBan,
        tone: 'amber'
      }
    ]
  }, [indicadores])

  const composicao = useMemo(() => {
    const total = Number(indicadores?.total_consultas) || 0
    const realizadas = Number(indicadores?.atendimentos_realizados) || 0
    const canceladas = Number(indicadores?.cancelamentos) || 0
    const faltas = Number(indicadores?.faltas) || 0
    const outros = Math.max(total - realizadas - canceladas - faltas, 0)
    const percentual = (valor) => (total > 0 ? (valor / total) * 100 : 0)
    const realizadasFim = percentual(realizadas)
    const canceladasFim = realizadasFim + percentual(canceladas)
    const faltasFim = canceladasFim + percentual(faltas)

    return {
      total,
      items: [
        { label: 'Realizadas', value: realizadas, color: '#13a474' },
        { label: 'Canceladas', value: canceladas, color: '#e2a43a' },
        { label: 'Faltas', value: faltas, color: '#dc526b' },
        { label: 'Outros status', value: outros, color: '#dbe3ef' }
      ],
      chartStyle: {
        background:
          total > 0
            ? `conic-gradient(
                #13a474 0% ${realizadasFim}%,
                #e2a43a ${realizadasFim}% ${canceladasFim}%,
                #dc526b ${canceladasFim}% ${faltasFim}%,
                #dbe3ef ${faltasFim}% 100%
              )`
            : '#edf1f6'
      }
    }
  }, [indicadores])

  const handleChange = (event) => {
    const { name, value } = event.target

    setErroFiltro('')
    setFiltros((prev) => ({
      ...prev,
      [name]: value
    }))
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

    const filtrosLimpos = {}

    if (filtros.data_inicial) {
      filtrosLimpos.data_inicial = filtros.data_inicial
    }

    if (filtros.data_final) {
      filtrosLimpos.data_final = filtros.data_final
    }

    setErroFiltro('')
    setFiltrosAplicados({
      data_inicial: filtros.data_inicial,
      data_final: filtros.data_final
    })
    carregarIndicadores(filtrosLimpos)
  }

  const limparFiltros = () => {
    setFiltros(FILTROS_INICIAIS)
    setFiltrosAplicados(FILTROS_INICIAIS)
    setErroFiltro('')
    carregarIndicadores()
  }

  const recarregarIndicadores = () => {
    const filtrosAtivos = {}

    if (filtrosAplicados.data_inicial) {
      filtrosAtivos.data_inicial = filtrosAplicados.data_inicial
    }

    if (filtrosAplicados.data_final) {
      filtrosAtivos.data_final = filtrosAplicados.data_final
    }

    carregarIndicadores(filtrosAtivos)
  }

  return (
    <MainLayout>
      <div className="indicators-page">
        <section className="indicators-hero">
          <div className="indicators-hero__content">
            <span className="indicators-hero__eyebrow">
              <FaChartLine />
              Inteligência operacional
            </span>
            <h1>
              Indicadores que <span>orientam decisões</span>
            </h1>
            <p>
              Acompanhe o desempenho dos atendimentos e identifique rapidamente
              oportunidades para melhorar a rotina da clínica.
            </p>
          </div>

          <div className="indicators-hero__meta">
            <div className="indicators-hero__period">
              <FaCalendarAlt />
              <span>
                <small>Período analisado</small>
                <strong>{periodoLabel}</strong>
              </span>
            </div>

            <button
              type="button"
              className="indicators-refresh"
              onClick={recarregarIndicadores}
              disabled={loading}
              aria-label="Atualizar indicadores"
              title="Atualizar indicadores"
            >
              <FaSyncAlt className={loading ? 'is-spinning' : ''} />
            </button>
          </div>

          <FaChartPie className="indicators-hero__decoration" aria-hidden="true" />
        </section>

        {(erro || erroFiltro) && (
          <Alert variant="danger" className="indicators-feedback">
            {erroFiltro || erro}
          </Alert>
        )}

        <section className="indicators-filter-panel">
          <div className="indicators-filter-panel__heading">
            <div className="indicators-filter-panel__icon">
              <FaFilter />
            </div>
            <div>
              <span>Recorte da análise</span>
              <h2>Filtre os resultados por período</h2>
              <p>Escolha as datas para acompanhar uma janela específica.</p>
            </div>
          </div>

          <Form className="indicators-filter-form" onSubmit={aplicarFiltros}>
            <Form.Group className="indicators-date-field">
              <Form.Label>Data inicial</Form.Label>
              <div className="indicators-date-field__control">
                <FaCalendarAlt />
                <Form.Control
                  type="date"
                  name="data_inicial"
                  value={filtros.data_inicial}
                  max={filtros.data_final || undefined}
                  onChange={handleChange}
                />
              </div>
            </Form.Group>

            <Form.Group className="indicators-date-field">
              <Form.Label>Data final</Form.Label>
              <div className="indicators-date-field__control">
                <FaCalendarAlt />
                <Form.Control
                  type="date"
                  name="data_final"
                  value={filtros.data_final}
                  min={filtros.data_inicial || undefined}
                  onChange={handleChange}
                />
              </div>
            </Form.Group>

            <div className="indicators-filter-form__actions">
              <Button type="submit" className="indicators-filter-button" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" />
                    Atualizando
                  </>
                ) : (
                  <>
                    <FaFilter />
                    Aplicar filtro
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="light"
                className="indicators-clear-button"
                onClick={limparFiltros}
                disabled={loading}
              >
                Limpar
              </Button>
            </div>
          </Form>
        </section>

        {loading && !indicadores ? (
          <div className="indicators-loading">
            <div className="indicators-loading__icon">
              <Spinner animation="border" />
            </div>
            <strong>Calculando indicadores</strong>
            <p>Estamos consolidando os dados do período selecionado.</p>
          </div>
        ) : indicadores ? (
          <div className={`indicators-content ${loading ? 'is-updating' : ''}`}>
            <section className="indicators-section-heading">
              <div>
                <span>Visão geral</span>
                <h2>Resumo do período</h2>
              </div>
              {ultimaAtualizacao && (
                <div className="indicators-updated-at">
                  <FaClock />
                  Atualizado às{' '}
                  {ultimaAtualizacao.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              )}
            </section>

            <section className="indicators-metrics" aria-label="Resumo dos indicadores">
              {metricas.map((metrica) => {
                const Icon = metrica.icon

                return (
                  <article
                    key={metrica.label}
                    className={`indicators-metric-card indicators-metric-card--${metrica.tone}`}
                  >
                    <div className="indicators-metric-card__top">
                      <div className="indicators-metric-card__icon">
                        <Icon />
                      </div>
                      <span>{metrica.label}</span>
                    </div>
                    <strong>{metrica.value ?? 0}</strong>
                    <p>{metrica.description}</p>
                  </article>
                )
              })}
            </section>

            <section className="indicators-analysis-grid">
              <article className="indicators-panel indicators-rates-panel">
                <div className="indicators-panel__heading">
                  <div>
                    <span>Eficiência operacional</span>
                    <h2>Taxas do período</h2>
                    <p>Uma leitura rápida do comportamento dos agendamentos.</p>
                  </div>
                  <div className="indicators-panel__icon">
                    <FaChartLine />
                  </div>
                </div>

                <div className="indicators-rates">
                  {taxas.map((taxa) => {
                    const Icon = taxa.icon

                    return (
                      <div
                        key={taxa.label}
                        className={`indicators-rate indicators-rate--${taxa.tone}`}
                      >
                        <div className="indicators-rate__header">
                          <div className="indicators-rate__identity">
                            <div className="indicators-rate__icon">
                              <Icon />
                            </div>
                            <div>
                              <strong>{taxa.label}</strong>
                              <span>{taxa.description}</span>
                            </div>
                          </div>
                          <b>{taxa.value}</b>
                        </div>
                        <div
                          className="indicators-rate__track"
                          role="progressbar"
                          aria-label={`Taxa de ${taxa.label.toLowerCase()}`}
                          aria-valuemin="0"
                          aria-valuemax="100"
                          aria-valuenow={taxa.percentage}
                        >
                          <span style={{ width: `${taxa.percentage}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </article>

              <article className="indicators-panel indicators-composition-panel">
                <div className="indicators-panel__heading">
                  <div>
                    <span>Distribuição</span>
                    <h2>Composição das consultas</h2>
                    <p>Como os agendamentos do período estão distribuídos.</p>
                  </div>
                  <div className="indicators-panel__icon indicators-panel__icon--violet">
                    <FaChartPie />
                  </div>
                </div>

                <div className="indicators-composition">
                  <div
                    className="indicators-donut"
                    style={composicao.chartStyle}
                    role="img"
                    aria-label={`Distribuição de ${composicao.total} consultas`}
                  >
                    <div className="indicators-donut__center">
                      <strong>{composicao.total}</strong>
                      <span>consultas</span>
                    </div>
                  </div>

                  <div className="indicators-legend">
                    {composicao.items.map((item) => (
                      <div key={item.label} className="indicators-legend__item">
                        <span
                          className="indicators-legend__color"
                          style={{ backgroundColor: item.color }}
                        />
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            </section>
          </div>
        ) : (
          <div className="indicators-empty">
            <FaChartLine />
            <h2>Nenhum indicador encontrado</h2>
            <p>Experimente selecionar outro período para visualizar os resultados.</p>
          </div>
        )}
      </div>
    </MainLayout>
  )
}

export default Indicadores
