import { useState, type KeyboardEvent, type SyntheticEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { fatiarPontosStatus, STATUS_PONTOS_PAGE_SIZE, toDonutSegments, type DashboardStatusSlice, type GestaoDashboardData } from '../../services/gestaoDashboard'
import { nomeGestao } from '../../views/gestaoUi'
import './GestaoDashboardCharts.css'

function conterEvento(event: SyntheticEvent) {
  event.stopPropagation()
}

type GestaoDashboardChartsProps = {
  data: GestaoDashboardData
}

const DONUT_RADIUS = 40
const DONUT_C = 2 * Math.PI * DONUT_RADIUS

export default function GestaoDashboardCharts({ data }: GestaoDashboardChartsProps) {
  const { contratoId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const [abertos, setAbertos] = useState<string[]>([])
  const [visiveis, setVisiveis] = useState<Record<string, number>>({})
  const statusSegments = toDonutSegments(
    data.status.map((item) => ({ color: item.color, label: item.label, total: item.total })),
    data.totalProtocolos,
    DONUT_C,
  )
  const maxPrevistoRealizado = Math.max(data.previstoRealizado.previsto, data.previstoRealizado.realizado, 1)
  const toggleStatus = (status: string) => {
    setAbertos((atuais) => atuais.includes(status) ? atuais.filter((item) => item !== status) : [...atuais, status])
    setVisiveis((atuais) => atuais[status] ? atuais : { ...atuais, [status]: STATUS_PONTOS_PAGE_SIZE })
  }
  const fecharStatus = (status: string) => {
    setAbertos((atuais) => atuais.filter((item) => item !== status))
  }
  const carregarMais = (status: string) => {
    setVisiveis((atuais) => ({ ...atuais, [status]: (atuais[status] ?? STATUS_PONTOS_PAGE_SIZE) + STATUS_PONTOS_PAGE_SIZE }))
  }
  const hrefPonto = (pontoId: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('ponto', pontoId)
    return { pathname: `/gestao-contratos/${contratoId}/pontos`, search: next.toString() }
  }

  return (
    <section className="gestao-dashboard-charts" aria-label="Indicadores visuais">
      <div className="gestao-chart-card gestao-chart-status">
        <div className="gestao-section-head">
          <div><span className="gestao-eyebrow">Distribuição</span><h3>Status dos protocolos</h3></div>
          <strong>{data.totalProtocolos}</strong>
        </div>
        {data.totalProtocolos ? (
          <div className="gestao-status-chart">
            <svg className="gestao-pie" viewBox="0 0 100 100" aria-hidden="true">
              <circle className="gestao-pie-track" cx="50" cy="50" r={DONUT_RADIUS} />
              {statusSegments.map((segment) => (
                <circle
                  key={segment.label}
                  className="gestao-pie-segment"
                  cx="50"
                  cy="50"
                  r={DONUT_RADIUS}
                  stroke={segment.color}
                  strokeDasharray={`${segment.dash} ${DONUT_C - segment.dash}`}
                  strokeDashoffset={-segment.offset}
                />
              ))}
            </svg>
            <ul className="gestao-pie-legend">
              {data.status.map((item) => (
                <StatusLegendItem
                  key={item.status}
                  item={item}
                  totalProtocolos={data.totalProtocolos}
                  aberto={abertos.includes(item.status)}
                  visivel={visiveis[item.status] ?? STATUS_PONTOS_PAGE_SIZE}
                  onToggle={() => toggleStatus(item.status)}
                  onFechar={() => fecharStatus(item.status)}
                  onMais={() => carregarMais(item.status)}
                  hrefPonto={hrefPonto}
                />
              ))}
            </ul>
          </div>
        ) : <p className="gestao-chart-empty">Nenhum protocolo neste recorte.</p>}
      </div>

      <div className="gestao-chart-card gestao-chart-side">
        <div className="gestao-chart-side-block gestao-chart-donut" role="img" aria-label={data.totalPontos ? `${data.percentualPontosConcluidos}% dos pontos concluídos operacionalmente` : 'Nenhum ponto neste recorte.'}>
          <div><span className="gestao-eyebrow">Pontos</span><h3>Conclusão operacional</h3></div>
          {data.totalPontos ? (
            <>
              <div className="gestao-donut" style={{ '--gestao-donut': `${data.percentualPontosConcluidos}%` } as React.CSSProperties}>
                <strong>{data.percentualPontosConcluidos}%</strong>
              </div>
              <p>{data.indicadores.regularizados + data.indicadores.aprovadosImplantacao} de {data.totalPontos} pontos concluídos</p>
              <p className="gestao-chart-meta">{data.pontosSemProtocolo} sem protocolo vinculado</p>
            </>
          ) : <p className="gestao-chart-empty">Nenhum ponto neste recorte.</p>}
        </div>

        <div className="gestao-chart-side-block" role="img" aria-label={`Entregas previstas: ${data.previstoRealizado.previsto}. Realizadas: ${data.previstoRealizado.realizado}.`}>
          <div><span className="gestao-eyebrow">Entregas</span><h3>Previsto x realizado</h3></div>
          <div className="gestao-bars gestao-bars-compact">
            <div className="gestao-bar-row">
              <span>Previstas</span>
              <div className="gestao-bar-track"><i style={{ inlineSize: `${(data.previstoRealizado.previsto / maxPrevistoRealizado) * 100}%`, background: '#236da8' }} /></div>
              <strong>{data.previstoRealizado.previsto}</strong>
            </div>
            <div className="gestao-bar-row">
              <span>Realizadas</span>
              <div className="gestao-bar-track"><i style={{ inlineSize: `${(data.previstoRealizado.realizado / maxPrevistoRealizado) * 100}%`, background: '#1f8f5f' }} /></div>
              <strong>{data.previstoRealizado.realizado}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function StatusLegendItem({ item, totalProtocolos, aberto, visivel, onToggle, onFechar, onMais, hrefPonto }: {
  item: DashboardStatusSlice
  totalProtocolos: number
  aberto: boolean
  visivel: number
  onToggle: () => void
  onFechar: () => void
  onMais: () => void
  hrefPonto: (pontoId: string) => { pathname: string; search: string }
}) {
  const painelId = `gestao-status-pontos-${item.status}`
  const { visiveis, restantes } = fatiarPontosStatus(item.pontos, visivel)
  const onToggleClick = (event: SyntheticEvent) => {
    conterEvento(event)
    onToggle()
  }
  const onPainelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return
    conterEvento(event)
    event.preventDefault()
    onFechar()
  }
  const onMaisClick = (event: SyntheticEvent) => {
    conterEvento(event)
    event.preventDefault()
    onMais()
  }
  return (
    <li className={aberto ? 'is-open' : undefined} onClick={conterEvento}>
      <button type="button" className="gestao-status-toggle" aria-expanded={aberto} aria-controls={painelId} onClick={onToggleClick} onPointerDown={conterEvento}>
        <i style={{ background: item.color }} aria-hidden="true" />
        <span>{nomeGestao(item.status)}</span>
        <strong>{item.total}</strong>
        <small>{totalProtocolos ? Math.round((item.total / totalProtocolos) * 100) : 0}%</small>
        <b className="gestao-status-chevron" aria-hidden="true" />
      </button>
      <div
        className={`gestao-status-panel${aberto ? ' is-open' : ''}`}
        id={painelId}
        inert={!aberto}
        aria-hidden={!aberto}
        onClick={conterEvento}
        onPointerDown={conterEvento}
        onWheel={conterEvento}
        onKeyDown={onPainelKeyDown}
      >
        <div className="gestao-status-panel-body">
          {item.pontos.length ? (
            <>
              <ul className="gestao-status-points">
                {visiveis.map((ponto) => (
                  <li key={ponto.id}>
                    <Link to={hrefPonto(ponto.id)} onClick={conterEvento}>
                      <strong>{ponto.codigo}</strong>
                      <span>{ponto.rodovia} · km {ponto.km}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {restantes > 0 && (
                <button type="button" className="gestao-button-link gestao-status-more" onClick={onMaisClick} onPointerDown={conterEvento}>
                  Carregar mais · {restantes} restantes
                </button>
              )}
            </>
          ) : (
            <p className="gestao-status-empty">Nenhum ponto vinculado a protocolos neste status.</p>
          )}
        </div>
      </div>
    </li>
  )
}
