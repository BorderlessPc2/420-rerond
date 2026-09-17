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
  {
    id: 'eval-ppu-checklist',
    titulo: 'PPU — checklist Capixaba (publicidade)',
    tipoAnaliseId: 'ppu',
    fonteGabarito: 'PPU - CHECKLIST.pdf',
    findings: [
      {
        id: 'PPU_NATUREZA_INTERVENCAO',
        item: 'Natureza da intervenção (publicidade)',
        esperado: 'Enquadrar como PPU; não usar POC/OCUP',
        antiPadrao: 'Checklist genérico de ocupação',
        severidade: 'critico',
      },
      {
        id: 'PPU_SEGURANCA_INTERFERENCIAS',
        item: 'Estrutura de sustentação / segurança',
        esperado: 'Avaliar sustentação e interferências viárias',
        antiPadrao: 'Omitir sustentação',
        severidade: 'critico',
      },
      {
        id: 'PPU_ADMINISTRATIVO',
        item: 'Documentação administrativa',
        esperado: 'Requerimento, ART, declaração',
        severidade: 'alto',
      },
      {
        id: 'PPU_PLANTAS',
        item: 'Plantas PPU',
        esperado: 'Plantas com área, FD/FNE e situação',
        severidade: 'alto',
      },
    ],
    criteriosAceite: [
      'Isolamento PPU_*',
      'Estrutura de sustentação explícita',
      'Não avaliar conteúdo de documento não enviado',
    ],
  },
  {
    id: 'eval-pacv-capixaba',
    titulo: 'PAC Viabilidade — Capixaba',
    tipoAnaliseId: 'pac-viabilidade',
    fonteGabarito: 'PAC - VIABILIDADE - CAPIXABA.pdf',
    findings: [
      {
        id: 'PACV_ESCOPO_VIABILIDADE',
        item: 'Escopo da fase viabilidade',
        esperado: 'Não exigir disciplinas de executivo',
        antiPadrao: 'Cobrar PACE_* na viabilidade',
        severidade: 'critico',
      },
      {
        id: 'PACV_DOCS_MINIMOS',
        item: 'Documentação mínima',
        esperado: 'Listar docs mínimos presentes/faltantes',
        severidade: 'critico',
      },
      {
        id: 'PACV_FD_NON_AED',
        item: 'FD / non aedificandi',
        esperado: 'Delimitação na planta de viabilidade',
        severidade: 'alto',
      },
      {
        id: 'PACV_VISIBILIDADE_IPR728',
        item: 'Visibilidade IPR-728',
        esperado: 'Distâncias de visibilidade compatíveis',
        severidade: 'critico',
      },
    ],
    criteriosAceite: [
      'Fase viabilidade isolada de PACE_*',
      'Visibilidade e FD conferidos',
    ],
  },
  {
    id: 'eval-pace-capixaba',
    titulo: 'PAC Executivo — Capixaba/Araguaia',
    tipoAnaliseId: 'pac-executivo',
    fonteGabarito: 'PAC - EXECUTIVO - CAPIXABA.pdf',
    fonteComparativo: 'PAC - EXECUTIVO - ARAGUAIA.pdf',
    findings: [
      {
        id: 'PACE_VOLUMES_SUROD',
        item: 'Volumes e codificação SUROD',
        esperado: 'Volumes I–III e nomenclatura',
        severidade: 'alto',
      },
      {
        id: 'PACE_TERRAP_GEO_PAV',
        item: 'Terraplenagem / geo / pavimento',
        esperado: 'Disciplinas do executivo avaliadas',
        antiPadrao: 'Omitir disciplinas por usar checklist de viabilidade',
        severidade: 'critico',
      },
      {
        id: 'PACE_HIDRO_DRENAGEM',
        item: 'Hidrologia / drenagem',
        esperado: 'Peças de drenagem no executivo',
        severidade: 'critico',
      },
      {
        id: 'PACE_SINALIZACAO_DEF_TEMP',
        item: 'Sinalização definitiva/temporária',
        esperado: 'Carimbo/disciplina/assinatura; presente ≠ conforme',
        severidade: 'critico',
      },
    ],
    criteriosAceite: [
      'tipo pac-executivo + PACE_*',
      'Disciplinas não omitidas',
    ],
  },
  {
    id: 'eval-pan-checklist',
    titulo: 'PAN — anuência (checklist)',
    tipoAnaliseId: 'pan',
    fonteGabarito: 'PAN - CHECKLIST.pdf',
    findings: [
      {
        id: 'PAN_FINALIDADE_ANUENCIA',
        item: 'Finalidade anuência',
        esperado: 'Não tratar como PAC/POC',
        antiPadrao: 'Checklist PAC/POC em anuência',
        severidade: 'critico',
      },
      {
        id: 'PAN_POLIGONAL_COORDENADAS',
        item: 'Poligonal e coordenadas',
        esperado: 'Coordenadas na planta/memorial',
        severidade: 'critico',
      },
      {
        id: 'PAN_SOBREPOSICAO_FD',
        item: 'Sobreposição com FD',
        esperado: 'Demonstrar relação com faixa de domínio',
        severidade: 'alto',
      },
      {
        id: 'PAN_ART_IMOVEL',
        item: 'ART do imóvel',
        esperado: 'ART individualizando o imóvel/objeto',
        severidade: 'critico',
      },
    ],
    criteriosAceite: [
      'Isolamento PAN_*',
      'Poligonal + ART imóvel',
    ],
  },
  {
    id: 'eval-acesso-ipr',
    titulo: 'Acesso — IPR-728 / DER',
    tipoAnaliseId: 'acesso',
    fonteGabarito: 'IPR 728 - manual-de-projeto-de-acessos-de-areas-lindeiras-a-rodovias-federais.pdf',
    fonteComparativo: 'DER Instrucoes_Tecnicas-Acessos_Novos.pdf',
    findings: [
      {
        id: 'ACESSO_REFS_IPR728',
        item: 'Referências IPR-728',
        esperado: 'Fundamentar em IPR-728/DER',
        severidade: 'alto',
      },
      {
        id: 'ACESSO_GEOMETRIA_VISIBILIDADE',
        item: 'Geometria e visibilidade',
        esperado: 'Cotas geométricas e distâncias de visibilidade',
        antiPadrao: 'OK sem cotas',
        severidade: 'critico',
      },
      {
        id: 'ACESSO_FD_DOCS',
        item: 'FD e documentação',
        esperado: 'Docs de FD; isolamento ACESSO_*',
        antiPadrao: 'Importar POC_*',
        severidade: 'critico',
      },
    ],
    criteriosAceite: [
      'Geometria/visibilidade com evidência',
      'Não misturar com ocupação aérea POC',
    ],
  },
]

