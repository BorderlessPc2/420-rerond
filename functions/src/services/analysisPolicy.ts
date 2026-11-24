export type AnalysisFailureCategory =
  | "insufficient_credits" | "billing_disabled" | "quota_exceeded" | "rate_limit"
  | "provider_timeout" | "provider_unavailable" | "context_window" | "missing_api_key"
  | "invalid_input" | "storage_error" | "connection_error" | "unknown";

export type ClassifiedAnalysisFailure = {
  category: AnalysisFailureCategory; code: string; message: string;
  retryable: boolean; splitAllowed: boolean;
};

export const JOB_LIMITS = {
  uploadedMs: 10 * 60_000, queuedMs: 10 * 60_000, extractingMs: 15 * 60_000,
  analyzingMs: 20 * 60_000, generatingReportMs: 15 * 60_000,
  heartbeatStaleMs: 5 * 60_000, absoluteDeadlineMs: 45 * 60_000,
  maxRetries: 3, maxContinuations: 2, maxProviderCalls: 24,
  manualRetryCooldownMs: 30_000, manualRetryBlockMs: 60_000,
} as const;

const messageOf = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (!error || typeof error !== "object") return String(error);
  const raw = error as Record<string, unknown>;
  const response = raw.response && typeof raw.response === "object" ? raw.response as Record<string, unknown> : null;
  const data = response?.data && typeof response.data === "object" ? response.data as Record<string, unknown> : null;
  const nested = data?.error && typeof data.error === "object" ? data.error as Record<string, unknown> : null;
  return [raw.code, raw.type, raw.status, raw.statusCode, raw.message, nested?.code, nested?.type, nested?.message].filter(Boolean).join(" ");
};

const result = (category: AnalysisFailureCategory, code: string, message: string, retryable = false, splitAllowed = false): ClassifiedAnalysisFailure => ({ category, code, message, retryable, splitAllowed });

export function classifyAnalysisError(error: unknown): ClassifiedAnalysisFailure {
  const text = messageOf(error).toLowerCase();
  if (/insufficient_quota|insufficient[_ ]credits|insufficient[_ ]funds/.test(text)) return result("insufficient_credits", "insufficient_credits", "A análise foi bloqueada porque o provedor de IA está sem créditos ou saldo disponível.");
  if (/billing_hard_limit|billing[_ ]disabled|payment required|billing not active/.test(text)) return result("billing_disabled", "billing_disabled", "A análise foi bloqueada porque o billing do provedor de IA está indisponível.");
  if (/quota_exceeded|quota exceeded|limit reached/.test(text)) return result("quota_exceeded", "quota_exceeded", "A cota do provedor de IA foi atingida. Configure uma cota maior antes de tentar novamente.");
  if (/429|rate limit|too many requests/.test(text)) return result("rate_limit", "rate_limit", "Limite temporário do provedor de IA. Aguarde e tente novamente.", true, true);
  if (/context_length|context length|context window|maximum context/.test(text)) return result("context_window", "context_window", "O volume de documentos ultrapassou a janela de contexto.", false, true);
  if (/api key|authentication|unauthorized|\b401\b/.test(text)) return result("missing_api_key", "missing_api_key", "A chave do provedor de IA está ausente ou inválida.");
  if (/timeout|\b408\b/.test(text)) return result("provider_timeout", "provider_timeout", "O provedor de IA demorou além do limite.", true);
  if (/\b502\b|\b503\b|\b504\b|temporarily unavailable/.test(text)) return result("provider_unavailable", "provider_unavailable", "O provedor de IA está temporariamente indisponível.", true);
  if (/network|fetch failed|connection|\beconn/.test(text)) return result("connection_error", "connection_error", "Não foi possível conectar ao provedor de IA.", true);
  return result("unknown", "analysis_failed", messageOf(error) || "Erro desconhecido na análise.");
}

export function isJobStale(state: string, heartbeatAtMs: number, nowMs = Date.now()): boolean {
  const limits: Record<string, number> = { uploaded: JOB_LIMITS.uploadedMs, queued: JOB_LIMITS.queuedMs, extracting: JOB_LIMITS.extractingMs, analyzing: JOB_LIMITS.analyzingMs, generating_report: JOB_LIMITS.generatingReportMs, retry_waiting: JOB_LIMITS.queuedMs, continuation_waiting: JOB_LIMITS.queuedMs };
  return Boolean(limits[state] && nowMs - heartbeatAtMs > limits[state]);
}

export function resolveContinuationHalt(params: {
  stale: boolean
  deadlineExceeded: boolean
  canContinue: boolean
}): { state: "stale" | "blocked"; code: string; message: string } | null {
  if (params.stale || params.deadlineExceeded) {
    return {
      state: "stale",
      code: "job_stale",
      message: "A análise foi interrompida por falta de atualização dentro do prazo.",
    }
  }
  if (!params.canContinue) {
    return {
      state: "blocked",
      code: "continuation_limit",
      message: "A análise não pôde continuar porque atingiu o limite de tempo ou de chamadas ao provedor.",
    }
  }
  return null
}

export function canContinueJob(params: { continuationCount: number; maxContinuations: number; deadlineAtMs: number; nowMs?: number; providerCallCount: number; maxProviderCalls: number; retryable: boolean }): boolean {
  const now = params.nowMs ?? Date.now();
  return params.continuationCount < params.maxContinuations && params.deadlineAtMs > now && params.providerCallCount < params.maxProviderCalls && params.retryable;
}

export function canRetryAnalysis(failure: ClassifiedAnalysisFailure, retries: number, maxRetries = JOB_LIMITS.maxRetries): boolean { return failure.retryable && retries < maxRetries; }
export function shouldSplitAnalysis(failure: ClassifiedAnalysisFailure): boolean { return failure.splitAllowed; }

export function getManualRetryDecision(job: {
  manualRetryCount?: number;
  retryBlockedUntilMs?: number;
}, failure: ClassifiedAnalysisFailure, nowMs = Date.now()): {
  allowed: boolean;
  nextRetryAt?: Date;
  blockedUntil?: Date;
  reason?: string;
} {
  const blockedUntilMs = Number(job.retryBlockedUntilMs ?? 0);
  if (blockedUntilMs > nowMs) {
    return { allowed: false, blockedUntil: new Date(blockedUntilMs), reason: "retry_cooldown" };
  }
  if (!failure.category || !["insufficient_credits", "billing_disabled", "quota_exceeded"].includes(failure.category)) {
    return { allowed: true };
  }
  const delay = Number(job.manualRetryCount ?? 0) > 0
    ? JOB_LIMITS.manualRetryBlockMs
    : JOB_LIMITS.manualRetryCooldownMs;
  return { allowed: true, nextRetryAt: new Date(nowMs + delay) };
}
