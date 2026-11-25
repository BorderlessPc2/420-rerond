import type { Etapa, Ponto, Situacao } from './gestaoContratos'
import { isFormatoStatusCustom, isStatusPadrao } from './gestaoStatusCatalogo'
import type { StatusPersonalizado } from './gestaoStatusCatalogo'

/** Ordem operacional das etapas — avanço permitido; retrocesso bloqueado em `validarTransicao`. */
export const ETAPAS_ORDEM: Etapa[] = ['planejamento', 'elaboracao', 'fase_1', 'fase_2', 'homologacao', 'concluido']

/** Combinações etapa × situação permitidas ao registrar movimentação. */
export const COMBINACOES_ETAPA_STATUS: Readonly<Record<Etapa, readonly Situacao[]>> = {
  planejamento: ['nao_iniciado', 'em_andamento', 'paralisado'],
  elaboracao: ['em_andamento', 'em_analise', 'em_correcao', 'aguardando_terceiros', 'paralisado'],
  fase_1: ['em_andamento', 'em_analise', 'em_correcao', 'aguardando_terceiros', 'paralisado', 'aprovado_concessionaria'],
  fase_2: ['em_andamento', 'em_analise', 'em_correcao', 'aguardando_terceiros', 'paralisado', 'aprovado_concessionaria'],
  homologacao: ['em_andamento', 'em_analise', 'em_correcao', 'aguardando_terceiros', 'paralisado', 'aprovado_concessionaria'],
  concluido: ['concluido'],
}

export type IntencaoTransicao = 'correcao' | 'paralisacao' | 'avancar_etapa' | 'concluir' | 'retomar_andamento'

export type DescricaoTransicao = {
  valido: boolean
  erro: string | null
  de: { etapa: Etapa; status: Situacao | string }
  para: { etapa: Etapa; status: Situacao | string }
  requerObservacao: boolean
  pontosSemResultado: number
}

export type SituacaoAlcancavel = {
  situacao: Situacao | string
  disponivel: boolean
  motivo: string | null
}

export function validarCombinacaoEtapaStatus(
  etapa: Etapa,
  status: Situacao | string,
  _personalizados: StatusPersonalizado[] = [],
): string | null {
  if (isFormatoStatusCustom(status)) {
    if (etapa === 'concluido') return 'Status personalizado não é permitido na etapa concluída.'
    return null
  }
  if (etapa === 'concluido' && status !== 'concluido') return 'Etapa concluída exige situação concluída.'
  if (status === 'concluido' && etapa !== 'concluido') return 'Situação concluída exige etapa concluída.'
  if (status === 'nao_iniciado' && etapa !== 'planejamento') return 'Situação não iniciada só combina com etapa planejamento.'
  if (!isStatusPadrao(status)) return 'Situação inválida.'
  const permitidos = COMBINACOES_ETAPA_STATUS[etapa]
  if (!permitidos.includes(status)) return `Situação "${status}" não é permitida na etapa "${etapa}".`
  return null
}

/** Regra mínima de conclusão: protocolo com pontos só conclui quando todos têm resultado operacional. */
export function validarConclusaoProtocolo(pontosVinculados: Pick<Ponto, 'resultado'>[]): string | null {
  if (!pontosVinculados.length) return null
  const pendentes = pontosVinculados.filter((item) => !item.resultado).length
  if (pendentes) return `Conclusão bloqueada: ${pendentes} ponto(s) sem resultado operacional.`
  return null
}

export function validarTransicao(
  etapaAtual: Etapa,
  statusAtual: Situacao | string,
  etapaNova: Etapa,
  statusNovo: Situacao | string,
  observacao: string,
  pontosVinculados: Pick<Ponto, 'resultado'>[] = [],
  personalizados: StatusPersonalizado[] = [],
): string | null {
  if (['em_correcao', 'paralisado'].includes(statusNovo) && !observacao.trim()) {
    return 'Informe observação para correção ou paralisação.'
  }
  if (etapaAtual === 'concluido' && (etapaNova !== etapaAtual || statusNovo !== 'concluido')) {
    return 'Protocolo concluído não pode retroceder.'
  }
  if (statusAtual === 'concluido' && statusNovo !== 'concluido') {
    return 'Protocolo concluído não pode retroceder.'
  }
  if (etapaNova !== etapaAtual && ETAPAS_ORDEM.indexOf(etapaNova) < ETAPAS_ORDEM.indexOf(etapaAtual)) {
    return 'Não é possível retornar para uma etapa anterior.'
  }
  const combinacao = validarCombinacaoEtapaStatus(etapaNova, statusNovo, personalizados)
  if (combinacao) return combinacao
  if (etapaNova === 'concluido' && statusNovo === 'concluido') {
    return validarConclusaoProtocolo(pontosVinculados)
  }
  return null
}

