/**
 * Suite de assertividade — esperado a partir do material `.pdf/testes/`.
 * Uso: conferência manual / futura pontuação automática vs relatório da IA.
 * Não chama OpenAI; só define o gabarito estruturado.
 */

export type EvalSeveridade = 'critico' | 'alto' | 'medio' | 'acerto'

export type EvalFindingEsperado = {
  id: string
  item: string
  /** O que a análise correta deve afirmar (resumo). */
  esperado: string
  /** Comportamento típico errado do programa (comparativo). */
  antiPadrao?: string
  severidade: EvalSeveridade
  /** Se true, o programa já acertou neste ponto no comparativo histórico. */
  programaHistoricoAcertou?: boolean
}

export type EvalCaso = {
  id: string
  titulo: string
  tipoAnaliseId: string
  fonteGabarito: string
  fonteComparativo?: string
  projeto?: string
  findings: EvalFindingEsperado[]
  /** Critérios de aceite qualitativos (avaliação Baseinfra). */
  criteriosAceite: string[]
}

export const EVAL_ASSERTIVIDADE_CASOS: EvalCaso[] = [
  {
    id: 'eval-poc-edp-viana',
    titulo: 'POC EDP Viana — km 300+746 a 300+876',
    tipoAnaliseId: 'poc',
    fonteGabarito: 'ANÁLISE GABARITO.pdf',
    fonteComparativo: 'teste de analise - COMPARATIVO.pdf',
    projeto: 'EDP Viana / ID 26080071',
    findings: [
      {
        id: 'f-volumes',
        item: 'Organização dos volumes',
        esperado: 'Sinalizar docs a individualizar/mover para Volume III',
        antiPadrao: 'Considerar organização correta',
        severidade: 'alto',
      },
      {
        id: 'f-codificacao',
        item: 'Codificação SUROD 12/2025',
        esperado: 'Exigir adequação de planta, perfil, sinalização, requerimento, declaração, cronograma',
        antiPadrao: 'Considerar todos codificados',
        severidade: 'alto',
      },
      {
        id: 'f-memorial',
        item: 'Memorial',
        esperado: 'Cariacica→Viana; excluir travessia; sinalização provisória EcoRodovias',
        antiPadrao: 'Inventar afastamentos/altura livre/postes sem lastro',
        severidade: 'critico',
      },
      {
        id: 'f-plano-trabalho',
        item: 'Plano de Trabalho',
        esperado: 'Sem inconsistências (não objetar)',
        antiPadrao: 'Inventar falta de recomposição / tráfego',
        severidade: 'critico',
      },
      {
        id: 'f-pba',
        item: 'PBA',
        esperado: 'Remeter à Sustentabilidade / não “não localizado” seco',
        antiPadrao: 'Documento não localizado',
        severidade: 'medio',
      },
      {
        id: 'f-planta',
        item: 'Planta baixa',
        esperado: 'km 300+140 errado; poste–bordo; assinatura; codificação',
        antiPadrao: 'Completa sem pendências',
        severidade: 'critico',
      },
      {
        id: 'f-perfil',
        item: 'Perfil',
        esperado: 'Apresentado; falta assinatura e codificação',
        antiPadrao: 'Não localizado',
        severidade: 'critico',
      },
      {
        id: 'f-sinalizacao',
        item: 'Sinalização',
        esperado: 'Manual EcoRodovias; carimbo; assinatura; codificação',
        antiPadrao: 'Compatível e atendido',
        severidade: 'critico',
      },
      {
        id: 'f-especificacoes',
        item: 'Especificações',
        esperado: 'Revisar refs de sinalização provisória',
        antiPadrao: 'Completas sem pendências',
        severidade: 'alto',
      },
      {
        id: 'f-requerimento',
        item: 'Requerimento',
        esperado: 'Excluir travessia; Volume III; codificação',
        antiPadrao: 'Completo e atendido',
        severidade: 'alto',
      },
      {
        id: 'f-declaracao',
        item: 'Declaração de veracidade',
        esperado: 'ID + assinatura representante legal; codificação',
        antiPadrao: 'Completa e atendida',
        severidade: 'alto',
      },
      {
        id: 'f-art',
        item: 'ART',
        esperado: 'Localizada; mover Volume I → III',
        antiPadrao: 'Não localizada / contraditório entre lotes',
        severidade: 'critico',
      },
      {
        id: 'f-cronograma',
        item: 'Cronograma',
        esperado: 'Individualizar Volume III + codificação',
        antiPadrao: 'Completo e atendido',
        severidade: 'alto',
      },
      {
        id: 'f-licenca',
        item: 'Licença ambiental',
        esperado: 'Falta comprovação formal de dispensa/inexigibilidade',
        antiPadrao: undefined,
        severidade: 'acerto',
        programaHistoricoAcertou: true,
      },
      {
        id: 'f-conclusao',
        item: 'Conclusão',
        esperado: 'Objeções pelas pendências reais acima',
        antiPadrao: 'Objeção por fundamentos errados',
        severidade: 'critico',
      },
    ],
    criteriosAceite: [
      'Não marcar como ausente documento/informação presente no PDF',
      'Não inventar pendências no Plano de Trabalho',
      'Não aprovar Planta/Sinalização com pendências do gabarito',
      'Manter acerto da licença ambiental',
      'Conclusão alinhada aos findings críticos/altos',
      'Evitar múltiplos lotes contraditórios sobre o mesmo item (ex.: ART)',
    ],
  },
  {
    id: 'eval-meta-tipologia',
    titulo: 'Meta — tipagem e checklist por tipo/fase',
    tipoAnaliseId: 'pac',
    fonteGabarito: 'AVALIAÇÃO DA FERRAMENTA DE ANÁLISE POR IA.pdf',
    findings: [
      {
        id: 'f-meta-pac',
        item: 'PAC / GranCafé / Sampaio',
        esperado: 'Checklist PAC (fase correta), não só rótulo',
        antiPadrao: 'Nome PAC + checklist ocupação',
        severidade: 'critico',
      },
      {
        id: 'f-meta-ppu',
        item: 'PPU / Comunyca',
        esperado: 'Checklist PPU + estrutura de sustentação',
        antiPadrao: 'Estrutura genérica de ocupação',
        severidade: 'critico',
      },
      {
        id: 'f-meta-repetibilidade',
        item: 'Mesmos docs → resultado estável',
        esperado: 'Variação controlada; não perder itens na reanálise',
        antiPadrao: 'Índices 30,8% → 23,1% → 15,4% no mesmo pacote',
        severidade: 'alto',
      },
    ],
    criteriosAceite: [
      'tipoAnaliseId correto implica requisitos do seed daquele tipo',
      'Reanálise preserva itens não contestados',
      'Apontamentos com arquivo/página quando possível',
    ],
  },
]

