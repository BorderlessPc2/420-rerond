const ROTULOS_GESTAO: Record<string, string> = {
  planejamento: 'Planejamento',
  elaboracao: 'Elaboração',
  fase_1: 'Fase 1',
  fase_2: 'Fase 2',
  homologacao: 'Homologação',
  concluido: 'Concluído',
  nao_iniciado: 'Não iniciado',
  em_andamento: 'Em andamento',
  em_analise: 'Em análise',
  em_correcao: 'Em correção',
  aguardando_terceiros: 'Aguardando terceiros',
  paralisado: 'Paralisado',
  aprovado_concessionaria: 'Aprovado concessionária',
  regularizado: 'Regularizado',
  aprovado_implantacao: 'Aprovado para implantação',
  ativo: 'Ativo',
  suspenso: 'Suspenso',
  encerrado: 'Encerrado',
}

export const nomeGestao = (valor: string) => {
  const chave = valor.trim()
  if (!chave) return '—'
  if (ROTULOS_GESTAO[chave]) return ROTULOS_GESTAO[chave]
  const texto = chave.replaceAll('_', ' ')
  return texto[0].toUpperCase() + texto.slice(1)
}

export const formatarDataGestao = (valor?: string) => {
  if (!valor) return '—'
  const data = new Date(`${valor}T00:00:00`)
  return Number.isNaN(data.getTime()) ? valor : new Intl.DateTimeFormat('pt-BR').format(data)
}

const ETAPAS_PLANEJAMENTO = ['planejamento', 'elaboracao', 'fase_1', 'fase_2', 'homologacao', 'concluido'] as const

export const resumoEtapaPlanejamento = (etapa: string) => ({
  etapas: ETAPAS_PLANEJAMENTO.map(nomeGestao),
  indiceAtual: Math.max(0, ETAPAS_PLANEJAMENTO.indexOf(etapa as (typeof ETAPAS_PLANEJAMENTO)[number])),
})
