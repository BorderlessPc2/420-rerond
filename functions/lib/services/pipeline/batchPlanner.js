"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planDocumentBatches = planDocumentBatches;
const estimateTokens_1 = require("./estimateTokens");
/**
 * Agrupa documentos em lotes sem estourar tokens/bytes estimados.
 * Itens maiores que o limite sozinhos formam lote unitário (caller deve avisar).
 */
function planDocumentBatches(items, options = {}) {
    const maxTokens = options.maxTokensPerBatch ?? 80_000;
    const maxBytes = options.maxBytesPerBatch ?? 15 * 1024 * 1024;
    const batches = [];
    let current = [];
    let tokens = 0;
    let bytes = 0;
    const flush = () => {
        if (current.length === 0)
            return;
        batches.push({
            batchIndex: batches.length,
            items: current,
            estimatedTokens: tokens,
            totalBytes: bytes,
        });
        current = [];
        tokens = 0;
        bytes = 0;
    };
    for (const item of items) {
        const itemTokens = typeof item.textChars === "number"
            ? Math.ceil(Math.max(0, item.textChars) / 4)
            : (0, estimateTokens_1.estimateTokensFromBytes)(item.sizeBytes);
        const itemBytes = item.sizeBytes || 0;
        const wouldExceed = current.length > 0 &&
            (tokens + itemTokens > maxTokens || bytes + itemBytes > maxBytes);
        if (wouldExceed)
            flush();
        current.push(item);
        tokens += itemTokens;
        bytes += itemBytes;
        if (itemTokens > maxTokens || itemBytes > maxBytes) {
            flush();
        }
    }
    flush();
    return batches;
}
//# sourceMappingURL=batchPlanner.js.map