export type EvalScoreInput = {
  casoId: string
  /** IDs de findings que a análise atual acertou (julgamento humano ou futuro scorer). */
  findingsOk: string[]
}

export type EvalScoreResult = {
  casoId: string
  total: number
  ok: number
  criticosFalhos: string[]
  percentual: number
  passouCriticos: boolean
  /** Detalhe opcional do matching lexical. */
  findingsOk?: string[]
  findingsFalhos?: string[]
}

/** Needles por finding — relatório “bom” deve mencionar ao menos um. */
export const EVAL_FINDING_NEEDLES: Record<string, string[]> = {
  'f-volumes': ['volume iii', 'volumes', 'individualiz'],
  'f-codificacao': ['surod', 'codifica', 'nomenclatura'],
  'f-memorial': ['cariacica', 'travessia', 'viana'],
  'f-plano-trabalho': ['plano de trabalho', 'sem inconsist'],
  'f-pba': ['pba', 'sustentabilidade', 'plano básico ambiental', 'plano basico ambiental'],
  'f-planta': ['300+140', 'poste', 'planta baixa'],
  'f-perfil': ['perfil', 'assinatura'],
  'f-sinalizacao': ['sinaliza', 'carimbo', 'ecorodovias', 'eco rodovias'],
  'f-especificacoes': ['especifica', 'sinalização provisória', 'sinalizacao provisoria'],
  'f-requerimento': ['requerimento', 'travessia'],
  'f-declaracao': ['declaração', 'declaracao', 'representante legal'],
  'f-art': ['art', 'volume iii', 'volume i'],
  'f-cronograma': ['cronograma', 'volume iii'],
  'f-licenca': ['licença', 'licenca', 'inexigibilidade', 'dispensa'],
  'f-conclusao': ['obje', 'pendên', 'pendenc', 'não conforme', 'nao conforme'],
  'f-meta-pac': ['pac', 'checklist'],
  'f-meta-ppu': ['ppu', 'publicidade', 'sustentação', 'sustentacao'],
  'f-meta-repetibilidade': ['reanálise', 'reanalise', 'consistência', 'consistencia'],
}

