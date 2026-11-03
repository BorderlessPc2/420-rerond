import { toDonutSegments, type GestaoDashboardData } from '../../services/gestaoDashboard'
import './GestaoDashboardCharts.css'

type GestaoDashboardChartsProps = {
  data: GestaoDashboardData
}

const DONUT_RADIUS = 40
const DONUT_C = 2 * Math.PI * DONUT_RADIUS

export default function GestaoDashboardCharts({ data }: GestaoDashboardChartsProps) {
  const statusSegments = toDonutSegments(
    data.status.map((item) => ({ color: item.color, label: item.label, total: item.total })),
    data.totalProtocolos,
    DONUT_C,
  )
  const statusSummary = data.status.map((item) => `${item.label}: ${item.total}`).join('. ')
  const maxPrevistoRealizado = Math.max(data.previstoRealizado.previsto, data.previstoRealizado.realizado, 1)

  return (
    <section className="gestao-dashboard-charts" aria-label="Indicadores visuais">
      <div className="gestao-chart-card gestao-chart-status" role="img" aria-label={data.totalProtocolos ? `Distribuição de ${data.totalProtocolos} protocolos por status. ${statusSummary}` : 'Nenhum protocolo neste recorte.'}>
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
                <li key={item.status}>
                  <i style={{ background: item.color }} aria-hidden="true" />
                  <span>{item.label}</span>
                  <strong>{item.total}</strong>
                  <small>{data.totalProtocolos ? Math.round((item.total / data.totalProtocolos) * 100) : 0}%</small>
                </li>
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
