import type { Ponto, Protocolo } from './gestaoContratos'
import { ETAPAS_ORDEM } from './gestaoTransicoes'
import { nomeGestao } from '../views/gestaoUi'
import { LEGENDA_MAPA_GESTAO } from '../components/gestao/mapaLegendaCatalog'
import type { Situacao } from './gestaoContratos'
import {
  corStatusProtocolo,
  isStatusPadrao,
  listarStatusContrato,
  rotuloStatusProtocolo,
  SITUACOES_PADRAO,
  type StatusPersonalizado,
} from './gestaoStatusCatalogo'

const CORES_STATUS_PADRAO: Record<Situacao, string> = {
  nao_iniciado: '#6b7280',
  em_andamento: '#236da8',
  em_analise: '#5b6ee1',
  em_correcao: '#c43d4b',
  aguardando_terceiros: '#b45309',
  paralisado: '#78716c',
  aprovado_concessionaria: '#1f8f5f',
  concluido: '#15803d',
}

export type GestaoDashboardConfig = {
  statusVisiveis?: string[]
  rotulosStatus?: Record<string, string>
  rotulosEtapa?: Record<string, string>
  rotulosMapa?: Record<string, string>
  previstoStatus?: string[]
  realizadoStatus?: string[]
  previstoRealizadoBase?: 'ponto' | 'protocolo'
}

export const ROTULO_ETAPA_PADRAO = (etapa: string) => nomeGestao(etapa)

export const TODAS_SITUACOES_PROTOCOLO = SITUACOES_PADRAO

export const dashboardConfigPadrao = (personalizados?: StatusPersonalizado[]): GestaoDashboardConfig => {
  const todos = listarStatusContrato(personalizados)
  return {
    statusVisiveis: [...todos],
    rotulosStatus: {},
    rotulosEtapa: {},
    rotulosMapa: {},
    previstoStatus: [...todos],
    realizadoStatus: [...todos],
    previstoRealizadoBase: 'ponto',
  }
}

export const mesclarDashboardConfig = (
  parcial?: GestaoDashboardConfig | null,
  personalizados?: StatusPersonalizado[],
): GestaoDashboardConfig => {
  const padrao = dashboardConfigPadrao(personalizados)
  if (!parcial) return padrao
  return {
    statusVisiveis: parcial.statusVisiveis?.length ? [...parcial.statusVisiveis] : padrao.statusVisiveis,
    rotulosStatus: { ...padrao.rotulosStatus, ...parcial.rotulosStatus },
    rotulosEtapa: { ...padrao.rotulosEtapa, ...parcial.rotulosEtapa },
    rotulosMapa: { ...padrao.rotulosMapa, ...parcial.rotulosMapa },
    previstoStatus: parcial.previstoStatus?.length ? [...parcial.previstoStatus] : padrao.previstoStatus,
    realizadoStatus: parcial.realizadoStatus?.length ? [...parcial.realizadoStatus] : padrao.realizadoStatus,
    previstoRealizadoBase: parcial.previstoRealizadoBase ?? padrao.previstoRealizadoBase,
  }
}

export const statusPermitido = (status: string, lista?: string[]) =>
  !lista?.length || lista.includes(status)

export const rotuloStatusDashboard = (
  status: string,
  config: GestaoDashboardConfig,
  personalizados?: StatusPersonalizado[],
) => {
  const custom = config.rotulosStatus?.[status]?.trim()
  if (custom) return custom
  return rotuloStatusProtocolo(status, personalizados)
}

export const rotuloEtapaDashboard = (etapa: string, config?: GestaoDashboardConfig | null) => {
  const custom = config?.rotulosEtapa?.[etapa]?.trim()
  if (custom) return custom
  return ROTULO_ETAPA_PADRAO(etapa)
}

export const rotuloLegendaMapaDashboard = (
  id: string,
  config?: GestaoDashboardConfig | null,
  fallback?: string,
) => {
  const custom = config?.rotulosMapa?.[id]?.trim()
  if (custom) return custom
  const padrao = LEGENDA_MAPA_GESTAO.find((item) => item.id === id)?.label
  return padrao ?? fallback ?? id
}

export const corStatusDashboard = (status: string, personalizados?: StatusPersonalizado[]) => {
  if (isStatusPadrao(status)) return CORES_STATUS_PADRAO[status]
  return corStatusProtocolo(status, personalizados)
}

export const calcularPrevistoRealizado = (
  protocolos: Protocolo[],
  pontos: Ponto[],
  config: GestaoDashboardConfig,
) => {
  const statusByProtocolo = new Map(protocolos.map((item) => [item.id, item.status]))
  const base = config.previstoRealizadoBase ?? 'ponto'

  if (base === 'protocolo') {
    return {
      previsto: protocolos.filter((item) => !!item.previsao && statusPermitido(item.status, config.previstoStatus)).length,
      realizado: protocolos.filter((item) => !!item.realizadoEm && statusPermitido(item.status, config.realizadoStatus)).length,
    }
  }

  const previsto = pontos.filter((ponto) => {
    if (!ponto.previsao) return false
    if (!ponto.protocoloId) return statusPermitido('nao_iniciado', config.previstoStatus)
    const status = statusByProtocolo.get(ponto.protocoloId)
    return status ? statusPermitido(status, config.previstoStatus) : false
  }).length

  const realizado = pontos.filter((ponto) => {
    if (!ponto.realizadoEm) return false
    if (!ponto.protocoloId) return false
    const status = statusByProtocolo.get(ponto.protocoloId)
    return status ? statusPermitido(status, config.realizadoStatus) : false
  }).length

  return { previsto, realizado }
}

export const sanitizarDashboardConfig = (
  input: GestaoDashboardConfig,
  personalizados?: StatusPersonalizado[],
): GestaoDashboardConfig => {
  const permitidos = new Set(listarStatusContrato(personalizados))
  const filtra = (lista?: string[]) => (lista ?? []).filter((item) => permitidos.has(item))
  const rotulos: Record<string, string> = {}
  Object.entries(input.rotulosStatus ?? {}).forEach(([status, label]) => {
    const texto = label.trim()
    if (texto && permitidos.has(status)) rotulos[status] = texto.slice(0, 80)
  })
  const rotulosEtapa: Record<string, string> = {}
  const etapasPermitidas = new Set<string>(ETAPAS_ORDEM)
  Object.entries(input.rotulosEtapa ?? {}).forEach(([etapa, label]) => {
    const texto = label.trim()
    if (texto && etapasPermitidas.has(etapa)) rotulosEtapa[etapa] = texto.slice(0, 80)
  })
  const rotulosMapa: Record<string, string> = {}
  const mapaIds = new Set<string>(LEGENDA_MAPA_GESTAO.map((item) => item.id))
  Object.entries(input.rotulosMapa ?? {}).forEach(([id, label]) => {
    const texto = label.trim()
    if (texto && mapaIds.has(id)) rotulosMapa[id] = texto.slice(0, 80)
  })
  return {
    statusVisiveis: filtra(input.statusVisiveis),
    rotulosStatus: rotulos,
    rotulosEtapa,
    rotulosMapa,
    previstoStatus: filtra(input.previstoStatus),
    realizadoStatus: filtra(input.realizadoStatus),
    previstoRealizadoBase: input.previstoRealizadoBase === 'protocolo' ? 'protocolo' : 'ponto',
  }
}