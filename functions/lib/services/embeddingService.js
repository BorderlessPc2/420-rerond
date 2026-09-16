"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMBEDDING_MODEL = void 0;
exports.cosineSimilarity = cosineSimilarity;
exports.buildGoldenEmbeddingText = buildGoldenEmbeddingText;
exports.buildFeedbackEmbeddingText = buildFeedbackEmbeddingText;
exports.buildAnaliseQueryText = buildAnaliseQueryText;
exports.createEmbedding = createEmbedding;
exports.rankBySimilarity = rankBySimilarity;
/**
 * Embeddings + ranking semântico (RAG leve) para golden cases / feedbacks.
 * Usa a mesma OPENAI_API_KEY já configurada nas Functions.
 * Isolamento por tipoAnaliseId permanece fora deste módulo (filtros do caller).
 */
const openaiService_1 = require("./openaiService");
exports.EMBEDDING_MODEL = "text-embedding-3-small";
function cosineSimilarity(a, b) {
    if (!a.length || !b.length || a.length !== b.length)
        return -1;
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    if (na === 0 || nb === 0)
        return -1;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
function buildGoldenEmbeddingText(input) {
    const parts = [];
    if (input.codigo)
        parts.push(`Código: ${input.codigo}`);
    if (input.titulo)
        parts.push(`Título: ${input.titulo}`);
    if (input.analiseCorreta?.trim())
        parts.push(`Correto: ${input.analiseCorreta.trim()}`);
    if (input.erroIa?.trim())
        parts.push(`Evitar: ${input.erroIa.trim()}`);
    for (const par of input.pares ?? []) {
        const bits = [
            par.regraOuItem?.trim(),
            par.original?.trim() ? `Errado: ${par.original.trim()}` : null,
            par.correto?.trim() ? `Certo: ${par.correto.trim()}` : null,
            par.justificativa?.trim() ? `Porque: ${par.justificativa.trim()}` : null,
        ].filter(Boolean);
        if (bits.length)
            parts.push(bits.join(" | "));
    }
    return parts.join("\n").slice(0, 8000);
}
function buildFeedbackEmbeddingText(input) {
    return [
        input.regraOuItem ? `Item: ${input.regraOuItem}` : null,
        input.original ? `Errado: ${input.original}` : null,
        input.correcao ? `Correto: ${input.correcao}` : null,
        input.justificativa ? `Porque: ${input.justificativa}` : null,
    ]
        .filter(Boolean)
        .join("\n")
        .slice(0, 4000);
}
function buildAnaliseQueryText(input) {
    return [
        input.tipoAnaliseId ? `Tipo: ${input.tipoAnaliseId}` : null,
        input.tipoAnaliseNome ? `Nome tipo: ${input.tipoAnaliseNome}` : null,
        input.titulo ? `Título: ${input.titulo}` : null,
        input.tipoObra ? `Obra: ${input.tipoObra}` : null,
        input.faseProjeto ? `Fase: ${input.faseProjeto}` : null,
        input.tipoIntervencaoDetalhado
            ? `Intervenção: ${input.tipoIntervencaoDetalhado}`
            : null,
        input.rodovia ? `Rodovia: ${input.rodovia}` : null,
        input.kilometragem ? `Km: ${input.kilometragem}` : null,
        input.municipioEstado ? `Município: ${input.municipioEstado}` : null,
        input.memorial ? `Memorial: ${input.memorial}` : null,
        input.descricao ? `Descrição: ${input.descricao}` : null,
    ]
        .filter(Boolean)
        .join("\n")
        .slice(0, 6000);
}
async function createEmbedding(text) {
    const trimmed = text.trim();
    if (!trimmed)
        return [];
    const ai = (0, openaiService_1.getOpenAIClient)();
    const res = await ai.embeddings.create({
        model: exports.EMBEDDING_MODEL,
        input: trimmed,
    });
    const vector = res.data[0]?.embedding;
    if (!vector?.length) {
        throw new Error("OpenAI embeddings não retornou vetor.");
    }
    return vector;
}
function rankBySimilarity(items, queryEmbedding, getEmbedding, maxItems) {
    if (!queryEmbedding.length || maxItems <= 0)
        return items.slice(0, maxItems);
    const scored = items
        .map((item) => {
        const emb = getEmbedding(item);
        const score = emb && emb.length === queryEmbedding.length
            ? cosineSimilarity(queryEmbedding, emb)
            : -1;
        return { item, score };
    })
        .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));
    const withEmb = scored.filter((s) => s.score >= 0);
    if (withEmb.length === 0)
        return items.slice(0, maxItems);
    return withEmb.slice(0, maxItems).map((s) => s.item);
}
//# sourceMappingURL=embeddingService.js.map