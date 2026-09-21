"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateTokensFromText = estimateTokensFromText;
exports.estimateTokensFromBytes = estimateTokensFromBytes;
exports.sumEstimatedTokens = sumEstimatedTokens;
/** Estimativa conservadora: ~4 caracteres por token (texto PT/EN). */
function estimateTokensFromText(text) {
    const len = text?.length ?? 0;
    if (len <= 0)
        return 0;
    return Math.ceil(len / 4);
}
/**
 * Heurística para PDF binário no Responses API.
 * Antes: bytes/3 (exageradamente pessimista → quase 1 PDF por lote).
 * Agora: bytes/40 — aproxima custo real de PDFs mistos (texto + plantas)
 * e permite agrupar vários documentos no mesmo lote.
 */
function estimateTokensFromBytes(sizeBytes) {
    if (!sizeBytes || sizeBytes <= 0)
        return 0;
    return Math.ceil(sizeBytes / 40);
}
function sumEstimatedTokens(parts) {
    return parts.reduce((acc, part) => {
        if (part.text)
            return acc + estimateTokensFromText(part.text);
        if (typeof part.sizeBytes === "number") {
            return acc + estimateTokensFromBytes(part.sizeBytes);
        }
        return acc;
    }, 0);
}
//# sourceMappingURL=estimateTokens.js.map