"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REQ_ACESSO_CLIENTE = exports.REQ_PACE_CLIENTE = exports.REQ_PACV_CLIENTE = exports.REQ_PPU_CLIENTE = exports.REQ_POC_CLIENTE = exports.REQ_PAN = exports.ORIENTACAO_ASSERTIVIDADE = void 0;
/** Regras transversais de assertividade (gabarito ≠ parâmetro + anti-padrões dos testes do cliente). */
exports.ORIENTACAO_ASSERTIVIDADE = `
REGRAS DE ASSERTIVIDADE (obrigatórias):
- Gabaritos/exemplos NÃO definem valores-padrão (km, larguras, prazos, velocidades). Identifique parâmetros no processo atual.
- Apontar somente inconsistência real, ausência necessária, incompatibilidade entre documentos ou não atendimento a critério aplicável.
- Indicar documento/prancha e a inconsistência de forma objetiva; evitar exigências genéricas.
- Não repetir o mesmo erro em vários itens quando um apontamento de compatibilização resolve o conjunto.
- Quando adequado, registrar "sem inconsistências" — não inventar observação só para preencher.
- NÃO apontar: diferença vs outro processo; disciplina não aplicável; redação diferente com mesmo conteúdo; solução alternativa tecnicamente válida.

RACIOCÍNIO E CLASSIFICAÇÃO (anti-padrões Baseinfra):
- Diferencie SEMPRE: (1) documento não apresentado; (2) apresentado mas informação não localizada após inspeção; (3) localizada porém não conforme; (4) não aplicável; (5) não foi possível avaliar (ilegível/truncado).
- PROIBIDO marcar como "ausente/não localizado" um arquivo que conste nos anexos desta solicitação — cite o arquivo e a pendência real (assinatura, codificação, km, carimbo etc.).
- PROIBIDO inventar pendências em peça que está correta (ex.: Plano de Trabalho sem inconsistências).
- PROIBIDO aprovar Planta/Perfil/Sinalização/Requerimento/Declaração só porque o arquivo existe — conferir km, assinatura, carimbo, codificação SUROD, volumes e compatibilização Memorial × projetos.
- Conclusão/objeção deve se apoiar nas pendências reais encontradas; "Não conforme" por fundamento errado continua sendo falha.
- Corrigir só o NOME da tipologia no texto SEM aplicar o checklist desse tipo é ERRO grave.
- Na reanálise: preserve itens não contestados; revise fundamento e evidência, não apenas o rótulo do status.
`.trim();
exports.REQ_PAN = [
    {
        id: 'PAN_FINALIDADE_ANUENCIA',
        descricao: 'Confirmar que o objeto é anuência/confrontação de imóvel vs rodovia (não tratar como PAC/POC).',
        categoria: 'ESCOPO',
    },
    {
        id: 'PAN_IDENTIFICACAO',
        descricao: 'Identificar interessado, CPF/CNPJ, imóvel, rodovia/UF/município, km, sentido/lado, finalidade, processo/ID e RT.',
        categoria: 'DOCUMENTAL',
    },
    {
        id: 'PAN_REQUERIMENTO',
        descricao: 'Requerimento pede anuência/confrontação (não petição de cartório); contatos, imóvel, rodovia/km, data e assinatura/representação.',
        categoria: 'DOCUMENTAL',
    },
    {
        id: 'PAN_PLANTA_TOPOGRAFICA',
        descricao: 'Planta identifica poligonal, rodovia, km, sentido, FD, Área Não Edificante, vértices/coordenadas, escala, revisão e responsável.',
        categoria: 'GEOMETRIA',
    },
    {
        id: 'PAN_POLIGONAL_COORDENADAS',
        descricao: 'Vértices, fechamento, área, perímetro e sistema (UTM/SIRGAS 2000 + zona/fuso do trecho); não inferir zona só pelo datum.',
        categoria: 'GEOMETRIA',
    },
    {
        id: 'PAN_SOBREPOSICAO_FD',
        descricao: 'Verificar se a poligonal invade/intercepta a Faixa de Domínio (fonte oficial); se não houver base geoespacial, não declarar comprovação espacial absoluta.',
        categoria: 'GEOMETRIA',
    },
    {
        id: 'PAN_MEMORIAL_COMPAT',
        descricao: 'Memorial × Planta: nomenclatura/coordenadas vértice a vértice, área e perímetro compatíveis.',
        categoria: 'TECNICO',
    },
    {
        id: 'PAN_ART_IMOVEL',
        descricao: 'ART compatível com levantamento/Memorial; certidão/matrícula e legitimidade (interessado ≠ proprietário exige autorização).',
        categoria: 'DOCUMENTAL',
    },
    {
        id: 'PAN_DECLARACAO_ID',
        descricao: 'Declaração de veracidade, identificação e consistência cadastral entre todos os documentos.',
        categoria: 'DOCUMENTAL',
    },
];
exports.REQ_POC_CLIENTE = [
    {
        id: 'POC_TIPO_OCUPACAO',
        descricao: 'Identificar se a ocupação é longitudinal, transversal, mista, aérea ou subterrânea e aplicar só critérios correspondentes.',
        categoria: 'ESCOPO',
    },
    {
        id: 'POC_VOLUMES_CODIFICACAO',
        descricao: 'Volumes I/II/III conforme fluxo; codificação: nome do arquivo × capa × conteúdo × carimbo (SUROD).',
        categoria: 'ORGANIZACAO',
    },
    {
        id: 'POC_COMPAT_IDENTIFICACAO',
        descricao: 'Compatibilizar interessado, rodovia/UF/município/km, lado/sentido, tipo, extensão e fase entre Requerimento × Memorial × ART × Declaração × projetos × Cronograma.',
        categoria: 'DOCUMENTAL',
    },
    {
        id: 'POC_MEMORIAL',
        descricao: 'Memorial descreve finalidade, implantação/remanejamento/regularização, materiais, interferências e método; para elétrica: tensão, postes, vãos e travessias quando aplicável.',
        categoria: 'TECNICO',
    },
    {
        id: 'POC_FD_NON_AEDIFICANDI',
        descricao: 'FD e área non aedificandi delimitadas (sem largura fixa assumida); posição da ocupação coerente Memorial × Planta × Perfil.',
        categoria: 'GEOMETRIA',
    },
    {
        id: 'POC_PLANTA_BAIXA',
        descricao: 'Planta com eixo/pista/acostamento, FD, existente/projetado, início/fim, cotas, norte e legenda; longitudinal/transversal conforme o caso.',
        categoria: 'GEOMETRIA',
    },
    {
        id: 'POC_PERFIL_ALTURA',
        descricao: 'Perfil com cotas/vãos/flechas; travessia aérea: altura livre no ponto mais desfavorável (DNIT 7/2021) com base gráfica — não só anotação.',
        categoria: 'GEOMETRIA',
    },
    {
        id: 'POC_ESTRUTURAS_SEGURANCA',
        descricao: 'Postes/suportes vs bordo/acostamento/FD; colapsível exige caracterização técnica; não exigir defensa automaticamente.',
        categoria: 'SEGURANCA',
    },
    {
        id: 'POC_PLANO_SINALIZACAO',
        descricao: 'Plano de Trabalho × Sinalização de Obras × Cronograma compatíveis com interferência no tráfego (Manual da concessionária).',
        categoria: 'EXECUCAO',
    },
    {
        id: 'POC_ADMIN_ART_CRONOGRAMA',
        descricao: 'Requerimento, Declaração, ART (registro/quitação/escopo) e Cronograma em dias compatível com método/tráfego.',
        categoria: 'DOCUMENTAL',
    },
];
exports.REQ_PPU_CLIENTE = [
    {
        id: 'PPU_NATUREZA_INTERVENCAO',
        descricao: 'Determinar se é implantação, adequação, ampliação, alteração de área ou regularização — não aplicar requisitos de obra a regularização sem intervenção física.',
        categoria: 'ESCOPO',
    },
    {
        id: 'PPU_MEMORIAL_AREA',
        descricao: 'Memorial caracteriza finalidade, km/lado, área/dimensões, existente×proposto, estruturas e acesso.',
        categoria: 'TECNICO',
    },
    {
        id: 'PPU_FD_FNE_DELIMITACAO',
        descricao: 'Delimitar perímetro/área; FD e FNE distintas; compatibilizar área Memorial × Requerimento × Planta.',
        categoria: 'GEOMETRIA',
    },
    {
        id: 'PPU_PLANTAS',
        descricao: 'Planta de situação e baixa com existente×permanecer×remover×projetado; coordenadas com datum/zona quando apresentadas.',
        categoria: 'GEOMETRIA',
    },
    {
        id: 'PPU_USO_ACESSO',
        descricao: 'Finalidade compatível com área; acesso/estacionamento/pedestres avaliados; acesso rodoviário novo deve estar no processo adequado.',
        categoria: 'TECNICO',
    },
    {
        id: 'PPU_SEGURANCA_INTERFERENCIAS',
        descricao: 'Afastamentos, obstáculos, visibilidade, drenagem e interferências com manutenção da rodovia; redes podem exigir processo específico.',
        categoria: 'SEGURANCA',
    },
    {
        id: 'PPU_OBRA_CONDICIONAL',
        descricao: 'Plano/Sinalização/Cronograma somente se houver obra/intervenção; em regularização sem obra, não exigir automaticamente.',
        categoria: 'EXECUCAO',
    },
    {
        id: 'PPU_SITUACAO_FUTURA',
        descricao: 'Verificar duplicação/marginais oficiais no trecho; não presumir geometria futura sem fonte.',
        categoria: 'PLANEJAMENTO',
    },
    {
        id: 'PPU_ADMINISTRATIVO',
        descricao: 'Requerimento, Declaração, ART (escopo coerente com existência/ausência de obra), vínculo/posse e PIT quando exigido.',
        categoria: 'DOCUMENTAL',
    },
];
exports.REQ_PACV_CLIENTE = [
    {
        id: 'PACV_ESCOPO_VIABILIDADE',
        descricao: 'Avaliar condições para seguir ao executivo; NÃO exigir Pavimentação/Terraplenagem/Drenagem/Sinalização de Obras/Geotecnia automaticamente nesta fase.',
        categoria: 'PLANEJAMENTO',
    },
    {
        id: 'PACV_DOCS_MINIMOS',
        descricao: 'Vol. I: Requerimento, propriedade/vínculo, ART, Memorial, Declaração. Vol. II: Geométrico, Planta de Situação e auxiliares (perfil/gabarito/visibilidade) quando aplicáveis.',
        categoria: 'DOCUMENTAL',
    },
    {
        id: 'PACV_CODIFICACAO',
        descricao: 'Codificação SUROD 12: nome × capa × conteúdo × carimbo; fase=Viabilidade coerente em todos os docs.',
        categoria: 'ORGANIZACAO',
    },
    {
        id: 'PACV_MEMORIAL_CLASSIFICACAO',
        descricao: 'Memorial de viabilidade com classificação do acesso fundamentada em tráfego/veículo/empreendimento — não aceitar só “Acesso Tipo X”.',
        categoria: 'TECNICO',
    },
    {
        id: 'PACV_FD_NON_AED',
        descricao: 'FD e non aedificandi: Memorial × Geométrico × Planta de Situação; sem largura fixa assumida.',
        categoria: 'GEOMETRIA',
    },
    {
        id: 'PACV_GEOMETRICO',
        descricao: 'Conexão do acesso, larguras, raios, ilhas; faixas acel/desacel e gabarito de giro quando aplicáveis (mesmo veículo do Memorial).',
        categoria: 'GEOMETRIA',
    },
    {
        id: 'PACV_VISIBILIDADE_IPR728',
        descricao: 'Distância de visibilidade e distâncias a acessos/interseções conforme IPR 728 e contexto (pista principal vs marginal).',
        categoria: 'SEGURANCA',
    },
    {
        id: 'PACV_SITUACAO_FUTURA',
        descricao: 'Compatibilidade com duplicação/marginal oficial quando existir; não exigir geometria futura definitiva inexistente.',
        categoria: 'PLANEJAMENTO',
    },
];
exports.REQ_PACE_CLIENTE = [
    {
        id: 'PACE_VOLUMES_SUROD',
        descricao: 'Vol. I estudos/memoriais; Vol. II disciplinas (topo, geometria, terraplenagem, pavimentação, drenagem, sinalizações); Vol. III administrativos — organização e codificação SUROD 12.',
        categoria: 'ORGANIZACAO',
    },
    {
        id: 'PACE_MEMORIAL_FUNDAMENTACAO',
        descricao: 'Memorial fundamenta classificação, veículo, tráfego, geometria, disciplinas e método; classificação não pode ser só nomenclatura.',
        categoria: 'TECNICO',
    },
    {
        id: 'PACE_TOPO_GEOMETRIA',
        descricao: 'Topografia suficiente (eixo, cotas, FD) e geometria (raios, larguras, greide, seções, gabarito) compatíveis entre si.',
        categoria: 'GEOMETRIA',
    },
    {
        id: 'PACE_VISIBILIDADE_DISTANCIAS',
        descricao: 'Visibilidade e distâncias (IPR 728); em marginal usar parâmetros da marginal, não da pista principal mecanicamente.',
        categoria: 'SEGURANCA',
    },
    {
        id: 'PACE_TERRAP_GEO_PAV',
        descricao: 'Terraplenagem, geotecnia e pavimentação coerentes (quando aplicáveis): parâmetros de solo usados de fato no dimensionamento.',
        categoria: 'TECNICO',
    },
    {
        id: 'PACE_HIDRO_DRENAGEM',
        descricao: 'Hidrologia × drenagem × topografia × geometria/terraplenagem compatíveis (vazões, dispositivos, cotas, lançamento).',
        categoria: 'TECNICO',
    },
    {
        id: 'PACE_SINALIZACAO_DEF_TEMP',
        descricao: 'Sinalização definitiva compatível com geometria; sinalização temporária conforme projeto-tipo da concessionária (não só rótulo).',
        categoria: 'SEGURANCA',
    },
    {
        id: 'PACE_PLANO_CRONOGRAMA',
        descricao: 'Plano de Trabalho × interferência no tráfego × Cronograma (dias) × Sinalização temporária compatíveis.',
        categoria: 'EXECUCAO',
    },
    {
        id: 'PACE_ADMIN_AMBIENTAL_FUTURO',
        descricao: 'Requerimento/ART/Declaração; ambiental/PBA só correspondência básica; situação futura oficial × interferências.',
        categoria: 'DOCUMENTAL',
    },
];
exports.REQ_ACESSO_CLIENTE = [
    {
        id: 'ACESSO_REFS_IPR728',
        descricao: 'Aplicar IPR 728 e DNIT 7/2021 conforme configuração urbano/rural, pista simples/dupla, principal/marginal.',
        categoria: 'ESCOPO',
    },
    {
        id: 'ACESSO_GEOMETRIA_VISIBILIDADE',
        descricao: 'Geometria de entrada/saída e distâncias de visibilidade coerentes com velocidade e contexto do trecho.',
        categoria: 'SEGURANCA',
    },
    {
        id: 'ACESSO_FD_DOCS',
        descricao: 'Documentação mínima e FD/non aedificandi coerentes; ART vinculada ao acesso.',
        categoria: 'DOCUMENTAL',
    },
];
//# sourceMappingURL=checklistsCliente.js.map