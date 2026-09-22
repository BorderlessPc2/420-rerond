"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rankByContext = rankByContext;
function normalize(value) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}
function scoreText(text, query) {
    const haystack = normalize(text);
    const terms = normalize(query)
        .split(/\s+/)
        .filter((term) => term.length > 3);
    return terms.filter((term) => haystack.includes(term)).length;
}
function rankByContext(params) {
    if (params.maxItems <= 0)
        return [];
    const tipoId = params.tipoAnaliseId.trim();
    const sameType = params.items.filter((item) => item.tipoAnaliseId === tipoId);
    const pool = sameType.length > 0
        ? sameType
        : params.items.filter((item) => !item.tipoAnaliseId);
    return pool
        .map((item) => {
        const textScore = scoreText(item.text, params.query);
        const orgScore = item.organizacaoId && item.organizacaoId === params.organizacaoId ? 4 : 0;
        const concessionariaScore = item.concessionariaId && item.concessionariaId === params.concessionariaId
            ? 3
            : 0;
        const recencyScore = (item.updatedAtMs ?? item.createdAtMs ?? 0) / 1_000_000_000_000;
        return {
            item,
            textScore,
            score: textScore + orgScore + concessionariaScore + recencyScore,
        };
    })
        .filter((entry) => {
        if (entry.textScore >= (params.minTextScore ?? 1))
            return true;
        if (entry.item.organizacaoId && entry.item.organizacaoId === params.organizacaoId) {
            return true;
        }
        return Boolean(entry.item.concessionariaId &&
            entry.item.concessionariaId === params.concessionariaId);
    })
        .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
        .slice(0, params.maxItems)
        .map((entry) => entry.item);
}
//# sourceMappingURL=rankByContext.js.map