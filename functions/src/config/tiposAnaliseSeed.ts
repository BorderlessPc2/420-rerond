import {
  ORIENTACAO_ASSERTIVIDADE,
  REQ_ACESSO_CLIENTE,
  REQ_PACE_CLIENTE,
  REQ_PACV_CLIENTE,
  REQ_PAN,
  REQ_POC_CLIENTE,
  REQ_PPU_CLIENTE,
} from './checklistsCliente'

export type RequisitoTipoAnalise = {
  id: string
  descricao: string
  categoria?: string
}

export type TipoAnaliseSeed = {
  id: string
  nome: string
  slug: string
  categoria: string
  descricao: string
  finalidade?: string
  normasFontes: string[]
  documentosSugeridos: string[]
  requisitos: RequisitoTipoAnalise[]
  promptOrientacao?: string
  ativo: boolean
}

/** Requisitos exclusivos — IDs prefixados por domínio. */
const REQ_OCUPACAO: RequisitoTipoAnalise[] = [
  {
    id: 'OCUP_COMPLETUDE_DOCUMENTAL',
    descricao:
      'Completude da documentação de ocupação em faixa de domínio (requerimento, memorial, plantas).',
    categoria: 'DOCUMENTAL',
  },
  {
    id: 'OCUP_LOCALIZACAO_KM',
    descricao: 'Localização da ocupação com km e sentido coerentes no memorial e nas plantas.',
    categoria: 'GEOMETRIA',
  },
  {
    id: 'OCUP_FAIXA_DOMINIO',
    descricao:
      'Interferência com faixa de domínio / non aedificandi identificada e compatível com a norma.',
    categoria: 'GEOMETRIA',
  },
  {
    id: 'OCUP_PERFIL_TRAVESSIA',
    descricao: 'Perfil / seção da ocupação ou travessia com cotas e afastamentos mínimos.',
    categoria: 'GEOMETRIA',
  },
  {
    id: 'OCUP_ART_PROJETO',
    descricao: 'ART referente ao projeto de ocupação apresentada e vinculada ao responsável técnico.',
    categoria: 'DOCUMENTAL',
  },
  {
    id: 'OCUP_INTERFERENCIA_PISTA',
    descricao: 'Avaliação de interferência com pista, acostamento e dispositivos de segurança.',
    categoria: 'SEGURANCA',
  },
]

const REQ_ACESSO: RequisitoTipoAnalise[] = [
  {
    id: 'ACESSO_COMPLETUDE_DOCUMENTAL',
    descricao: 'Completude documental do projeto de acesso (requerimento, memorial, planta).',
    categoria: 'DOCUMENTAL',
  },
  {
    id: 'ACESSO_GEOMETRIA_ENTRADA',
    descricao: 'Geometria da entrada/saída (raios, ângulos, larguras) conforme diretrizes de acesso.',
    categoria: 'GEOMETRIA',
  },
  {
    id: 'ACESSO_VISIBILIDADE',
    descricao: 'Distâncias de visibilidade e sinalização de alerta no acesso à rodovia.',
    categoria: 'SEGURANCA',
  },
  {
    id: 'ACESSO_DRENAGEM',
    descricao: 'Solução de drenagem do acesso sem comprometer a plataforma da rodovia.',
    categoria: 'DRENAGEM',
  },
  {
    id: 'ACESSO_ART',
    descricao: 'ART do projeto de acesso vinculada ao responsável técnico.',
    categoria: 'DOCUMENTAL',
  },
  {
    id: 'ACESSO_PROPRIEDADE_LINDEIRA',
    descricao: 'Identificação da propriedade lindeira e finalidade do acesso.',
    categoria: 'DOCUMENTAL',
  },
  ...REQ_ACESSO_CLIENTE,
]

const REQ_PAC: RequisitoTipoAnalise[] = [
  {
    id: 'PAC_COMPLETUDE_DOCUMENTAL',
    descricao:
      'Completude documental do PAC / plano de adequação (requerimento, memorial, plano de trabalho).',
    categoria: 'DOCUMENTAL',
  },
  {
    id: 'PAC_ESCOPO_ADEQUACAO',
    descricao: 'Escopo das adequações proposto está descrito e coerente com o diagnóstico.',
    categoria: 'TECNICO',
  },
  {
    id: 'PAC_CRONOGRAMA',
    descricao: 'Cronograma / prazos do PAC coerentes com o escopo.',
    categoria: 'PLANEJAMENTO',
  },
  {
    id: 'PAC_PARAMETROS_DESEMPENHO',
    descricao: 'Parâmetros técnicos e de desempenho aplicáveis considerados.',
    categoria: 'TECNICO',
  },
  {
    id: 'PAC_ART',
    descricao: 'ART aplicável ao PAC apresentada e vinculada.',
    categoria: 'DOCUMENTAL',
  },
  {
    id: 'PAC_CHECKLIST_VERIFICACAO',
    descricao: 'Checklist de verificação da fase preenchido quando exigido.',
    categoria: 'DOCUMENTAL',
  },
]