export function listarEtapasPermitidas(etapaAtual: Etapa): Etapa[] {
  if (etapaAtual === 'concluido') return ['concluido']
  const indice = ETAPAS_ORDEM.indexOf(etapaAtual)
  return ETAPAS_ORDEM.slice(indice)
}

export function listarSituacoesAlcancaveis(
  etapaAtual: Etapa,
  statusAtual: Situacao | string,
  etapaAlvo: Etapa,
  observacao: string,
  pontosVinculados: Pick<Ponto, 'resultado'>[] = [],
  personalizados: StatusPersonalizado[] = [],
): SituacaoAlcancavel[] {
  const padrao = COMBINACOES_ETAPA_STATUS[etapaAlvo].map((situacao) => ({
    situacao,
    disponivel: !validarTransicao(etapaAtual, statusAtual, etapaAlvo, situacao, observacao, pontosVinculados, personalizados),
    motivo: validarTransicao(etapaAtual, statusAtual, etapaAlvo, situacao, observacao, pontosVinculados, personalizados),
  }))
  if (etapaAlvo === 'concluido') return padrao
  const customs = personalizados.map((item) => ({
    situacao: item.id,
    disponivel: !validarTransicao(etapaAtual, statusAtual, etapaAlvo, item.id, observacao, pontosVinculados, personalizados),
    motivo: validarTransicao(etapaAtual, statusAtual, etapaAlvo, item.id, observacao, pontosVinculados, personalizados),
  }))
  const merged = [...padrao, ...customs]
  if (
    isFormatoStatusCustom(statusAtual) &&
    !merged.some((item) => item.situacao === statusAtual)
  ) {
    const motivo = validarTransicao(etapaAtual, statusAtual, etapaAlvo, statusAtual, observacao, pontosVinculados, personalizados)
    merged.push({
      situacao: statusAtual,
      disponivel: !motivo,
      motivo,
    })
  }
  return merged
}

export function motivoTransicaoIndisponivel(
  etapaAtual: Etapa,
  statusAtual: Situacao | string,
  etapaNova: Etapa,
  statusNovo: Situacao | string,
  observacao: string,
  pontosVinculados: Pick<Ponto, 'resultado'>[] = [],
  personalizados: StatusPersonalizado[] = [],
): string | null {
  return validarTransicao(etapaAtual, statusAtual, etapaNova, statusNovo, observacao, pontosVinculados, personalizados)
}

export function descreverTransicao(
  etapaAtual: Etapa,
  statusAtual: Situacao | string,
  etapaNova: Etapa,
  statusNovo: Situacao | string,
  observacao: string,
  pontosVinculados: Pick<Ponto, 'resultado'>[] = [],
  personalizados: StatusPersonalizado[] = [],
): DescricaoTransicao {
  const erro = validarTransicao(etapaAtual, statusAtual, etapaNova, statusNovo, observacao, pontosVinculados, personalizados)
  return {
    valido: !erro,
    erro,
    de: { etapa: etapaAtual, status: statusAtual },
    para: { etapa: etapaNova, status: statusNovo },
    requerObservacao: ['em_correcao', 'paralisado'].includes(statusNovo),
    pontosSemResultado: pontosVinculados.filter((item) => !item.resultado).length,
  }
}

export function aplicarIntencaoTransicao(
  intencao: IntencaoTransicao,
  etapaAtual: Etapa,
  statusAtual: Situacao | string,
): { etapa: Etapa; status: Situacao | string } {
  switch (intencao) {
    case 'correcao':
      return { etapa: etapaAtual, status: 'em_correcao' }
    case 'paralisacao':
      return { etapa: etapaAtual, status: 'paralisado' }
    case 'concluir':
      return { etapa: 'concluido', status: 'concluido' }
    case 'retomar_andamento':
      return { etapa: etapaAtual, status: 'em_andamento' }
    case 'avancar_etapa': {
      const indice = ETAPAS_ORDEM.indexOf(etapaAtual)
      const proxima = ETAPAS_ORDEM[Math.min(indice + 1, ETAPAS_ORDEM.length - 1)]
      const opcoes = COMBINACOES_ETAPA_STATUS[proxima]
      const preferida = opcoes.find((item) => item === 'em_andamento') ?? opcoes.find((item) => item !== 'concluido') ?? opcoes[0]
      return { etapa: proxima, status: preferida }
    }
    default:
      return { etapa: etapaAtual, status: statusAtual }
  }
}
