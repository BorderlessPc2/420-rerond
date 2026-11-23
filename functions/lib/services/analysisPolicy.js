"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JOB_LIMITS = void 0;
exports.classifyAnalysisError = classifyAnalysisError;
exports.isJobStale = isJobStale;
exports.canContinueJob = canContinueJob;
exports.canRetryAnalysis = canRetryAnalysis;
exports.shouldSplitAnalysis = shouldSplitAnalysis;
exports.getManualRetryDecision = getManualRetryDecision;
exports.JOB_LIMITS = {
    uploadedMs: 10 * 60_000, queuedMs: 10 * 60_000, extractingMs: 15 * 60_000,
    analyzingMs: 20 * 60_000, generatingReportMs: 15 * 60_000,
    heartbeatStaleMs: 5 * 60_000, absoluteDeadlineMs: 45 * 60_000,
    maxRetries: 3, maxContinuations: 2, maxProviderCalls: 24,
    manualRetryCooldownMs: 30_000, manualRetryBlockMs: 60_000,
};
const messageOf = (error) => {
    if (error instanceof Error)
        return error.message;
    if (typeof error === "string")
        return error;
    if (!error || typeof error !== "object")
        return String(error);
    const raw = error;
    const response = raw.response && typeof raw.response === "object" ? raw.response : null;
    const data = response?.data && typeof response.data === "object" ? response.data : null;
    const nested = data?.error && typeof data.error === "object" ? data.error : null;
    return [raw.code, raw.type, raw.status, raw.statusCode, raw.message, nested?.code, nested?.type, nested?.message].filter(Boolean).join(" ");
};
const result = (category, code, message, retryable = false, splitAllowed = false) => ({ category, code, message, retryable, splitAllowed });
function classifyAnalysisError(error) {
    const text = messageOf(error).toLowerCase();
    if (/insufficient_quota|insufficient[_ ]credits|insufficient[_ ]funds/.test(text))
        return result("insufficient_credits", "insufficient_credits", "A análise foi bloqueada porque o provedor de IA está sem créditos ou saldo disponível.");
    if (/billing_hard_limit|billing[_ ]disabled|payment required|billing not active/.test(text))
        return result("billing_disabled", "billing_disabled", "A análise foi bloqueada porque o billing do provedor de IA está indisponível.");
    if (/quota_exceeded|quota exceeded|limit reached/.test(text))
        return result("quota_exceeded", "quota_exceeded", "A cota do provedor de IA foi atingida. Configure uma cota maior antes de tentar novamente.");
    if (/429|rate limit|too many requests/.test(text))
        return result("rate_limit", "rate_limit", "Limite temporário do provedor de IA. Aguarde e tente novamente.", true, true);
    if (/context_length|context length|context window|maximum context/.test(text))
        return result("context_window", "context_window", "O volume de documentos ultrapassou a janela de contexto.", false, true);
    if (/api key|authentication|unauthorized|\b401\b/.test(text))
        return result("missing_api_key", "missing_api_key", "A chave do provedor de IA está ausente ou inválida.");
    if (/timeout|\b408\b/.test(text))
        return result("provider_timeout", "provider_timeout", "O provedor de IA demorou além do limite.", true);
    if (/\b502\b|\b503\b|\b504\b|temporarily unavailable/.test(text))
        return result("provider_unavailable", "provider_unavailable", "O provedor de IA está temporariamente indisponível.", true);
    if (/network|fetch failed|connection|\beconn/.test(text))
        return result("connection_error", "connection_error", "Não foi possível conectar ao provedor de IA.", true);
    return result("unknown", "analysis_failed", messageOf(error) || "Erro desconhecido na análise.");
}
function isJobStale(state, heartbeatAtMs, nowMs = Date.now()) {
    const limits = { uploaded: exports.JOB_LIMITS.uploadedMs, queued: exports.JOB_LIMITS.queuedMs, extracting: exports.JOB_LIMITS.extractingMs, analyzing: exports.JOB_LIMITS.analyzingMs, generating_report: exports.JOB_LIMITS.generatingReportMs, retry_waiting: exports.JOB_LIMITS.queuedMs, continuation_waiting: exports.JOB_LIMITS.queuedMs };
    return Boolean(limits[state] && nowMs - heartbeatAtMs > limits[state]);
}
function canContinueJob(params) {
    const now = params.nowMs ?? Date.now();
    return params.continuationCount < params.maxContinuations && params.deadlineAtMs > now && params.providerCallCount < params.maxProviderCalls && params.retryable;
}
function canRetryAnalysis(failure, retries, maxRetries = exports.JOB_LIMITS.maxRetries) { return failure.retryable && retries < maxRetries; }
function shouldSplitAnalysis(failure) { return failure.splitAllowed; }
function getManualRetryDecision(job, failure, nowMs = Date.now()) {
    const blockedUntilMs = Number(job.retryBlockedUntilMs ?? 0);
    if (blockedUntilMs > nowMs) {
        return { allowed: false, blockedUntil: new Date(blockedUntilMs), reason: "retry_cooldown" };
    }
    if (!failure.category || !["insufficient_credits", "billing_disabled", "quota_exceeded"].includes(failure.category)) {
        return { allowed: true };
    }
    const delay = Number(job.manualRetryCount ?? 0) > 0
        ? exports.JOB_LIMITS.manualRetryBlockMs
        : exports.JOB_LIMITS.manualRetryCooldownMs;
    return { allowed: true, nextRetryAt: new Date(nowMs + delay) };
}
//# sourceMappingURL=analysisPolicy.js.map