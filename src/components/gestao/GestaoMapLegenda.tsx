import type { GestaoDashboardConfig } from '../../services/gestaoDashboardConfig'
import { rotuloLegendaMapaDashboard } from '../../services/gestaoDashboardConfig'
import { LEGENDA_MAPA_GESTAO } from './mapaUtils'

type Props = {
  config?: GestaoDashboardConfig | null
}

export default function GestaoMapLegenda({ config }: Props) {
  return (
    <div className="gestao-map-legend" aria-label="Legenda de cores do mapa">
      <strong>Legenda</strong>
      {LEGENDA_MAPA_GESTAO.map((item) => (
        <span key={item.id}>
          <i className="gestao-legend-dot" style={{ background: item.color }} aria-hidden="true" />
          {rotuloLegendaMapaDashboard(item.id, config, item.label)}
        </span>
      ))}
    </div>
  )
}