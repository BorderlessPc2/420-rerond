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
  {
    id: 'cliente-poc-checklist-volumes-surod',
    codigo: 'poc/cliente-checklist-capixaba-001',
    titulo: 'POC — volumes SUROD e peças do checklist Capixaba/Araguaia',
    tipoAnaliseId: 'poc',
    descricao:
      'Derivado de POC - CAPIXABA / POC - ARAGUAIA: organização Volume I–III, codificação e peças gráficas obrigatórias.',
    erroIa:
      'Aprovou volumes sem individualizar docs no Volume III; ignorou SUROD 12; tratou presença de planta como conformidade plena.',
    analiseCorreta:
      'Exigir Volumes I/II/III + codificação SUROD; memorial com FD/non aedificandi; planta com cotas e poste–bordo; perfil com altura; sinalização; ART/cronograma no Volume III.',
    observacoes: 'Origem: POC - CAPIXABA.pdf / POC - ARAGUAIA.pdf. Pendente de aprovação.',
    pares: [
      {
        id: 'par-poc-chk-volumes',
        regraOuItem: 'POC_VOLUMES_CODIFICACAO',
        original: 'Organização dos volumes considerada atendida sem Volume III individualizado.',
        correto:
          'Separar Volume I (técnico), II (projetos) e III (requerimento, ART, cronograma, licença); codificar SUROD 12/2025.',
        justificativa: 'Checklist Capixaba/Araguaia e Portaria SUROD nº 12/2025.',
      },
      {
        id: 'par-poc-chk-pecas',
        regraOuItem: 'POC_PLANTA_BAIXA / POC_PERFIL_ALTURA',
        original: 'Marcou planta/perfil OK só porque o PDF existe.',
        correto:
          'Conferir km no carimbo × memorial, afastamentos, altura livre e assinatura do RT antes de OK.',
        justificativa: 'Presente ≠ conforme — regra transversal dos testes do cliente.',
      },
    ],
    documentosRef: [
      { nome: 'POC - CAPIXABA.pdf', url: null, storagePath: null },
      { nome: 'POC - ARAGUAIA.pdf', url: null, storagePath: null },
    ],
    status: 'pendente',
    ativo: true,
  },
  {
    id: 'cliente-ppu-sustentacao-checklist',
    codigo: 'ppu/cliente-checklist-001',
    titulo: 'PPU — estrutura de sustentação e escopo do checklist',
    tipoAnaliseId: 'ppu',
    descricao: 'Do checklist PPU: natureza da intervenção, área, plantas e estrutura de sustentação.',
    erroIa:
      'Omitiu item de estrutura de sustentação; misturou critérios de ocupação longitudinal.',
    analiseCorreta:
      'Aplicar PPU_*: natureza publicidade, memorial de área, FD/FNE, plantas, uso/acesso, segurança e administrativo; incluir sustentação.',
    observacoes: 'Origem: PPU - CHECKLIST.pdf. Pendente.',
    pares: [
      {
        id: 'par-ppu-sust',
        regraOuItem: 'PPU_SEGURANCA_INTERFERENCIAS / sustentação',
        original: 'Não avaliou estrutura de sustentação do elemento de publicidade.',
        correto:
          'Exigir detalhe da estrutura de sustentação, interferências e segurança viária no pacote PPU.',
        justificativa: 'Checklist PPU + falha tipada na avaliação Baseinfra (Comunyca).',
      },
      {
        id: 'par-ppu-escopo',
        regraOuItem: 'PPU_NATUREZA_INTERVENCAO',
        original: 'Usou checklist genérico de faixa de domínio.',
        correto: 'Isolar domínio PPU; não importar POC_* / OCUP_*.',
        justificativa: 'Isolamento por tipo — avaliação §1.8.',
      },
    ],
    documentosRef: [{ nome: 'PPU - CHECKLIST.pdf', url: null, storagePath: null }],
    status: 'pendente',
    ativo: true,
  },
  {
    id: 'cliente-ppu-docs-admin',
    codigo: 'ppu/cliente-checklist-002',
    titulo: 'PPU — documentação administrativa mínima',
    tipoAnaliseId: 'ppu',
    descricao: 'Requerimento, ART e docs administrativos do checklist PPU.',
    erroIa: 'Aprovou PPU sem ART/requerimento ou inventou conteúdo de doc não enviado.',
    analiseCorreta:
      'Verificar PPU_ADMINISTRATIVO: requerimento, ART, declaração; classificar ausência real vs não localizado.',
    observacoes: 'Origem: PPU - CHECKLIST.pdf. Pendente.',
    pares: [
      {
        id: 'par-ppu-admin',
        regraOuItem: 'PPU_ADMINISTRATIVO',
        original: 'Ignorou docs administrativos ou inventou conteúdo.',
        correto:
          'Conferir requerimento, ART e declaração; se ausentes, INFORMACAO_AUSENTE com o que apresentar.',
        justificativa: 'Checklist PPU — bloco administrativo.',
      },
    ],
    documentosRef: [{ nome: 'PPU - CHECKLIST.pdf', url: null, storagePath: null }],
    status: 'pendente',
    ativo: true,
  },
  {
    id: 'cliente-pacv-escopo-fase',
    codigo: 'pac-viabilidade/cliente-capixaba-001',
    titulo: 'PAC Viabilidade — escopo de fase (não executivo)',
    tipoAnaliseId: 'pac-viabilidade',
    descricao: 'PAC - VIABILIDADE - CAPIXABA: docs mínimos e classificação sem exigir disciplinas de executivo.',
    erroIa: 'Exigiu disciplinas de executivo (terraplenagem/pavimento) em fase de viabilidade.',
    analiseCorreta:
      'Aplicar PACV_*: escopo viabilidade, docs mínimos, memorial/classificação, FD, geométrico e visibilidade IPR-728.',
    observacoes: 'Origem: PAC - VIABILIDADE - CAPIXABA.pdf. Pendente.',
    pares: [
      {
        id: 'par-pacv-escopo',
        regraOuItem: 'PACV_ESCOPO_VIABILIDADE',
        original: 'Cobrou peças de executivo na viabilidade.',
        correto: 'Limitar ao escopo da fase viabilidade; não importar PACE_*.',
        justificativa: 'Fase incorreta derruba o checklist (avaliação Baseinfra).',
      },
    ],
    documentosRef: [{ nome: 'PAC - VIABILIDADE - CAPIXABA.pdf', url: null, storagePath: null }],
    status: 'pendente',
    ativo: true,
  },
  {
    id: 'cliente-pacv-docs-minimos',
    codigo: 'pac-viabilidade/cliente-capixaba-002',
    titulo: 'PAC Viabilidade — documentação mínima e FD',
    tipoAnaliseId: 'pac-viabilidade',
    descricao: 'Docs mínimos, codificação e delimitação de faixa de domínio na viabilidade.',
    erroIa: 'Aprovou viabilidade sem planta de situação futura / FD.',
    analiseCorreta:
      'Conferir PACV_DOCS_MINIMOS, PACV_FD_NON_AED e PACV_SITUACAO_FUTURA antes de OK.',
    observacoes: 'Origem: PAC - VIABILIDADE - CAPIXABA.pdf. Pendente.',
    pares: [
      {
        id: 'par-pacv-docs',
        regraOuItem: 'PACV_DOCS_MINIMOS',
        original: 'Marcou docs mínimos OK sem evidência.',
        correto: 'Listar docs mínimos apresentados e faltantes com arquivo/página.',
        justificativa: 'Checklist Capixaba viabilidade.',
      },
      {
        id: 'par-pacv-fd',
        regraOuItem: 'PACV_FD_NON_AED',
        original: 'Não conferiu FD / non aedificandi.',
        correto: 'Exigir delimitação FD e faixa non aedificandi na planta de viabilidade.',
        justificativa: 'Item crítico de segurança/acesso.',
      },
    ],
    documentosRef: [{ nome: 'PAC - VIABILIDADE - CAPIXABA.pdf', url: null, storagePath: null }],
    status: 'pendente',
    ativo: true,
  },
  {
    id: 'cliente-pacv-visibilidade',
    codigo: 'pac-viabilidade/cliente-capixaba-003',
    titulo: 'PAC Viabilidade — visibilidade IPR-728',
    tipoAnaliseId: 'pac-viabilidade',
    descricao: 'Distâncias de visibilidade e geometria na fase de viabilidade.',
    erroIa: 'Ignorou visibilidade ou citou norma sem conferir cotas.',
    analiseCorreta:
      'Aplicar PACV_VISIBILIDADE_IPR728 e PACV_GEOMETRICO com evidência nas plantas.',
    observacoes: 'Origem: PAC - VIABILIDADE + IPR 728. Pendente.',
    pares: [
      {
        id: 'par-pacv-vis',
        regraOuItem: 'PACV_VISIBILIDADE_IPR728',
        original: 'Não apontou falta de estudo de visibilidade.',
        correto: 'Exigir distâncias de visibilidade compatíveis com IPR-728 / classificação do acesso.',
        justificativa: 'Checklist Capixaba + IPR 728.',
      },
    ],
    documentosRef: [
      { nome: 'PAC - VIABILIDADE - CAPIXABA.pdf', url: null, storagePath: null },
      { nome: 'IPR 728 - manual-de-projeto-de-acessos-de-areas-lindeiras-a-rodovias-federais.pdf', url: null, storagePath: null },
    ],
    status: 'pendente',
    ativo: true,
  },
  {
    id: 'cliente-pace-disciplinas',
    codigo: 'pac-executivo/cliente-capixaba-001',
    titulo: 'PAC Executivo — disciplinas e volumes',
    tipoAnaliseId: 'pac-executivo',
    descricao: 'PAC EXECUTIVO Capixaba/Araguaia: volumes SUROD e disciplinas (topo, terrap, hidro, sinalização).',
    erroIa: 'Aplicou só checklist de viabilidade; omitiu disciplinas do executivo.',
    analiseCorreta:
      'Usar PACE_*: volumes, memorial, topo/geometria, visibilidade, terrap/geo/pav, hidro, sinalização, plano/cronograma, admin.',
    observacoes: 'Origem: PAC - EXECUTIVO - CAPIXABA/ARAGUAIA. Pendente.',
    pares: [
      {
        id: 'par-pace-disc',
        regraOuItem: 'PACE_TERRAP_GEO_PAV / PACE_HIDRO_DRENAGEM',
        original: 'Omitiu terraplenagem/drenagem no executivo.',
        correto: 'Verificar disciplinas do executivo; marcar ausência real ou NC por incompleto.',
        justificativa: 'Checklist executivo Capixaba.',
      },
    ],
    documentosRef: [
      { nome: 'PAC - EXECUTIVO - CAPIXABA.pdf', url: null, storagePath: null },
      { nome: 'PAC - EXECUTIVO - ARAGUAIA.pdf', url: null, storagePath: null },
    ],
    status: 'pendente',
    ativo: true,
  },
  {
    id: 'cliente-pace-tipagem-fase',
    codigo: 'pac-executivo/cliente-fase-001',
    titulo: 'PAC Executivo — tipagem de fase correta',
    tipoAnaliseId: 'pac-executivo',
    descricao: 'Não usar PACV_* quando o pacote é executivo.',
    erroIa: 'Rotulou PAC mas manteve critérios de viabilidade.',
    analiseCorreta: 'tipoAnaliseId pac-executivo + requisitos PACE_* apenas.',
    observacoes: 'Origem: avaliação Baseinfra + PAC EXECUTIVO. Pendente.',
    pares: [
      {
        id: 'par-pace-fase',
        regraOuItem: 'Isolamento PACE',
        original: 'Misturou PACV e PACE.',
        correto: 'Isolar executivo; não importar PACV_ESCOPO_VIABILIDADE.',
        justificativa: 'Prioridade 1–2 tipagem/fase.',
      },
    ],
    documentosRef: [{ nome: 'AVALIAÇÃO DA FERRAMENTA DE ANÁLISE POR IA.pdf', url: null, storagePath: null }],
    status: 'pendente',
    ativo: true,
  },
  {
    id: 'cliente-pace-sinalizacao-admin',
    codigo: 'pac-executivo/cliente-sinalizacao-001',
    titulo: 'PAC Executivo — sinalização e administrativo',
    tipoAnaliseId: 'pac-executivo',
    descricao: 'Sinalização definitiva/temporária, plano de trabalho, ART e situação futura.',
    erroIa: 'Aprovou sinalização pelo carimbo; omitiu admin ambiental/futuro.',
    analiseCorreta:
      'Conferir PACE_SINALIZACAO_DEF_TEMP, PACE_PLANO_CRONOGRAMA e PACE_ADMIN_AMBIENTAL_FUTURO.',
    observacoes: 'Origem: PAC EXECUTIVO. Pendente.',
    pares: [
      {
        id: 'par-pace-sinal',
        regraOuItem: 'PACE_SINALIZACAO_DEF_TEMP',
        original: 'OK só por existência do PDF de sinalização.',
        correto: 'Conferir carimbo/disciplina, assinatura e compatibilidade com memorial.',
        justificativa: 'Presente ≠ conforme.',
      },
    ],
    documentosRef: [{ nome: 'PAC - EXECUTIVO - CAPIXABA.pdf', url: null, storagePath: null }],
    status: 'pendente',
    ativo: true,
  },
  {
    id: 'cliente-pan-anuencia',
    codigo: 'pan/cliente-checklist-001',
    titulo: 'PAN — anuência ≠ PAC/POC',
    tipoAnaliseId: 'pan',
    descricao: 'PAN checklist: finalidade de anuência e isolamento de domínio.',
    erroIa: 'Aplicou checklist PAC/POC a processo de anuência.',
    analiseCorreta:
      'Usar PAN_*: finalidade anuência, identificação, requerimento, planta topográfica, poligonal, sobreposição FD, memorial, ART imóvel, declaração.',
    observacoes: 'Origem: PAN - CHECKLIST.pdf. Pendente.',
    pares: [
      {
        id: 'par-pan-tipo',
        regraOuItem: 'PAN_FINALIDADE_ANUENCIA',
        original: 'Tratou como ocupação/PAC.',
        correto: 'Enquadrar como anuência; checklist PAN_* apenas.',
        justificativa: 'Isolamento de tipo — PAN ≠ POC/PAC.',
      },
    ],
    documentosRef: [{ nome: 'PAN - CHECKLIST.pdf', url: null, storagePath: null }],
    status: 'pendente',
    ativo: true,
  },
  {
    id: 'cliente-pan-poligonal',
    codigo: 'pan/cliente-checklist-002',
    titulo: 'PAN — poligonal e sobreposição FD',
    tipoAnaliseId: 'pan',
    descricao: 'Coordenadas da poligonal e sobreposição com faixa de domínio.',
    erroIa: 'Não conferiu poligonal/coordenadas; aprovou sem sobreposição FD.',
    analiseCorreta: 'Exigir PAN_POLIGONAL_COORDENADAS e PAN_SOBREPOSICAO_FD com evidência na planta.',
    observacoes: 'Origem: PAN - CHECKLIST.pdf. Pendente.',
    pares: [
      {
        id: 'par-pan-polig',
        regraOuItem: 'PAN_POLIGONAL_COORDENADAS',
        original: 'Omitiu coordenadas da poligonal.',
        correto: 'Conferir coordenadas e memorial compatível com a planta topográfica.',
        justificativa: 'Checklist PAN.',
      },
    ],
    documentosRef: [{ nome: 'PAN - CHECKLIST.pdf', url: null, storagePath: null }],
    status: 'pendente',
    ativo: true,
  },
  {
    id: 'cliente-pan-art-imovel',
    codigo: 'pan/cliente-checklist-003',
    titulo: 'PAN — ART do imóvel e declaração',
    tipoAnaliseId: 'pan',
    descricao: 'ART vinculada ao imóvel e declaração de identificação.',
    erroIa: 'Aceitou ART genérica ou declaração sem identificação.',
    analiseCorreta: 'Verificar PAN_ART_IMOVEL e PAN_DECLARACAO_ID.',
    observacoes: 'Origem: PAN - CHECKLIST.pdf. Pendente.',
    pares: [
      {
        id: 'par-pan-art',
        regraOuItem: 'PAN_ART_IMOVEL',
        original: 'ART genérica marcada OK.',
        correto: 'ART deve individualizar o imóvel/objeto da anuência.',
        justificativa: 'Checklist PAN + regra ART dos perfis.',
      },
    ],
    documentosRef: [{ nome: 'PAN - CHECKLIST.pdf', url: null, storagePath: null }],
    status: 'pendente',
    ativo: true,
  },
  {
    id: 'cliente-acesso-geometria',
    codigo: 'acesso/cliente-ipr-001',
    titulo: 'Acesso — geometria e visibilidade IPR-728',
    tipoAnaliseId: 'acesso',
    descricao: 'DER/IPR: geometria do acesso e distâncias de visibilidade.',
    erroIa: 'Aprovou acesso sem conferir raios/visibilidade.',
    analiseCorreta: 'Aplicar ACESSO_GEOMETRIA_VISIBILIDADE e ACESSO_REFS_IPR728.',
    observacoes: 'Origem: IPR 728 + DER acessos. Pendente.',
    pares: [
      {
        id: 'par-acesso-geo',
        regraOuItem: 'ACESSO_GEOMETRIA_VISIBILIDADE',
        original: 'OK sem cotas de visibilidade.',
        correto: 'Exigir geometria e visibilidade compatíveis com IPR-728.',
        justificativa: 'Manual IPR 728 / DER.',
      },
    ],
    documentosRef: [
      { nome: 'IPR 728 - manual-de-projeto-de-acessos-de-areas-lindeiras-a-rodovias-federais.pdf', url: null, storagePath: null },
      { nome: 'DER Instrucoes_Tecnicas-Acessos_Novos.pdf', url: null, storagePath: null },
    ],
    status: 'pendente',
    ativo: true,
  },
  {
    id: 'cliente-acesso-fd-docs',
    codigo: 'acesso/cliente-ipr-002',
    titulo: 'Acesso — FD e documentação',
    tipoAnaliseId: 'acesso',
    descricao: 'Documentação de faixa de domínio e isolamento do tipo acesso.',
    erroIa: 'Misturou checklist de ocupação aérea com acesso veicular.',
    analiseCorreta: 'ACESSO_FD_DOCS + isolamento ACESSO_*; não importar POC_*.',
    observacoes: 'Origem: DER/IPR + avaliação tipagem. Pendente.',
    pares: [
      {
        id: 'par-acesso-fd',
        regraOuItem: 'ACESSO_FD_DOCS',
        original: 'Usou POC_* em acesso.',
        correto: 'Checklist de acesso; docs de FD conforme DER/IPR.',
        justificativa: 'Isolamento por tipo.',
      },
    ],
    documentosRef: [{ nome: 'DER Instrucoes_Tecnicas-Acessos_Novos.pdf', url: null, storagePath: null }],
    status: 'pendente',
    ativo: true,
  },
  {
    id: 'cliente-acesso-isolamento',
    codigo: 'acesso/cliente-ipr-003',
    titulo: 'Acesso — isolamento tipológico',
    tipoAnaliseId: 'acesso',
    descricao: 'Não confundir acesso lindeiro com PAC genérico sem fase.',
    erroIa: 'Rotulou acesso mas aplicou PAC_* genérico.',
    analiseCorreta: 'Usar tipo `acesso` com ACESSO_*; se for PAC, escolher fase viabilidade/executivo.',
    observacoes: 'Origem: avaliação Baseinfra + IPR. Pendente.',
    pares: [
      {
        id: 'par-acesso-iso',
        regraOuItem: 'Isolamento acesso',
        original: 'Checklist PAC genérico em processo de acesso.',
        correto: 'Tipo acesso OU pac-viabilidade/pac-executivo conforme o processo — nunca PAC_* legado genérico se o seed for específico.',
        justificativa: 'Tipagem correta = checklist correto.',
      },
    ],
    documentosRef: [{ nome: 'AVALIAÇÃO DA FERRAMENTA DE ANÁLISE POR IA.pdf', url: null, storagePath: null }],
    status: 'pendente',
    ativo: true,
  },
]

/** IDs dos seeds do cliente — usados no sync one-shot (não sobrescreve se já existir). */
export const GOLDEN_CASES_CLIENTE_IDS = GOLDEN_CASES_SEED.map((item) => item.id)
