"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listFeedbacksAprovadosParaAnalise = listFeedbacksAprovadosParaAnalise;
exports.buildFeedbackAprendizadoPromptBlock = buildFeedbackAprendizadoPromptBlock;
const firestore_1 = require("firebase-admin/firestore");
const embeddingService_1 = require("./embeddingService");
const COLLECTION = process.env.FIRESTORE_FEEDBACKS_COLLECTION?.trim() || "feedbacksAprendizado";
const DEFAULT_MAX_ITEMS = 12;
const DEFAULT_MAX_CHARS_FIELD = 700;
const DEFAULT_MAX_BLOCK_CHARS = 14000;
function truncate(value, max) {
    const trimmed = value.trim();
    if (trimmed.length <= max)
        return trimmed;
    return `${trimmed.slice(0, max - 1)}…`;
}
function toMs(value) {
    if (!value)
        return 0;
    if (typeof value === "object" && value !== null && "toMillis" in value) {
        const fn = value.toMillis;
        if (typeof fn === "function")
            return fn.call(value) ?? 0;
    }
    return 0;
}
function parseDoc(id, raw) {
    const status = String(raw.status ?? "");
    if (status !== "aprovado")
        return null;
    const tipoAnaliseId = typeof raw.tipoAnaliseId === "string" ? raw.tipoAnaliseId.trim() : "";
    if (!tipoAnaliseId)
        return null;
    const regraOuItem = String(raw.regraOuItem ?? "").trim();
    const original = String(raw.original ?? "").trim();
    const correcao = String(raw.correcao ?? "").trim();
    const justificativa = String(raw.justificativa ?? "").trim();
    if (!regraOuItem || !original || !correcao || !justificativa)
        return null;
    const embedding = Array.isArray(raw.embedding)
        ? raw.embedding.map(Number).filter((n) => Number.isFinite(n))
        : null;
    return {
        id,
        tipoAnaliseId,
        organizacaoId: typeof raw.organizacaoId === "string" && raw.organizacaoId.trim()
            ? raw.organizacaoId.trim()
            : null,
        regraOuItem,
        original,
        correcao,
        justificativa,
        status,
        updatedAtMs: toMs(raw.updatedAt) || toMs(raw.createdAt),
        createdAtMs: toMs(raw.createdAt),
        embedding: embedding && embedding.length > 0 ? embedding : null,
        embeddingModel: typeof raw.embeddingModel === "string" ? raw.embeddingModel : null,
    };
}
async function ensureEmbeddings(items) {
    const db = (0, firestore_1.getFirestore)();
    const out = [];
    for (const item of items) {
        if (item.embedding?.length &&
            (!item.embeddingModel || item.embeddingModel === embeddingService_1.EMBEDDING_MODEL)) {
            out.push(item);
            continue;
        }
        try {
            const text = (0, embeddingService_1.buildFeedbackEmbeddingText)(item);
            const embedding = await (0, embeddingService_1.createEmbedding)(text);
            await db.collection(COLLECTION).doc(item.id).set({
                embedding,
                embeddingModel: embeddingService_1.EMBEDDING_MODEL,
                embeddingUpdatedAt: new Date(),
            }, { merge: true });
            out.push({ ...item, embedding, embeddingModel: embeddingService_1.EMBEDDING_MODEL });
        }
        catch (err) {
            console.warn(`Falha ao gerar embedding do feedback ${item.id}:`, err);
            out.push(item);
        }
    }
    return out;
}
/**
 * Carrega feedbacks aprovados para injeção no prompt.
 * Salvaguardas: só aprovado; exige tipoAnaliseId; escopo org (null = genérico do tipo);
 * ranking semântico opcional (RAG) com fallback por recência.
 */
async function listFeedbacksAprovadosParaAnalise(params) {
    const tipoId = params.tipoAnaliseId.trim();
    if (!tipoId)
        return [];
    const maxItems = Math.max(1, Math.min(params.maxItems ?? DEFAULT_MAX_ITEMS, 20));
    const orgId = params.organizacaoId?.trim() || null;
    try {
        const db = (0, firestore_1.getFirestore)();
        const snap = await db
            .collection(COLLECTION)
            .where("status", "==", "aprovado")
            .limit(80)
            .get();
        let candidates = snap.docs
            .map((doc) => parseDoc(doc.id, doc.data()))
            .filter((item) => Boolean(item))
            .filter((item) => item.tipoAnaliseId === tipoId)
            .filter((item) => {
            if (!item.organizacaoId)
                return true;
            if (!orgId)
                return false;
            return item.organizacaoId === orgId;
        })
            .sort((a, b) => b.updatedAtMs - a.updatedAtMs || b.createdAtMs - a.createdAtMs);
        const queryText = params.queryText?.trim();
        if (!queryText) {
            return candidates.slice(0, maxItems);
        }
        try {
            const withEmb = await ensureEmbeddings(candidates);
            if (withEmb.length <= maxItems)
                return withEmb;
            const queryEmbedding = await (0, embeddingService_1.createEmbedding)(queryText);
            return (0, embeddingService_1.rankBySimilarity)(withEmb, queryEmbedding, (item) => item.embedding, maxItems);
        }
        catch (ragErr) {
            console.warn("RAG feedbacks falhou; fallback por recência:", ragErr);
            return candidates.slice(0, maxItems);
        }
    }
    catch (err) {
        console.warn("Falha ao carregar feedbacksAprendizado aprovados:", err);
        return [];
    }
}
function buildFeedbackAprendizadoPromptBlock(items, options) {
    if (!items.length)
        return "";
    const maxField = options?.maxCharsPerField ?? DEFAULT_MAX_CHARS_FIELD;
    const maxBlock = options?.maxBlockChars ?? DEFAULT_MAX_BLOCK_CHARS;
    const linhas = [
        "═══════════════════════════════════════",
        "APRENDIZADO VALIDADO (FEEDBACKS APROVADOS — MESMO TIPO)",
        "═══════════════════════════════════════",
        "Use somente como correção de interpretação para ESTE tipo de análise.",
        "NÃO generalize para outros tipos. NÃO invente normas. Em conflito com",
        "normas/PDFs anexados ou com o checklist do tipo, prevalecem normas + evidência documental.",
        "Feedback pendente/rejeitado/rascunho NÃO deve ser considerado (já filtrado).",
        "",
    ];
    items.forEach((item, index) => {
        linhas.push(`${index + 1}) Item/regra: ${truncate(item.regraOuItem, maxField)}`, `   - Errado (evitar): ${truncate(item.original, maxField)}`, `   - Correto (preferir): ${truncate(item.correcao, maxField)}`, `   - Justificativa: ${truncate(item.justificativa, maxField)}`, "");
    });
    let block = linhas.join("\n").trim();
    if (block.length > maxBlock) {
        block = `${block.slice(0, maxBlock - 1)}…`;
    }
    return block;
}
//# sourceMappingURL=feedbackAprendizadoService.js.map