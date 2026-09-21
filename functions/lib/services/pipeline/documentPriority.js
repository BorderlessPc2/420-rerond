"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rankDocumentoPrioridade = rankDocumentoPrioridade;
exports.sortDocumentosPorPrioridade = sortDocumentosPorPrioridade;
exports.selectDocumentosPorPrioridade = selectDocumentosPorPrioridade;
/**
 * Prioridade de inclusão quando há limite de PDFs/tokens.
 * Menor número = mais importante (entra primeiro).
 */
const PRIORIDADE_TIPO = {
    memorial_descritivo: 10,
    memorial: 10,
    planta_baixa: 20,
    perfil_ocupacao: 25,
    projeto_geometrico: 30,
    projeto_sinalizacao: 35,
    projeto_topografico: 40,
    projeto_drenagem: 45,
    projeto_terraplenagem: 50,
    projeto_pavimentacao: 55,
    art: 60,
    requerimento: 65,
    declaracao: 70,
    cronograma: 75,
    plano_trabalho: 80,
    especificacoes: 85,
    licenca_ambiental: 90,
    pba: 95,
    projeto_publicidade: 100,
};
const PRIORIDADE_NOME = [
    { re: /memorial/i, rank: 10 },
    { re: /planta/i, rank: 20 },
    { re: /perfil/i, rank: 25 },
    { re: /geometric|geom[eé]trico/i, rank: 30 },
    { re: /sinaliza/i, rank: 35 },
    { re: /\bart\b/i, rank: 60 },
    { re: /requerimento/i, rank: 65 },
    { re: /declara/i, rank: 70 },
    { re: /cronograma/i, rank: 75 },
];
/** Rank numérico (menor = prioridade maior). Default 500. */
function rankDocumentoPrioridade(input) {
    const tipo = (input.tipoDocumento || "").trim().toLowerCase();
    if (tipo && PRIORIDADE_TIPO[tipo] != null)
        return PRIORIDADE_TIPO[tipo];
    const nome = input.filename || "";
    for (const rule of PRIORIDADE_NOME) {
        if (rule.re.test(nome))
            return rule.rank;
    }
    return 500;
}
/**
 * Ordena documentos por prioridade técnica (estável: empate mantém ordem original).
 */
function sortDocumentosPorPrioridade(items) {
    return items
        .map((item, index) => ({ item, index, rank: rankDocumentoPrioridade(item) }))
        .sort((a, b) => a.rank - b.rank || a.index - b.index)
        .map((entry) => entry.item);
}
/**
 * Seleciona até maxCount documentos, priorizando peças técnicas.
 * Itens acima de maxBytesPerFile são omitidos com motivo de tamanho.
 */
function selectDocumentosPorPrioridade(items, options) {
    const maxBytes = options.maxBytesPerFile ?? Number.POSITIVE_INFINITY;
    const sorted = sortDocumentosPorPrioridade(items);
    const incluidos = [];
    const omitidos = [];
    for (const item of sorted) {
        const size = item.sizeBytes ?? 0;
        if (size > maxBytes) {
            omitidos.push({
                item,
                motivo: `${item.filename} (tamanho excedido; prioridade técnica não libera arquivo > limite)`,
            });
            continue;
        }
        if (incluidos.length >= options.maxCount) {
            omitidos.push({
                item,
                motivo: `${item.filename} (limite de ${options.maxCount} PDFs; prioridade menor que os incluídos)`,
            });
            continue;
        }
        incluidos.push(item);
    }
    return { incluidos, omitidos };
}
//# sourceMappingURL=documentPriority.js.map