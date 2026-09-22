"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selecionarChunksRelevantesSync = selecionarChunksRelevantesSync;
exports.selecionarChunksRelevantes = selecionarChunksRelevantes;
exports.buildDocumentRetrievalPromptBlock = buildDocumentRetrievalPromptBlock;
function normalize(value) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}
function termsFrom(value) {
    return normalize(value)
        .split(/\W+/)
        .filter((term) => term.length > 3);
}
function documentTypeBoost(tipoDocumento) {
    const tipo = normalize(tipoDocumento);
    if (tipo.includes("memorial"))
        return 4;
    if (tipo.includes("planta"))
        return 3;
    if (tipo.includes("perfil"))
        return 3;
    if (tipo.includes("art"))
        return 2;
    if (tipo.includes("outro") || tipo.includes("desconhecido"))
        return 0;
    return 1;
}
function scoreChunk(chunk, query, checklistTerms) {
    const haystack = normalize(`${chunk.tipoDocumento} ${chunk.documentName} ${chunk.text}`);
    const checklistScore = checklistTerms.filter((term) => haystack.includes(normalize(term))).length * 3;
    const queryScore = termsFrom(query).filter((term) => haystack.includes(term)).length;
    return checklistScore + queryScore + documentTypeBoost(chunk.tipoDocumento);
}
function truncate(value, maxChars) {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (normalized.length <= maxChars)
        return normalized;
    return `${normalized.slice(0, maxChars - 1)}…`;
}
function selecionarChunksRelevantesSync(params) {
    if (params.maxChunks <= 0)
        return [];
    return [...params.chunks]
        .map((chunk) => ({ chunk, score: scoreChunk(chunk, params.query, params.checklistTerms) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => {
        if (b.score !== a.score)
            return b.score - a.score;
        if (a.chunk.documentName !== b.chunk.documentName) {
            return a.chunk.documentName.localeCompare(b.chunk.documentName);
        }
        return (a.chunk.pageStart ?? 0) - (b.chunk.pageStart ?? 0);
    })
        .slice(0, params.maxChunks)
        .map((item) => ({ ...item.chunk, score: item.score }));
}
async function selecionarChunksRelevantes(params) {
    return selecionarChunksRelevantesSync(params);
}
function buildDocumentRetrievalPromptBlock(chunks, options = {}) {
    if (!chunks.length)
        return "";
    const maxCharsPerChunk = options.maxCharsPerChunk ?? 1200;
    const maxBlockChars = options.maxBlockChars ?? 9000;
    const lines = [
        "═══════════════════════════════════════",
        "TRECHOS DOCUMENTAIS RECUPERADOS (RAG)",
        "═══════════════════════════════════════",
        "Use estes trechos como pistas textuais dos PDFs do projeto.",
        "Eles NÃO substituem a análise dos PDFs anexados; em conflito, prevalece a evidência direta do PDF/norma.",
        "Ao citar um trecho, referencie arquivo e página quando informado.",
        "",
    ];
    chunks.forEach((chunk, index) => {
        const page = chunk.pageStart && chunk.pageEnd
            ? chunk.pageStart === chunk.pageEnd
                ? `p. ${chunk.pageStart}`
                : `p. ${chunk.pageStart}-${chunk.pageEnd}`
            : "página não identificada";
        lines.push(`${index + 1}) ${chunk.documentName} (${chunk.tipoDocumento}; ${page})`, truncate(chunk.text, maxCharsPerChunk), "");
    });
    const block = lines.join("\n").trim();
    return block.length <= maxBlockChars ? block : `${block.slice(0, maxBlockChars - 1)}…`;
}
//# sourceMappingURL=documentRetrieval.js.map