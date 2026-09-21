import {
  estimateTokensFromBytes,
} from "./estimateTokens";
import type { DocumentBatchItem, PlannedBatch } from "./types";

export type BatchPlannerOptions = {
  /** Orçamento aproximado de tokens por lote (default ~280k — janela ampla). */
  maxTokensPerBatch?: number;
  /**
   * Orçamento de bytes dos PDFs do projeto por lote (default 28MB).
   * Deixa folga para normas + prompt dentro do teto OpenAI (~50MB/request).
   */
  maxBytesPerBatch?: number;
  /** Máx. de arquivos/partes por lote (default 6) — evita request gigante. */
  maxItemsPerBatch?: number;
};

/**
 * Agrupa documentos em lotes sem estourar tokens/bytes/itens estimados.
 * Defaults pensados para gpt-4.1 + teto OpenAI de ~50MB por request
 * (normas anexadas fora deste orçamento).
 * Itens maiores que o limite sozinhos formam lote unitário (caller deve avisar).
 */
export function planDocumentBatches(
  items: DocumentBatchItem[],
  options: BatchPlannerOptions = {},
): PlannedBatch[] {
  const maxTokens = options.maxTokensPerBatch ?? 280_000;
  const maxBytes = options.maxBytesPerBatch ?? 28 * 1024 * 1024;
  const maxItems = options.maxItemsPerBatch ?? 6;

  const batches: PlannedBatch[] = [];
  let current: DocumentBatchItem[] = [];
  let tokens = 0;
  let bytes = 0;

  const flush = () => {
    if (current.length === 0) return;
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
    const itemTokens =
      typeof item.textChars === "number"
        ? Math.ceil(Math.max(0, item.textChars) / 4)
        : estimateTokensFromBytes(item.sizeBytes);
    const itemBytes = item.sizeBytes || 0;

    const wouldExceed =
      current.length > 0 &&
      (current.length >= maxItems ||
        tokens + itemTokens > maxTokens ||
        bytes + itemBytes > maxBytes);

    if (wouldExceed) flush();

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
