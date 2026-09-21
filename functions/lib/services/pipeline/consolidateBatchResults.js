"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeChecklistItems = mergeChecklistItems;
exports.mergeDadosExtraidos = mergeDadosExtraidos;
exports.mergeConferenciaInputs = mergeConferenciaInputs;
exports.consolidatePareceres = consolidatePareceres;
exports.buildSynthesizeParecerPrompt = buildSynthesizeParecerPrompt;
exports.summarizeChecklistForSynthesis = summarizeChecklistForSynthesis;
const STATUS_RANK = {
    NAO_CONFORME: 3,
    INFORMACAO_AUSENTE: 2,
    OK: 1,
};
function statusRank(status) {
    const key = String(status || "").toUpperCase();
    return STATUS_RANK[key] ?? 0;
}
function pickRicherText(a, b) {
    const sa = typeof a === "string" ? a.trim() : "";
    const sb = typeof b === "string" ? b.trim() : "";
    if (sb.length > sa.length)
        return sb || undefined;
    return sa || undefined;
}
/** Mescla checklists de vários lotes: pior status vence; textos mais ricos preferidos. */
function mergeChecklistItems(arrays) {
    const order = [];
    const byId = new Map();
    for (const arr of arrays) {
        for (const raw of arr) {
            if (!raw || typeof raw !== "object")
                continue;
            const row = raw;
            const id = String(row.item ?? "").trim();
            if (!id)
                continue;
            const prev = byId.get(id);
            if (!prev) {
                byId.set(id, { ...row });
                order.push(id);
                continue;
            }
            const nextRank = statusRank(row.status);
            const prevRank = statusRank(prev.status);
            const winner = nextRank > prevRank ? row : prev;
            const loser = nextRank > prevRank ? prev : row;
            byId.set(id, {
                ...loser,
                ...winner,
                status: winner.status,
                situacaoEncontrada: pickRicherText(winner.situacaoEncontrada, loser.situacaoEncontrada),
                fundamentacao: pickRicherText(winner.fundamentacao, loser.fundamentacao),
                orientacao: pickRicherText(winner.orientacao, loser.orientacao),
            });
        }
    }
    return order.map((id) => byId.get(id));
}
function mergeDadosExtraidos(list) {
    const out = {};
    let any = false;
    for (const item of list) {
        if (!item || typeof item !== "object")
            continue;
        for (const [key, value] of Object.entries(item)) {
            if (value === null || value === undefined || value === "")
                continue;
            const prev = out[key];
            if (prev === null || prev === undefined || prev === "") {
                out[key] = value;
                any = true;
            }
            else if (typeof value === "string" && typeof prev === "string" && value.length > prev.length) {
                out[key] = value;
            }
        }
    }
    return any ? out : null;
}
function confRank(row) {
    const status = String(row.status || "").toUpperCase();
    let rank = status === "DIVERGENTE" ? 3 : status === "COMPATIVEL" ? 1 : 2;
    if (row.evidencia && typeof row.evidencia === "object" && row.evidencia.arquivo) {
        rank += 1;
    }
    return rank;
}
/** Mescla conferência por `campo`; prioriza DIVERGENTE e evidência com arquivo. */
function mergeConferenciaInputs(arrays) {
    const order = [];
    const byCampo = new Map();
    for (const arr of arrays) {
        for (const raw of arr) {
            if (!raw || typeof raw !== "object")
                continue;
            const row = raw;
            const campo = String(row.campo ?? "")
                .trim()
                .toLowerCase();
            if (!campo)
                continue;
            const prev = byCampo.get(campo);
            if (!prev) {
                byCampo.set(campo, { ...row });
                order.push(campo);
                continue;
            }
            if (confRank(row) > confRank(prev)) {
                byCampo.set(campo, { ...row });
            }
        }
    }
    return order.map((c) => byCampo.get(c));
}
/** Parecer consolidado sem segunda chamada à API (fallback). */
function consolidatePareceres(batches) {
    if (batches.length === 0)
        return "";
    if (batches.length === 1)
        return batches[0].parecer || "";
    return batches
        .map((b, i) => {
        const files = b.filenames.length ? b.filenames.join(", ") : "sem arquivos";
        const body = (b.parecer || "").trim() || "(sem parecer neste lote)";
        return `## LOTE ${i + 1}/${batches.length} (${files})\n\n${body}`;
    })
        .join("\n\n---\n\n");
}
/** Prompt de síntese: une pareceres de lotes/partes em um único texto coeso (sem reenviar PDFs). */
function buildSynthesizeParecerPrompt(batches, checklistSummary) {
    const lotes = consolidatePareceres(batches);
    const checklistPart = checklistSummary?.trim()
        ? `\nCHECKLIST CONSOLIDADO (resumo):\n${checklistSummary.trim().slice(0, 6000)}\n`
        : "";
    return `Você consolidará pareceres técnicos de ${batches.length} passagens da MESMA solicitação em UM parecer final coeso.

Regras:
- Unifique conclusões; não repita "LOTE 1/LOTE 2" ou "PARTE 1/PARTE 2" no texto final.
- Partes do mesmo arquivo (sufixo __parte-N) são o MESMO documento — una a leitura como um memorial/planta contínuo.
- Se houver conflito entre lotes, explicite a divergência e indique qual documento sustenta cada lado.
- Prefira NAO_CONFORME / INFORMACAO_AUSENTE apenas quando nenhuma parte trouxe a evidência.
- Mantenha tom técnico e fundamentação normativa já presente.
- Não invente fatos que não apareçam nos pareceres dos lotes.
- Responda APENAS com o texto do parecer final (markdown permitido), sem JSON.
${checklistPart}
PARECERES POR PASSAGEM:
${lotes}`;
}
/** Resume itens de checklist para o prompt de síntese. */
function summarizeChecklistForSynthesis(checklist, maxItems = 40) {
    const lines = [];
    for (const raw of checklist.slice(0, maxItems)) {
        if (!raw || typeof raw !== "object")
            continue;
        const row = raw;
        const item = String(row.item ?? "").trim();
        if (!item)
            continue;
        const status = String(row.status ?? "").trim();
        const sit = typeof row.situacaoEncontrada === "string" ? row.situacaoEncontrada.trim() : "";
        lines.push(`- [${status}] ${item}${sit ? `: ${sit.slice(0, 180)}` : ""}`);
    }
    if (checklist.length > maxItems) {
        lines.push(`… (+${checklist.length - maxItems} itens)`);
    }
    return lines.join("\n");
}
//# sourceMappingURL=consolidateBatchResults.js.map