export type TextChunk = {
  index: number;
  text: string;
  startChar: number;
  endChar: number;
};

/**
 * Divide texto em chunks por tamanho máximo de caracteres, preferindo quebras em parágrafo.
 */
export function chunkText(
  text: string,
  maxChars = 12_000,
  overlapChars = 200,
): TextChunk[] {
  const source = text ?? "";
  if (!source) return [];
  if (maxChars <= 0) throw new Error("maxChars must be > 0");
  if (overlapChars < 0) throw new Error("overlapChars must be >= 0");
  if (overlapChars >= maxChars) {
    throw new Error("overlapChars must be < maxChars");
  }

  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < source.length) {
    let end = Math.min(start + maxChars, source.length);
    if (end < source.length) {
      const slice = source.slice(start, end);
      const breakAt = Math.max(
        slice.lastIndexOf("\n\n"),
        slice.lastIndexOf("\n"),
        slice.lastIndexOf(". "),
      );
      if (breakAt > maxChars * 0.4) {
        end = start + breakAt + 1;
      }
    }
    const chunkTextValue = source.slice(start, end);
    chunks.push({
      index,
      text: chunkTextValue,
      startChar: start,
      endChar: end,
    });
    index += 1;
    if (end >= source.length) break;
    start = Math.max(0, end - overlapChars);
  }

  return chunks;
}
