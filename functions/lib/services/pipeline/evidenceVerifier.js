"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeEvidenceChecklistItem = normalizeEvidenceChecklistItem;
exports.verificarEvidencias = verificarEvidencias;
function hasContent(value) {
    return Boolean(value && value.trim().length >= 3);
}
function readString(raw, keys) {
    for (const key of keys) {
        const value = raw[key];
        if (typeof value === "string" && value.trim())
            return value.trim();
    }
    return undefined;
}
function normalizeStatus(value) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();
}
function isConforme(status) {
    const normalized = normalizeStatus(status);
    return ["CONFORME", "OK", "APROVADO", "SIM", "PRESENTE"].includes(normalized);
}
function normalizeEvidenceChecklistItem(item, index) {
    if (!item || typeof item !== "object")
        return null;
    const raw = item;
    const id = readString(raw, ["id", "codigo", "item", "regraId", "checklistId"]) ??
        `item-${index + 1}`;
    const status = readString(raw, ["status", "situacao", "resultado", "veredito"]) ?? "INDEFINIDO";
    return {
        id,
        status,
        evidencia: readString(raw, ["evidencia", "evidência", "evidencias", "evidências"]),
        localizacao: readString(raw, [
            "localizacao",
            "localização",
            "arquivoPagina",
            "pagina",
            "página",
        ]),
        justificativa: readString(raw, ["justificativa", "motivo", "analise", "análise"]),
        norma: readString(raw, ["norma", "normaRelacionada", "fundamentacao", "fundamentação"]),
    };
}
function verificarEvidencias(itens) {
    const normalized = itens
        .map((item, index) => "id" in Object(item) && "status" in Object(item)
        ? item
        : normalizeEvidenceChecklistItem(item, index))
        .filter((item) => Boolean(item));
    const itensFrageis = normalized
        .filter((item) => {
        if (isConforme(item.status))
            return false;
        return (!hasContent(item.evidencia) ||
            !hasContent(item.localizacao) ||
            !hasContent(item.justificativa) ||
            !hasContent(item.norma));
    })
        .map((item) => item.id);
    const totalItens = normalized.length;
    const completos = totalItens - itensFrageis.length;
    return {
        totalItens,
        itensFrageis,
        percentualComEvidenciaCompleta: totalItens === 0 ? 0 : completos / totalItens,
    };
}
//# sourceMappingURL=evidenceVerifier.js.map