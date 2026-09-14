import type { GoldenCase } from '../../models/GoldenCase'

/**
 * Casos modelo derivados do material do cliente (`.pdf/testes/`).
 * Status sempre `pendente` — o cliente aprova em `/ensinar-ia` antes de injetar no prompt.
 *
 * Fontes:
 * - `teste de analise - COMPARATIVO.pdf` + `ANÁLISE GABARITO.pdf` (POC EDP Viana)
 * - `AVALIAÇÃO DA FERRAMENTA DE ANÁLISE POR IA.pdf` (tipologia / checklist)
 */
export const GOLDEN_CASES_SEED: Omit<GoldenCase, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'cliente-poc-edp-viana-comparativo',
    codigo: 'poc/cliente-edp-viana-001',
    titulo: 'POC — EDP Viana km 300+746/876 (gabarito × programa)',
    tipoAnaliseId: 'poc',
    descricao:
      'Caso real Ecovias Capixaba: comparativo entre análise manual (gabarito) e relatório gerado pelo programa. ID 26080071.',
    erroIa:
      'Aprovou peças com pendências, inventou falhas no Plano de Trabalho, não localizou o perfil enviado e errou fundamentação da conclusão.',
    analiseCorreta:
      'Objetar pelas pendências reais do gabarito: volumes/codificação SUROD 12, memorial (Cariacica/travessia/sinalização), planta km e poste–bordo, perfil assinado, sinalização EcoRodovias, requerimento/declaração/ART/cronograma e licença ambiental.',
    observacoes:
      'Origem: COMPARATIVO + ANÁLISE GABARITO. Aguardar aprovação do cliente. Não auto-aprovar.',
    pares: [
      {
        id: 'par-poc-viana-volumes',
        regraOuItem: 'Organização dos volumes',
        original: 'Considerou a organização dos volumes correta.',
        correto:
          'Há documentos que precisam ser individualizados ou movidos para o Volume III (requerimento, declaração, ART, cronograma).',
        justificativa:
          'SUROD / organização obrigatória em Volume I (técnico), II (projetos) e III (complementares). Aprovar volumes sem essa separação é incorreto.',
      },
      {
        id: 'par-poc-viana-codificacao',
        regraOuItem: 'Codificação SUROD 12/2025',
        original: 'Considerou todos os arquivos corretamente codificados.',
        correto:
          'Planta, perfil, sinalização, requerimento, declaração e cronograma precisam de adequação à Portaria ANTT/SUROD nº 12/2025.',
        justificativa:
          'Codificação e correspondência PDF/DWG são pendências reais do gabarito; não marcar como atendido sem conferir nomenclatura.',
      },
      {
        id: 'par-poc-viana-memorial',
        regraOuItem: 'Memorial descritivo',
        original:
          'Apontou ausência de afastamentos, altura livre e parâmetros dos postes (pendências inventadas / incompletas).',
        correto:
          'Corrigir referências a “Cariacica” (intervenção em Viana/ES), excluir “travessia” (ocupação longitudinal) e revisar sinalização provisória conforme Manual EcoRodovias.',
        justificativa:
          'Não inventar itens; apontar as inconsistências textuais e de compatibilização realmente presentes no memorial.',
      },
      {
        id: 'par-poc-viana-plano-trabalho',
        regraOuItem: 'Plano de Trabalho',
        original:
          'Apontou falta de recomposição e informações sobre interferência no tráfego.',
        correto: 'Não foram identificadas inconsistências no plano de trabalho apresentado.',
        justificativa:
          'Apontamento indevido: o gabarito considera o Plano de Trabalho sem inconsistências.',
      },
      {
        id: 'par-poc-viana-pba',
        regraOuItem: 'Plano Básico Ambiental (PBA)',
        original: 'Tratou o PBA como documento não localizado.',
        correto:
          'A análise do PBA está sob responsabilidade da equipe de Sustentabilidade da concessionária — não classificar como “não localizado” sem esse contexto.',
        justificativa:
          'Avaliação incompleta: ausência aparente ≠ documento inexistente quando a análise é de outro setor.',
      },
      {
        id: 'par-poc-viana-planta',
        regraOuItem: 'Planta baixa',
        original: 'Considerou a planta completa e sem pendências.',
        correto:
          'Corrigir km 300+140 no título (trecho real 300+746 a 300+876), indicar distância poste–bordo, assinar e codificar SUROD.',
        justificativa:
          'Peça gráfica com pendências relevantes não pode ser marcada como conforme.',
      },
      {
        id: 'par-poc-viana-perfil',
        regraOuItem: 'Perfil da ocupação',
        original: 'Considerou o perfil não localizado.',
        correto:
          'O perfil foi apresentado; faltam assinatura do RT e correção da codificação SUROD.',
        justificativa:
          'Não transformar falha de leitura / localização em “documento ausente” quando o arquivo foi enviado.',
      },
      {
        id: 'par-poc-viana-sinalizacao',
        regraOuItem: 'Sinalização de obras',
        original: 'Considerou sinalização compatível e atendida.',
        correto:
          'Adequar ao Manual EcoRodovias, corrigir carimbo (“Detalhe de Ocupação” → “Projeto de Sinalização de Obras”), assinar e codificar.',
        justificativa:
          'Aprovar sinalização com carimbo/disciplina errados e sem assinatura é incorreto.',
      },
      {
        id: 'par-poc-viana-especificacoes',
        regraOuItem: 'Especificações técnicas',
        original: 'Considerou especificações completas e sem pendências.',
        correto:
          'Revisar e compatibilizar as referências relativas à sinalização provisória (Manual EcoRodovias).',
        justificativa:
          'Referências de sinalização no memorial/especificações precisam estar alinhadas ao manual da concessionária.',
      },
      {
        id: 'par-poc-viana-requerimento',
        regraOuItem: 'Requerimento',
        original: 'Considerou o requerimento completo e atendido.',
        correto:
          'Excluir “travessia”, individualizar no Volume III e adequar codificação SUROD.',
        justificativa:
          'Mesmo objeto longitudinal: “travessia” no requerimento é inconsistência real do gabarito.',
      },
      {
        id: 'par-poc-viana-declaracao',
        regraOuItem: 'Declaração de veracidade',
        original: 'Considerou a declaração completa e atendida.',
        correto:
          'Falta identificação e assinatura do representante legal; corrigir codificação SUROD.',
        justificativa:
          'Só assinatura do RT não fecha a declaração quando exige representante legal.',
      },
      {
        id: 'par-poc-viana-art',
        regraOuItem: 'ART',
        original:
          'Em alguns lotes não localizou a ART; em outros apontou falta de detalhamento do trecho.',
        correto:
          'A ART foi localizada (Volume I); deve ser movida/individualizada no Volume III e consolidada no PDF único.',
        justificativa:
          'Resultado contraditório e incorreto: localizar em um lote e “ausente” em outro com os mesmos docs é instabilidade.',
      },
      {
        id: 'par-poc-viana-cronograma',
        regraOuItem: 'Cronograma',
        original: 'Considerou o cronograma completo e atendido.',
        correto:
          'Existe, mas precisa ser individualizado no Volume III e codificado SUROD.',
        justificativa:
          'Existência do arquivo ≠ organização/codificação conforme Volume III.',
      },
      {
        id: 'par-poc-viana-licenca',
        regraOuItem: 'Licença ambiental',
        original: 'Identificou ausência de comprovação formal de dispensa/inexigibilidade.',
        correto:
          'Manter a pendência: falta comprovação formal da dispensa ou inexigibilidade no Volume III (acerto do programa).',
        justificativa:
          'Único acerto estrutural do comparativo — reforçar, não remover na reanálise.',
      },
      {
        id: 'par-poc-viana-conclusao',
        regraOuItem: 'Conclusão / fundamentação',
        original:
          'Apresentou objeções com base principalmente em pendências erradas ou inventadas.',
        correto:
          'Objetar pelas pendências específicas do gabarito (volumes, codificação, memorial, planta, perfil, sinalização, docs Volume III, licença).',
        justificativa:
          'Resultado “com objeção” por fundamento incorreto ainda é falha de assertividade — o índice não basta.',
      },
    ],
    documentosRef: [
      { nome: 'ANÁLISE GABARITO.pdf', url: null, storagePath: null },
      { nome: 'teste de analise - COMPARATIVO.pdf', url: null, storagePath: null },
      { nome: 'RELATÓRIO GERADO POR PROGRAMA.pdf', url: null, storagePath: null },
    ],
    status: 'pendente',
    ativo: true,
  },
  {
    id: 'cliente-pac-tipologia-checklist',
    codigo: 'pac/cliente-tipologia-001',
    titulo: 'PAC — tipagem correta exige checklist PAC (não ocupação)',
    tipoAnaliseId: 'pac',
    descricao:
      'Extraído da avaliação Baseinfra: GranCafé e demais PACs — a IA corrigia o nome da tipologia sem trocar o checklist.',
    erroIa:
      'Reconheceu “PAC” no texto, mas manteve checklist/critérios de ocupação ou genéricos, omitindo disciplinas de acesso.',
    analiseCorreta:
      'Enquadrar como PAC e aplicar somente requisitos PAC_* / tipologias de acesso; não importar OCUP_* nem checklist genérico de faixa.',
    observacoes:
      'Origem: AVALIAÇÃO DA FERRAMENTA (§1.2, §1.7, §2). Status pendente — aprovação do cliente.',
    pares: [
      {
        id: 'par-pac-checklist',
        regraOuItem: 'Isolamento por tipo (PAC)',
        original:
          'Identificou nominalmente como PAC, porém manteve checklist incompatível (ocupação/genérico).',
        correto:
          'Trocar a estrutura da análise: checklist e disciplinas de PAC/acesso; não apenas o rótulo da tipologia.',
        justificativa:
          'Correção textual da tipagem sem adaptação do checklist foi o padrão de falha nos testes do cliente.',
      },
      {
        id: 'par-pac-fase',
        regraOuItem: 'Fase PAC (viabilidade × executivo)',
        original: 'Aplicou critérios de fase errada ou omitiu disciplinas do executivo.',
        correto:
          'Usar `pac-viabilidade` ou `pac-executivo` conforme a fase; executivo exige disciplinas próprias (planta, ART, etc.).',
        justificativa:
          'Identificação de fase incorreta derruba todo o checklist (prioridade 1–2 da avaliação).',
      },
    ],
    documentosRef: [
      { nome: 'AVALIAÇÃO DA FERRAMENTA DE ANÁLISE POR IA.pdf', url: null, storagePath: null },
    ],
    status: 'pendente',
    ativo: true,
  },
  {
    id: 'cliente-ppu-checklist-especifico',
    codigo: 'ppu/cliente-tipologia-001',
    titulo: 'PPU — publicidade com checklist PPU (não ocupação genérica)',
    tipoAnaliseId: 'ppu',
    descricao:
      'Caso Comunyca (avaliação Baseinfra): reconheceu publicidade, mas usou estrutura genérica de ocupação.',
    erroIa:
      'Critérios de ocupação em faixa; avaliou conteúdo de documento não apresentado; omitiu estrutura de sustentação.',
    analiseCorreta:
      'Aplicar checklist PPU_* (publicidade), incluir item de estrutura de sustentação e só avaliar documentos enviados.',
    observacoes: 'Origem: AVALIAÇÃO §1.8. Pendente de aprovação do cliente.',
    pares: [
      {
        id: 'par-ppu-checklist',
        regraOuItem: 'Checklist PPU',
        original:
          'Reconheceu publicidade, mas manteve checklist genérico de ocupação em faixa.',
        correto:
          'Usar requisitos específicos de PPU, incluindo estrutura de sustentação; não importar OCUP_*.',
        justificativa:
          'Mesmo padrão PAC: rótulo certo + metodologia errada.',
      },
      {
        id: 'par-ppu-docs-ausentes',
        regraOuItem: 'Documentos não apresentados',
        original: 'Avaliou conteúdo de documento que não foi apresentado.',
        correto:
          'Classificar claramente: não apresentado × informação não localizada × não conforme × N/A × não avaliável.',
        justificativa:
          'Prioridade 3 da avaliação: não transformar falha de leitura ou arquivo inexistente em NC inventada.',
      },
    ],
    documentosRef: [
      { nome: 'AVALIAÇÃO DA FERRAMENTA DE ANÁLISE POR IA.pdf', url: null, storagePath: null },
    ],
    status: 'pendente',
    ativo: true,
  },
  {
    id: 'cliente-poc-leitura-vs-ausencia',
    codigo: 'poc/cliente-leitura-001',
    titulo: 'POC — não marcar ausente o que está no PDF',
    tipoAnaliseId: 'poc',
    descricao:
      'Padrão Linhares / Prefeitura Viana: coordenadas, ART, datas e cronograma existiam e foram tratados como ausentes; baixa repetibilidade.',
    erroIa:
      'Considerou ausentes informações existentes; reanálise perdeu itens; mesmos docs geraram índices diferentes.',
    analiseCorreta:
      'Citar arquivo/página antes de declarar ausência; na reanálise preservar itens não contestados; diferenciar “não localizei” de “não conforme”.',
    observacoes: 'Origem: AVALIAÇÃO §1.3–1.4. Pendente de aprovação do cliente.',
    pares: [
      {
        id: 'par-poc-ausencia',
        regraOuItem: 'Ausência real × falha de leitura',
        original:
          'Marcou como ausentes coordenadas, dados de ART, data do requerimento ou prazo do cronograma que constavam nos anexos.',
        correto:
          'Se a informação estiver no PDF, apontar evidência (arquivo/página). Se não localizar com confiança, declarar limitação de leitura — não NC automática.',
        justificativa:
          'Principal causa de falso negativo nos testes POC do cliente.',
      },
      {
        id: 'par-poc-reanalise',
        regraOuItem: 'Estabilidade na reanálise',
        original:
          'Na reanálise, itens antes avaliados deixaram de retornar; índices oscilaram com os mesmos documentos.',
        correto:
          'Manter consistência: revisar fundamento e evidência; não dropar itens estáveis sem mudança de entrada.',
        justificativa:
          'Prioridade 7 da avaliação — repetibilidade entre execuções.',
      },
    ],
    documentosRef: [
      { nome: 'AVALIAÇÃO DA FERRAMENTA DE ANÁLISE POR IA.pdf', url: null, storagePath: null },
    ],
    status: 'pendente',
    ativo: true,
  },
]

/** IDs dos seeds do cliente — usados no sync one-shot (não sobrescreve se já existir). */
export const GOLDEN_CASES_CLIENTE_IDS = GOLDEN_CASES_SEED.map((item) => item.id)
