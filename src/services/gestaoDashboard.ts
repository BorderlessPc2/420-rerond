import { filtrarGestao, indicadoresGestao, type Ponto, type Protocolo, type Situacao } from './gestaoContratos'

export type DashboardFiltro = {
  estado?: string
  concessionaria?: string
  rodovia?: string
  status?: string
  tipo?: string
  etapa?: string
  inicio?: string
  fim?: string
  busca?: string
}

export type DashboardStatusPonto = {
  id: string
  codigo: string
  rodovia: string
  km: string
}

export type DashboardStatusSlice = {
  status: Situacao
  total: number
  color: string
  label: string
  pontos: DashboardStatusPonto[]
}

export const STATUS_PONTOS_PAGE_SIZE = 8

export function fatiarPontosStatus<T>(items: T[], visible: number) {
  const limite = Math.max(0, visible)
  return {
    visiveis: items.slice(0, limite),
    restantes: Math.max(0, items.length - limite),
  }
}

export type GestaoDashboardData = {
  estados: string[]
  concessionarias: string[]
  rodovias: string[]
  status: DashboardStatusSlice[]
  totalPontos: number
  totalProtocolos: number
  pontosSemProtocolo: number
  indicadores: ReturnType<typeof indicadoresGestao>
  percentualPontosConcluidos: number
  previstoRealizado: { previsto: number; realizado: number }
}

export const STATUS_CHART_COLORS: Record<Situacao, string> = {
  nao_iniciado: '#6b7280',
  em_andamento: '#236da8',
  em_analise: '#5b6ee1',
  em_correcao: '#c43d4b',
  aguardando_terceiros: '#b45309',
  paralisado: '#78716c',
  aprovado_concessionaria: '#1f8f5f',
  concluido: '#15803d',
}

const statusLabel = (status: Situacao) => {
  const texto = status.replaceAll('_', ' ')
  return texto ? texto[0].toUpperCase() + texto.slice(1) : status
}

export type DonutSegment = {
  color: string
  label: string
  total: number
  percent: number
  dash: number
  offset: number
}

export function toDonutSegments(
  slices: { color: string; label: string; total: number }[],
  total: number,
  circumference = 100,
): DonutSegment[] {
  let offset = 0
  return slices
    .filter((slice) => slice.total > 0)
    .map((slice) => {
      const dash = total ? (slice.total / total) * circumference : 0
      const segment: DonutSegment = {
        ...slice,
        dash,
        offset,
        percent: total ? Math.round((slice.total / total) * 100) : 0,
      }
      offset += dash
      return segment
    })
}

const normalizeFiltro = (filtro: string | DashboardFiltro): DashboardFiltro =>
  typeof filtro === 'string' ? { estado: filtro } : filtro

export function calcularDashboardGestao(
  protocolos: Protocolo[],
  pontos: Ponto[],
  filtro: string | DashboardFiltro = '',
): GestaoDashboardData {
  const normalized = normalizeFiltro(filtro)
  const recorte = filtrarGestao(protocolos, pontos, {
    estado: normalized.estado ?? '',
    concessionaria: normalized.concessionaria ?? '',
    rodovia: normalized.rodovia ?? '',
    status: normalized.status ?? '',
    tipo: normalized.tipo ?? '',
    etapa: normalized.etapa ?? '',
    inicio: normalized.inicio ?? '',
    fim: normalized.fim ?? '',
    busca: normalized.busca ?? '',
    protocoloId: '',
    pontoCodigo: '',
  })
  const estados = [...new Set(pontos.map((ponto) => ponto.estado).filter(Boolean))].sort()
  const concessionarias = [...new Set([...pontos, ...protocolos].map((item) => item.concessionaria).filter(Boolean))].sort()
  const rodovias = [...new Set([...pontos, ...protocolos].map((item) => item.rodovia).filter(Boolean))].sort()
  const statusByProtocolo = new Map(recorte.protocolos.map((protocolo) => [protocolo.id, protocolo.status]))
  const pontosPorStatus = new Map<Situacao, DashboardStatusPonto[]>()
  recorte.pontos.forEach((ponto) => {
    if (!ponto.protocoloId) return
    const status = statusByProtocolo.get(ponto.protocoloId)
    if (!status) return
    const lista = pontosPorStatus.get(status) ?? []
    lista.push({ id: ponto.id, codigo: ponto.codigo, rodovia: ponto.rodovia, km: ponto.km })
    pontosPorStatus.set(status, lista)
  })
  pontosPorStatus.forEach((lista) => lista.sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true })))
  const statusTotals = [...new Set(recorte.protocolos.map((protocolo) => protocolo.status))].map((status) => ({
    status,
    total: recorte.protocolos.filter((protocolo) => protocolo.status === status).length,
    color: STATUS_CHART_COLORS[status],
    label: statusLabel(status),
    pontos: pontosPorStatus.get(status) ?? [],
  })).filter((item) => item.total > 0)
  const indicadores = indicadoresGestao(recorte.protocolos, recorte.pontos)
  const concluidos = indicadores.regularizados + indicadores.aprovadosImplantacao
  return {
    estados,
    concessionarias,
    rodovias,
    status: statusTotals,
    totalPontos: recorte.pontos.length,
    totalProtocolos: recorte.protocolos.length,
    pontosSemProtocolo: recorte.pontos.filter((ponto) => ponto.protocoloId == null).length,
    indicadores,
    percentualPontosConcluidos: recorte.pontos.length ? Math.round((concluidos / recorte.pontos.length) * 100) : 0,
    previstoRealizado: { previsto: indicadores.previstos, realizado: indicadores.realizados },
  }
}
