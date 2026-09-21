/** Tipos de telemetria / planejamento da Sprint 9 (sem chamar OpenAI). */

export type PipelineStage =
  | "prep"
  | "extract"
  | "chunk"
  | "analyze"
  | "consolidate"
  | "final";

export type AnaliseTelemetry = {
  durationMs?: number;
  totalBytes?: number;
  tokensUsed?: number | null;
  filesIncluded?: number;
  filesOmitted?: number;
  batchCount?: number;
  normasPdfCount?: number;
  normasCustomPdfIds?: string[];
  normasCustomPdfFalhas?: string[];
  failedStage?: PipelineStage | string | null;
  errorCode?: string | null;
};

export type DocumentBatchItem = {
  id: string;
  filename: string;
  sizeBytes: number;
  /** Texto ou marcador; buffers binários usam sizeBytes no planner. */
  textChars?: number;
  /** Tipagem do anexo (para prioridade de omissão). */
  tipoDocumento?: string;
};

export type PlannedBatch = {
  batchIndex: number;
  items: DocumentBatchItem[];
  estimatedTokens: number;
  totalBytes: number;
};
