/** Estimativa conservadora: ~4 caracteres por token (texto PT/EN). */
export function estimateTokensFromText(text: string): number {
  const len = text?.length ?? 0;
  if (len <= 0) return 0;
  return Math.ceil(len / 4);
}

/**
 * Heurística para PDF binário no Responses API.
 * Antes: bytes/3 (exageradamente pessimista → quase 1 PDF por lote).
 * Agora: bytes/40 — aproxima custo real de PDFs mistos (texto + plantas)
 * e permite agrupar vários documentos no mesmo lote.
 */
export function estimateTokensFromBytes(sizeBytes: number): number {
  if (!sizeBytes || sizeBytes <= 0) return 0;
  return Math.ceil(sizeBytes / 40);
}

export function sumEstimatedTokens(
  parts: Array<{ text?: string; sizeBytes?: number }>,
): number {
  return parts.reduce((acc, part) => {
    if (part.text) return acc + estimateTokensFromText(part.text);
    if (typeof part.sizeBytes === "number") {
      return acc + estimateTokensFromBytes(part.sizeBytes);
    }
    return acc;
  }, 0);
}
