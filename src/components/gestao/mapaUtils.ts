import type { LatLngBoundsExpression } from 'leaflet'
import type { Ponto, Protocolo } from '../../services/gestaoContratos'

export const getPontoMapLabel = (ponto: Ponto) => `Ponto ${ponto.codigo}, ${ponto.rodovia} km ${ponto.km}`

export const getPontoMapMeta = (ponto: Ponto, protocolo?: Protocolo) => ({
  location: `${ponto.estado} · ${ponto.rodovia} · km ${ponto.km}`,
  status: ponto.resultado ?? protocolo?.status ?? 'nao_iniciado',
  statusSource: ponto.resultado ? 'ponto' as const : 'protocolo' as const,
})

export type MapaFiltro = { busca?: string; estado?: string; tipo?: Ponto['tipo'] | ''; status?: string }

export const filtrarPontosMapa = (pontos: Ponto[], protocolos: Protocolo[], filtro: MapaFiltro) => {
  const busca = filtro.busca?.trim().toLocaleLowerCase('pt-BR') ?? ''
  return pontos.filter((ponto) => {
    const protocolo = ponto.protocoloId ? protocolos.find((item) => item.id === ponto.protocoloId) : undefined
    const status = ponto.resultado ?? protocolo?.status ?? 'nao_iniciado'
    const texto = [ponto.codigo, ponto.estado, ponto.rodovia, ponto.km, ponto.concessionaria].join(' ').toLocaleLowerCase('pt-BR')
    return (!busca || texto.includes(busca))
      && (!filtro.estado || ponto.estado === filtro.estado)
      && (!filtro.tipo || ponto.tipo === filtro.tipo)
      && (!filtro.status || status === filtro.status)
  })
}

export const getMapPoints = (pontos: Ponto[]) => pontos.filter((ponto) => Number.isFinite(ponto.latitude) && Number.isFinite(ponto.longitude))

export const getSelectedPointId = (search: string, pontos: Ponto[]) => {
  const requested = new URLSearchParams(search).get('ponto')
  return requested && pontos.some((ponto) => ponto.id === requested) ? requested : null
}

export const getMapBounds = (pontos: Ponto[]): LatLngBoundsExpression | null => {
  const located = getMapPoints(pontos)
  if (!located.length) return null
  const latitudes = located.map((ponto) => ponto.latitude as number)
  const longitudes = located.map((ponto) => ponto.longitude as number)
  return [[Math.min(...latitudes), Math.min(...longitudes)], [Math.max(...latitudes), Math.max(...longitudes)]]
}

export const getPontoColor = (ponto: Ponto, protocolo?: Protocolo) => {
  if (ponto.resultado === 'regularizado') return '#1f8f5f'
  if (ponto.resultado === 'aprovado_implantacao') return '#147d8a'
  if (protocolo?.status === 'paralisado') return '#8f2635'
  if (protocolo?.status === 'em_correcao') return '#c43d4b'
  if (protocolo?.status === 'aguardando_terceiros') return '#b97912'
  if (protocolo?.status === 'em_analise') return '#7656a8'
  if (protocolo?.status === 'em_andamento') return '#236da8'
  if (protocolo?.status === 'concluido') return '#1f8f5f'
  return '#6b7280'
}
