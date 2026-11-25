import type { Ponto, Protocolo } from './gestaoContratos'
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
  previstoStatus?: string[]
  realizadoStatus?: string[]
  previstoRealizadoBase?: 'ponto' | 'protocolo'
}

export const TODAS_SITUACOES_PROTOCOLO = SITUACOES_PADRAO

export const dashboardConfigPadrao = (personalizados?: StatusPersonalizado[]): GestaoDashboardConfig => {
  const todos = listarStatusContrato(personalizados)
  return {
    statusVisiveis: [...todos],
    rotulosStatus: {},
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
  return {
    statusVisiveis: filtra(input.statusVisiveis),
    rotulosStatus: rotulos,
    previstoStatus: filtra(input.previstoStatus),
    realizadoStatus: filtra(input.realizadoStatus),
    previstoRealizadoBase: input.previstoRealizadoBase === 'protocolo' ? 'protocolo' : 'ponto',
  }
}