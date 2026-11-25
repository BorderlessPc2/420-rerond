import type { Situacao } from './gestaoContratos'
import { nomeGestao } from '../views/gestaoUi'

export type StatusPersonalizado = {
  id: string
  label: string
  color?: string
}

export const SITUACOES_PADRAO: Situacao[] = [
  'nao_iniciado',
  'em_andamento',
  'em_analise',
  'em_correcao',
  'aguardando_terceiros',
  'paralisado',
  'aprovado_concessionaria',
  'concluido',
]

const PREFIXO_CUSTOM = 'custom_'
const ID_STATUS_CUSTOM = /^custom_[a-z0-9_]+$/

/** Compatível com `validStatus` do Firestore — inclui status ainda gravados após remoção do catálogo. */
export const isFormatoStatusCustom = (id: string) => id.length <= 64 && ID_STATUS_CUSTOM.test(id)

export const isStatusPadrao = (id: string): id is Situacao =>
  (SITUACOES_PADRAO as readonly string[]).includes(id)

export const isStatusPersonalizado = (id: string, lista?: StatusPersonalizado[]) =>
  isFormatoStatusCustom(id) && Boolean(lista?.some((item) => item.id === id))

export const listarStatusContrato = (personalizados?: StatusPersonalizado[]) => [
  ...SITUACOES_PADRAO,
  ...(personalizados?.map((item) => item.id) ?? []),
]

const normalizarSlug = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)

export const gerarIdStatusPersonalizado = (label: string, existentes: string[]) => {
  const base = normalizarSlug(label)
  const nucleo = base || 'status'
  let candidato = `${PREFIXO_CUSTOM}${nucleo}`
  let sufixo = 2
  while (existentes.includes(candidato) || isStatusPadrao(candidato)) {
    candidato = `${PREFIXO_CUSTOM}${nucleo}_${sufixo}`
    sufixo += 1
  }
  return candidato
}

export const rotuloStatusProtocolo = (id: string, personalizados?: StatusPersonalizado[]) => {
  const custom = personalizados?.find((item) => item.id === id)
  if (custom?.label.trim()) return custom.label.trim()
  return nomeGestao(id)
}

export const corStatusProtocolo = (
  id: string,
  personalizados?: StatusPersonalizado[],
  fallback = '#5b6ee1',
) => {
  const custom = personalizados?.find((item) => item.id === id)
  if (custom?.color?.trim()) return custom.color.trim()
  return fallback
}

export const classeBadgeStatus = (id: string, _personalizados?: StatusPersonalizado[]) =>
  isFormatoStatusCustom(id) ? 'gestao-status gestao-status-custom' : `gestao-status gestao-status-${id}`

export const sanitizarStatusPersonalizados = (lista: StatusPersonalizado[]): StatusPersonalizado[] =>
  lista
    .map((item) => ({
      id: item.id.startsWith(PREFIXO_CUSTOM) ? item.id.slice(0, 64) : gerarIdStatusPersonalizado(item.label, []),
      label: item.label.trim().slice(0, 80),
      color: item.color?.trim().slice(0, 32) || undefined,
    }))
    .filter((item) => item.label.length > 0)
    .filter((item, index, array) => array.findIndex((outro) => outro.id === item.id) === index)