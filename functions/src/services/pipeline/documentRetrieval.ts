export interface DocumentChunk {
  id: string;
  documentName: string;
  tipoDocumento: string;
  text: string;
  pageStart?: number;
  pageEnd?: number;
}

export interface RetrievedChunk extends DocumentChunk {
  score?: number;
  lexicalScore?: number;
  semanticScore?: number | null;
  combinedScore?: number;
  thresholdPassed?: boolean;
  selectionReason?: "lexical-checklist" | "lexical-query" | "semantic";
}

export interface SelecionarChunksParams {
  chunks: DocumentChunk[];
  query: string;
  checklistTerms: string[];
  maxChunks: number;
  maxChunksPerDocument?: number;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function termsFrom(value: string): string[] {
  return normalize(value)
    .split(/\W+/)
    .filter((term) => term.length > 3);
}

function documentTypeBoost(tipoDocumento: string): number {
  const tipo = normalize(tipoDocumento);
  if (tipo.includes("memorial")) return 4;
  if (tipo.includes("planta")) return 3;
  if (tipo.includes("perfil")) return 3;
  if (tipo.includes("art")) return 2;
  if (tipo.includes("outro") || tipo.includes("desconhecido")) return 0;
  return 1;
}

function checklistTermsForChunk(chunk: DocumentChunk, checklistTerms: string[]): number {
  const haystack = normalize(`${chunk.tipoDocumento} ${chunk.documentName} ${chunk.text}`);
  return checklistTerms.filter((term) => haystack.includes(normalize(term))).length;
}

function scoreChunk(chunk: DocumentChunk, query: string, checklistTerms: string[]): number {
  const haystack = normalize(`${chunk.tipoDocumento} ${chunk.documentName} ${chunk.text}`);
  const checklistScore = checklistTermsForChunk(chunk, checklistTerms) * 3;
  const queryScore = termsFrom(query).filter((term) => haystack.includes(term)).length;
  return checklistScore + queryScore + documentTypeBoost(chunk.tipoDocumento);
}

export interface RetrievalScoreInput {
  lexicalScore: number;
  semanticScore?: number | null;
}

export interface RetrievalScore {
  lexicalScore: number;
  semanticScore: number | null;
  combinedScore: number;
  thresholdPassed: boolean;
}

export function combineRetrievalScores(input: RetrievalScoreInput): RetrievalScore {
  const lexical = Math.max(0, input.lexicalScore);
  const semantic = input.semanticScore ?? 0;
  const lexicalNormalized = Math.min(1, lexical / 12);
  const combinedScore = lexicalNormalized * 0.4 + Math.max(-1, Math.min(1, semantic)) * 0.6;
  return {
    lexicalScore: lexical,
    semanticScore: input.semanticScore ?? null,
    combinedScore,
    thresholdPassed: combinedScore >= 0.45,
  };
}

function truncate(value: string, maxChars: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars - 1)}…`;
}

export function selecionarChunksRelevantesSync(
  params: SelecionarChunksParams,
): RetrievedChunk[] {
  if (params.maxChunks <= 0) return [];

  const maxPerDocument = params.maxChunksPerDocument ?? params.maxChunks;
  const selected: RetrievedChunk[] = [];
  const counts = new Map<string, number>();
  const ranked = [...params.chunks]
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, params.query, params.checklistTerms) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.chunk.documentName !== b.chunk.documentName) {
        return a.chunk.documentName.localeCompare(b.chunk.documentName);
      }
      return (a.chunk.pageStart ?? 0) - (b.chunk.pageStart ?? 0);
    });

  for (const item of ranked) {
    const count = counts.get(item.chunk.documentName) ?? 0;
    if (count >= maxPerDocument) continue;
    const retrievalScore = combineRetrievalScores({
      lexicalScore: item.score,
      semanticScore: null,
    });
    selected.push({
      ...item.chunk,
      score: item.score,
      ...retrievalScore,
      thresholdPassed: true,
      selectionReason:
        checklistTermsForChunk(item.chunk, params.checklistTerms) > 0
          ? "lexical-checklist"
          : "lexical-query",
    });
    counts.set(item.chunk.documentName, count + 1);
    if (selected.length >= params.maxChunks) break;
  }
  return selected;
}

export async function selecionarChunksRelevantes(
  params: SelecionarChunksParams,
): Promise<RetrievedChunk[]> {
  return selecionarChunksRelevantesSync(params);
}

export function buildDocumentRetrievalPromptBlock(
  chunks: RetrievedChunk[],
  options: { maxCharsPerChunk?: number; maxBlockChars?: number } = {},
): string {
  if (!chunks.length) return "";

  const maxCharsPerChunk = options.maxCharsPerChunk ?? 1200;
  const maxBlockChars = options.maxBlockChars ?? 9000;
  const lines = [
    "═══════════════════════════════════════",
    "TRECHOS DOCUMENTAIS RECUPERADOS (RAG)",
    "═══════════════════════════════════════",
    "Use estes trechos como pistas textuais dos PDFs do projeto.",
    "Eles NÃO substituem a análise dos PDFs anexados; em conflito, prevalece a evidência direta do PDF/norma.",
    "Ao citar um trecho, referencie arquivo e página quando informado.",
    "",
  ];

  chunks.forEach((chunk, index) => {
    const page =
      chunk.pageStart && chunk.pageEnd
        ? chunk.pageStart === chunk.pageEnd
          ? `p. ${chunk.pageStart}`
          : `p. ${chunk.pageStart}-${chunk.pageEnd}`
        : "página não identificada";
    lines.push(
      `${index + 1}) ${chunk.documentName} (${chunk.tipoDocumento}; ${page})`,
      truncate(chunk.text, maxCharsPerChunk),
      "",
    );
  });

  const block = lines.join("\n").trim();
  return block.length <= maxBlockChars ? block : `${block.slice(0, maxBlockChars - 1)}…`;
}