const REQ_POC: RequisitoTipoAnalise[] = REQ_POC_CLIENTE
const REQ_PPU: RequisitoTipoAnalise[] = REQ_PPU_CLIENTE
const REQ_PAC_VIAB: RequisitoTipoAnalise[] = REQ_PACV_CLIENTE
const REQ_PAC_EXEC: RequisitoTipoAnalise[] = REQ_PACE_CLIENTE
const REQ_PAN_LIST: RequisitoTipoAnalise[] = REQ_PAN

export const TIPOS_ANALISE_SEED: TipoAnaliseSeed[] = [
  {
    id: 'ocupacao-faixa',
    nome: 'Ocupação em faixa de domínio',
    slug: 'ocupacao-faixa',
    categoria: 'ocupacao_faixa',
    descricao: 'Análise de ocupações (redes, travessias, interferências) na faixa de domínio.',
    finalidade: 'Verificar conformidade documental e técnica de ocupação.',
    normasFontes: ['ANTT_SUROD_13_2025', 'ANTT_SUROD_111_2025', 'DNIT_738_SINALIZACAO_OBRAS'],
    documentosSugeridos: [
      'requerimento',
      'memorial_descritivo',
      'planta_baixa',
      'perfil_ocupacao',
      'art',
    ],
    requisitos: REQ_OCUPACAO,
    promptOrientacao: `${ORIENTACAO_ASSERTIVIDADE}\nISOLAMENTO OBRIGATÓRIO: use SOMENTE requisitos com prefixo OCUP_. NÃO aplique ACESSO_*, PAC_*, POC_*, PPU_* ou PAN_*.`,
    ativo: true,
  },
  {
    id: 'poc',
    nome: 'POC — Projeto de Ocupação',
    slug: 'poc',
    categoria: 'poc',
    descricao: 'Tipologia POC (Projeto de Ocupação) — Ecovias Capixaba/Araguaia e equivalentes.',
    finalidade: 'Checklist específico de POC (material cliente).',
    normasFontes: [
      'ANTT_SUROD_13_2025',
      'ANTT_SUROD_12_2025',
      'ANTT_SUROD_111_2025',
      'DNIT_738_SINALIZACAO_OBRAS',
    ],
    documentosSugeridos: [
      'requerimento',
      'memorial_descritivo',
      'planta_baixa',
      'perfil_ocupacao',
      'projeto_sinalizacao',
      'art',
    ],
    requisitos: REQ_POC,
    promptOrientacao: `${ORIENTACAO_ASSERTIVIDADE}\nISOLAMENTO POC: use somente POC_*. Não use checklist de PPU/PAC/PAN/acesso.`,
    ativo: true,
  },
  {
    id: 'acesso',
    nome: 'Acessos',
    slug: 'acesso',
    categoria: 'acesso',
    descricao: 'Análise de projetos de acesso à rodovia / propriedade lindeira.',
    finalidade: 'Verificar conformidade de acessos (IPR 728 / DER).',
    normasFontes: [
      'IPR_728_ACESSOS',
      'DER_ACESSOS_NOVOS',
      'ANTT_SUROD_13_2025',
      'ANTT_SUROD_111_2025',
    ],
    documentosSugeridos: ['requerimento', 'memorial_descritivo', 'planta_baixa', 'art'],
    requisitos: REQ_ACESSO,
    promptOrientacao: `${ORIENTACAO_ASSERTIVIDADE}\nISOLAMENTO OBRIGATÓRIO: use SOMENTE ACESSO_*. NÃO aplique OCUP_*, PAC_*, POC_*, PPU_* ou PAN_*.`,
    ativo: true,
  },
  {
    id: 'pac',
    nome: 'PAC (geral)',
    slug: 'pac',
    categoria: 'pac',
    descricao: 'PAC genérico — prefira PAC Viabilidade ou PAC Executivo quando a fase for conhecida.',
    finalidade: 'Verificar conformidade de PAC.',
    normasFontes: ['ANTT_SUROD_12_2025', 'ANTT_SUROD_111_2025', 'IPR_728_ACESSOS'],
    documentosSugeridos: ['requerimento', 'memorial_descritivo', 'plano_trabalho', 'art'],
    requisitos: REQ_PAC,
    promptOrientacao: `${ORIENTACAO_ASSERTIVIDADE}\nISOLAMENTO: use SOMENTE PAC_*. Se a fase for viabilidade ou executivo, prefira pac-viabilidade / pac-executivo.`,
    ativo: true,
  },
  {
    id: 'pac-viabilidade',
    nome: 'PAC — Viabilidade',
    slug: 'pac-viabilidade',
    categoria: 'pac',
    descricao: 'PAC na fase de viabilidade — checklist Ecovias Capixaba (material cliente).',
    finalidade: 'Checklist de PAC Viabilidade.',
    normasFontes: [
      'ANTT_SUROD_12_2025',
      'ANTT_SUROD_13_2025',
      'ANTT_SUROD_111_2025',
      'IPR_728_ACESSOS',
      'DER_ACESSOS_NOVOS',
    ],
    documentosSugeridos: [
      'requerimento',
      'memorial_descritivo',
      'projeto_geometrico',
      'planta_baixa',
      'art',
    ],
    requisitos: REQ_PAC_VIAB,
    promptOrientacao: `${ORIENTACAO_ASSERTIVIDADE}\nFASE VIABILIDADE: use somente PACV_*. Não exija disciplinas exclusivas de executivo.`,
    ativo: true,
  },
  {
    id: 'pac-executivo',
    nome: 'PAC — Executivo',
    slug: 'pac-executivo',
    categoria: 'pac',
    descricao: 'PAC executivo — checklist Capixaba/Araguaia (material cliente).',
    finalidade: 'Checklist de PAC Executivo com múltiplas disciplinas.',
    normasFontes: [
      'ANTT_SUROD_12_2025',
      'ANTT_SUROD_13_2025',
      'ANTT_SUROD_111_2025',
      'IPR_728_ACESSOS',
      'DNIT_738_SINALIZACAO_OBRAS',
    ],
    documentosSugeridos: [
      'requerimento',
      'memorial_descritivo',
      'planta_baixa',
      'projeto_geometrico',
      'projeto_drenagem',
      'projeto_terraplenagem',
      'projeto_pavimentacao',
      'projeto_sinalizacao',
      'art',
    ],
    requisitos: REQ_PAC_EXEC,
    promptOrientacao: `${ORIENTACAO_ASSERTIVIDADE}\nFASE EXECUTIVO: use somente PACE_*. Avalie disciplinas presentes nos anexos; não marque ausente o que não foi enviado.`,
    ativo: true,
  },
  {
    id: 'ppu',
    nome: 'PPU — Permissão de Uso',
    slug: 'ppu',
    categoria: 'ppu',
    descricao: 'Projeto de Permissão de Uso (PPU) — checklist cliente (não confundir com POC/PAC).',
    finalidade: 'Checklist de permissão de uso / ocupação da FXD.',
    normasFontes: [
      'ANTT_SUROD_12_2025',
      'ANTT_SUROD_13_2025',
      'ANTT_SUROD_111_2025',
      'DNIT_738_SINALIZACAO_OBRAS',
    ],
    documentosSugeridos: ['requerimento', 'memorial_descritivo', 'planta_baixa', 'art'],
    requisitos: REQ_PPU,
    promptOrientacao: `${ORIENTACAO_ASSERTIVIDADE}\nISOLAMENTO PPU: use somente PPU_*. PROIBIDO checklist de POC/PAC/PAN.`,
    ativo: true,
  },
  {
    id: 'pan',
    nome: 'PAN — Termo de Anuência / Confrontação',
    slug: 'pan',
    categoria: 'pan',
    descricao: 'PAN — anuência/confrontação de imóvel vs faixa de domínio (Ecovias Capixaba).',
    finalidade: 'Checklist de anuência/confrontação — não tratar como PAC ou POC.',
    normasFontes: ['ANTT_SUROD_13_2025', 'ANTT_SUROD_111_2025'],
    documentosSugeridos: ['requerimento', 'memorial_descritivo', 'planta_baixa', 'art'],
    requisitos: REQ_PAN_LIST,
    promptOrientacao: `${ORIENTACAO_ASSERTIVIDADE}\nISOLAMENTO PAN: use somente PAN_*. NÃO tratar como PAC ou POC; não importar valores de outro caso.`,
    ativo: true,
  },
  {
    id: 'outro',
    nome: 'Outro',
    slug: 'outro',
    categoria: 'outro',
    descricao: 'Tipo extensível — descrever a finalidade na solicitação ou no cadastro.',
    finalidade: 'Casos pontuais sem tipo pré-cadastrado.',
    normasFontes: [],
    documentosSugeridos: [],
    requisitos: [],
    promptOrientacao: `${ORIENTACAO_ASSERTIVIDADE}\nTipo Outro: use apenas normas/requisitos informados nesta solicitação. NÃO importe checklist de outro domínio.`,
    ativo: true,
  },
]
