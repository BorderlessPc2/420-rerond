/** Estimativa conservadora: ~4 caracteres por token (texto PT/EN). */
export function estimateTokensFromText(text: string): number {
  const len = text?.length ?? 0;
  if (len <= 0) return 0;
  return Math.ceil(len / 4);
}

/** Heurística para PDF binário: ~1 token por 3 bytes (pior caso texto denso). */
export function estimateTokensFromBytes(sizeBytes: number): number {
  if (!sizeBytes || sizeBytes <= 0) return 0;
  return Math.ceil(sizeBytes / 3);
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