/** Anti-padrões: se o relatório ainda comete o erro clássico, o finding NÃO marca OK. */
export const EVAL_FINDING_ANTI_NEEDLES: Record<string, string[]> = {
  'f-perfil': ['perfil não localizado', 'perfil nao localizado', 'perfil ausente'],
  'f-plano-trabalho': ['falta de recomposição', 'falta de recomposicao', 'interferência no tráfego'],
  'f-planta': ['planta completa e sem pendências', 'planta completa e sem pendencias'],
  'f-sinalizacao': ['sinalização compatível e atendida', 'sinalizacao compativel e atendida'],
}

/** Pontuação simples: % de findings marcados OK; falha se algum crítico não ok. */
export function scoreEvalCaso(input: EvalScoreInput): EvalScoreResult | null {
  const caso = EVAL_ASSERTIVIDADE_CASOS.find((c) => c.id === input.casoId)
  if (!caso) return null
  const okSet = new Set(input.findingsOk)
  const total = caso.findings.length
  const ok = caso.findings.filter((f) => okSet.has(f.id)).length
  const criticosFalhos = caso.findings
    .filter((f) => f.severidade === 'critico' && !okSet.has(f.id))
    .map((f) => f.id)
  const findingsFalhos = caso.findings.filter((f) => !okSet.has(f.id)).map((f) => f.id)
  return {
    casoId: input.casoId,
    total,
    ok,
    criticosFalhos,
    percentual: total === 0 ? 0 : Math.round((ok / total) * 1000) / 10,
    passouCriticos: criticosFalhos.length === 0,
    findingsOk: [...okSet],
    findingsFalhos,
  }
}

function normalizeText(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

/**
 * Pontua um relatório/parecer textual contra o eval (matching lexical).
 * Finding OK se: (1) algum needle positivo aparece e (2) nenhum anti-needle do erro clássico.
 */
export function scoreRelatorioContraEval(
  casoId: string,
  textoRelatorio: string,
): EvalScoreResult | null {
  const caso = EVAL_ASSERTIVIDADE_CASOS.find((c) => c.id === casoId)
  if (!caso) return null
  const blob = normalizeText(textoRelatorio)
  const findingsOk: string[] = []

  for (const finding of caso.findings) {
    const needles = (EVAL_FINDING_NEEDLES[finding.id] ?? [finding.item]).map((n) =>
      normalizeText(n),
    )
    const antis = (EVAL_FINDING_ANTI_NEEDLES[finding.id] ?? []).map((n) => normalizeText(n))
    const hitPositive = needles.some((n) => n && blob.includes(n))
    const hitAnti = antis.some((n) => n && blob.includes(n))
    if (finding.programaHistoricoAcertou && hitPositive) {
      findingsOk.push(finding.id)
      continue
    }
    if (hitPositive && !hitAnti) findingsOk.push(finding.id)
  }

  return scoreEvalCaso({ casoId, findingsOk })
}

