"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLikelyRateLimitError = isLikelyRateLimitError;
exports.withRetry = withRetry;
const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function isLikelyRateLimitError(error) {
    const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
    if (msg.includes("context_length") ||
        msg.includes("context length") ||
        msg.includes("maximum context") ||
        msg.includes("context window") ||
        msg.includes("too large")) {
        return false;
    }
    return (msg.includes("429") ||
        msg.includes("rate limit") ||
        msg.includes("too many requests"));
}
/**
 * Retry com backoff. Pronto para ligar no processor quando houver OpenAI/deploy.
 * Não altera o caminho quente por padrão.
 */
async function withRetry(fn, options = {}) {
    const maxAttempts = options.maxAttempts ?? 3;
    const baseDelayMs = options.baseDelayMs ?? 400;
    const factor = options.factor ?? 2;
    const isRetryable = options.isRetryable ?? isLikelyRateLimitError;
    const sleep = options.sleep ?? defaultSleep;
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn(attempt);
        }
        catch (error) {
            lastError = error;
            if (attempt >= maxAttempts || !isRetryable(error)) {
                throw error;
            }
            const delay = baseDelayMs * Math.pow(factor, attempt - 1);
            await sleep(delay);
        }
    }
    throw lastError;
}
//# sourceMappingURL=withRetry.js.map