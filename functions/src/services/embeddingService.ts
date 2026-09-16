/**
 * Embeddings + ranking semântico (RAG leve) para golden cases / feedbacks.
 * Usa a mesma OPENAI_API_KEY já configurada nas Functions.
 * Isolamento por tipoAnaliseId permanece fora deste módulo (filtros do caller).
 */
import { getOpenAIClient } from "./openaiService";

export const EMBEDDING_MODEL = "text-embedding-3-small";

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return -1;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  if (na === 0 || nb === 0) return -1;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function buildGoldenEmbeddingText(input: {
  codigo?: string;
  titulo?: string;
  analiseCorreta?: string | null;
  erroIa?: string | null;
  pares?: Array<{
    regraOuItem?: string | null;
    original?: string;
    correto?: string;
    justificativa?: string;
  }>;
}): string {
  const parts: string[] = [];
  if (input.codigo) parts.push(`Código: ${input.codigo}`);
  if (input.titulo) parts.push(`Título: ${input.titulo}`);
  if (input.analiseCorreta?.trim()) parts.push(`Correto: ${input.analiseCorreta.trim()}`);
  if (input.erroIa?.trim()) parts.push(`Evitar: ${input.erroIa.trim()}`);
  for (const par of input.pares ?? []) {
    const bits = [
      par.regraOuItem?.trim(),
      par.original?.trim() ? `Errado: ${par.original.trim()}` : null,
      par.correto?.trim() ? `Certo: ${par.correto.trim()}` : null,
      par.justificativa?.trim() ? `Porque: ${par.justificativa.trim()}` : null,
    ].filter(Boolean);
    if (bits.length) parts.push(bits.join(" | "));
  }
  return parts.join("\n").slice(0, 8000);
}

export function buildFeedbackEmbeddingText(input: {
  regraOuItem?: string;
  original?: string;
  correcao?: string;
  justificativa?: string;
}): string {
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

export function buildAnaliseQueryText(input: {
  tipoAnaliseId?: string | null;
  tipoAnaliseNome?: string | null;
  titulo?: string | null;
  descricao?: string | null;
  tipoObra?: string | null;
  rodovia?: string | null;
  kilometragem?: string | null;
  municipioEstado?: string | null;
  memorial?: string | null;
  faseProjeto?: string | null;
  tipoIntervencaoDetalhado?: string | null;
}): string {
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

export async function createEmbedding(text: string): Promise<number[]> {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const ai = getOpenAIClient();
  const res = await ai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: trimmed,
  });
  const vector = res.data[0]?.embedding;
  if (!vector?.length) {
    throw new Error("OpenAI embeddings não retornou vetor.");
  }
  return vector as number[];
}

export function rankBySimilarity<T extends { id: string }>(
  items: T[],
  queryEmbedding: number[],
  getEmbedding: (item: T) => number[] | null | undefined,
  maxItems: number,
): T[] {
  if (!queryEmbedding.length || maxItems <= 0) return items.slice(0, maxItems);

  const scored = items
    .map((item) => {
      const emb = getEmbedding(item);
      const score =
        emb && emb.length === queryEmbedding.length
          ? cosineSimilarity(queryEmbedding, emb)
          : -1;
      return { item, score };
    })
    .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));

  const withEmb = scored.filter((s) => s.score >= 0);
  if (withEmb.length === 0) return items.slice(0, maxItems);
  return withEmb.slice(0, maxItems).map((s) => s.item);
}
