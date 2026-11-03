import type { Etapa, Ponto, Situacao } from './gestaoContratos'

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
  de: { etapa: Etapa; status: Situacao }
  para: { etapa: Etapa; status: Situacao }
  requerObservacao: boolean
  pontosSemResultado: number
}

export type SituacaoAlcancavel = {
  situacao: Situacao
  disponivel: boolean
  motivo: string | null
}

export function validarCombinacaoEtapaStatus(etapa: Etapa, status: Situacao): string | null {
  if (etapa === 'concluido' && status !== 'concluido') return 'Etapa concluída exige situação concluída.'
  if (status === 'concluido' && etapa !== 'concluido') return 'Situação concluída exige etapa concluída.'
  if (status === 'nao_iniciado' && etapa !== 'planejamento') return 'Situação não iniciada só combina com etapa planejamento.'
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
  statusAtual: Situacao,
  etapaNova: Etapa,
  statusNovo: Situacao,
  observacao: string,
  pontosVinculados: Pick<Ponto, 'resultado'>[] = [],
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
  const combinacao = validarCombinacaoEtapaStatus(etapaNova, statusNovo)
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
  statusAtual: Situacao,
  etapaAlvo: Etapa,
  observacao: string,
  pontosVinculados: Pick<Ponto, 'resultado'>[] = [],
): SituacaoAlcancavel[] {
  return COMBINACOES_ETAPA_STATUS[etapaAlvo].map((situacao) => ({
    situacao,
    disponivel: !validarTransicao(etapaAtual, statusAtual, etapaAlvo, situacao, observacao, pontosVinculados),
    motivo: validarTransicao(etapaAtual, statusAtual, etapaAlvo, situacao, observacao, pontosVinculados),
  }))
}

export function motivoTransicaoIndisponivel(
  etapaAtual: Etapa,
  statusAtual: Situacao,
  etapaNova: Etapa,
  statusNovo: Situacao,
  observacao: string,
  pontosVinculados: Pick<Ponto, 'resultado'>[] = [],
): string | null {
  return validarTransicao(etapaAtual, statusAtual, etapaNova, statusNovo, observacao, pontosVinculados)
}

export function descreverTransicao(
  etapaAtual: Etapa,
  statusAtual: Situacao,
  etapaNova: Etapa,
  statusNovo: Situacao,
  observacao: string,
  pontosVinculados: Pick<Ponto, 'resultado'>[] = [],
): DescricaoTransicao {
  const erro = validarTransicao(etapaAtual, statusAtual, etapaNova, statusNovo, observacao, pontosVinculados)
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
  statusAtual: Situacao,
): { etapa: Etapa; status: Situacao } {
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