/** Mapeia tipoAnaliseId → caso de eval para telemetria pós-análise. */
export const EVAL_CASO_POR_TIPO: Record<string, string> = {
  poc: 'eval-poc-edp-viana',
  ppu: 'eval-ppu-checklist',
  'pac-viabilidade': 'eval-pacv-capixaba',
  'pac-executivo': 'eval-pace-capixaba',
  pan: 'eval-pan-checklist',
  acesso: 'eval-acesso-ipr',
}

export function resolveEvalCasoIdPorTipo(tipoAnaliseId: string | null | undefined): string | null {
  if (!tipoAnaliseId) return null
  return EVAL_CASO_POR_TIPO[tipoAnaliseId] ?? null
}

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
  PPU_NATUREZA_INTERVENCAO: ['ppu', 'publicidade', 'natureza'],
  PPU_SEGURANCA_INTERFERENCIAS: ['sustenta', 'interfer', 'seguran'],
  PPU_ADMINISTRATIVO: ['requerimento', 'art', 'declara'],
  PPU_PLANTAS: ['planta', 'fd', 'fne', 'area'],
  PACV_ESCOPO_VIABILIDADE: ['viabilidade', 'fase', 'nao exigir executivo', 'não exigir executivo'],
  PACV_DOCS_MINIMOS: ['documentacao minima', 'documentação mínima', 'docs minimos', 'docs mínimos'],
  PACV_FD_NON_AED: ['faixa de dominio', 'faixa de domínio', 'non aedificandi', 'nao edificante'],
  PACV_VISIBILIDADE_IPR728: ['visibilidade', 'ipr-728', 'ipr 728'],
  PACE_VOLUMES_SUROD: ['volume', 'surod', 'codifica'],
  PACE_TERRAP_GEO_PAV: ['terrap', 'paviment', 'geotec'],
  PACE_HIDRO_DRENAGEM: ['drenag', 'hidro'],
  PACE_SINALIZACAO_DEF_TEMP: ['sinaliza', 'carimbo', 'temporar'],
  PAN_FINALIDADE_ANUENCIA: ['anuencia', 'anuência', 'pan'],
  PAN_POLIGONAL_COORDENADAS: ['poligonal', 'coordenad'],
  PAN_SOBREPOSICAO_FD: ['sobreposi', 'faixa de dominio', 'faixa de domínio'],
  PAN_ART_IMOVEL: ['art', 'imovel', 'imóvel'],
  ACESSO_REFS_IPR728: ['ipr-728', 'ipr 728', 'der'],
  ACESSO_GEOMETRIA_VISIBILIDADE: ['geometr', 'visibilidade'],
  ACESSO_FD_DOCS: ['faixa de dominio', 'faixa de domínio', 'acesso'],
}

/** Anti-padrões: se o relatório ainda comete o erro clássico, o finding NÃO marca OK. */
export const EVAL_FINDING_ANTI_NEEDLES: Record<string, string[]> = {
  'f-perfil': ['perfil não localizado', 'perfil nao localizado', 'perfil ausente'],
  'f-plano-trabalho': ['falta de recomposição', 'falta de recomposicao', 'interferência no tráfego'],
  'f-planta': ['planta completa e sem pendências', 'planta completa e sem pendencias'],
  'f-sinalizacao': ['sinalização compatível e atendida', 'sinalizacao compativel e atendida'],
  PPU_NATUREZA_INTERVENCAO: ['checklist de ocupação', 'checklist de ocupacao', 'poc_*'],
  PACV_ESCOPO_VIABILIDADE: ['exigir terraplenagem na viabilidade', 'disciplinas de executivo na viabilidade'],
  PACE_TERRAP_GEO_PAV: ['omitir terraplenagem', 'checklist de viabilidade no executivo'],
  PAN_FINALIDADE_ANUENCIA: ['checklist pac', 'checklist poc', 'tratar como ocupação'],
  ACESSO_FD_DOCS: ['checklist poc', 'ocupação longitudinal', 'ocupacao longitudinal'],
  ACESSO_GEOMETRIA_VISIBILIDADE: ['ok sem cotas', 'sem conferir visibilidade'],
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

