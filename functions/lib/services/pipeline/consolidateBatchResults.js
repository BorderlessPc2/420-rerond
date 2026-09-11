"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeChecklistItems = mergeChecklistItems;
exports.mergeDadosExtraidos = mergeDadosExtraidos;
exports.mergeConferenciaInputs = mergeConferenciaInputs;
exports.consolidatePareceres = consolidatePareceres;
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
/** Parecer consolidado sem segunda chamada à API (MVP Sprint 9). */
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
//# sourceMappingURL=consolidateBatchResults.js.map