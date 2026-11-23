import { describe, expect, it } from "vitest";
import { canContinueJob, classifyAnalysisError, getManualRetryDecision, isJobStale } from "./analysisPolicy";

describe("analysisPolicy", () => {
  it("não confunde texto comum com erro de crédito", () => {
    expect(classifyAnalysisError(new Error("credit reference found in document")).category).toBe("unknown");
  });

  it("classifica billing e quota sem retry", () => {
    expect(classifyAnalysisError(new Error("billing_hard_limit_reached")).retryable).toBe(false);
    expect(classifyAnalysisError(new Error("quota_exceeded")).category).toBe("quota_exceeded");
  });

  it("classifica conexão como retryable", () => {
    const failure = classifyAnalysisError(new Error("fetch failed: connection reset"));
    expect(failure.category).toBe("connection_error");
    expect(failure.retryable).toBe(true);
  });

  it("bloqueia crédito sem retry ou split", () => {
    const failure = classifyAnalysisError(new Error("insufficient_quota: insufficient credits"));
    expect(failure.category).toBe("insufficient_credits");
    expect(failure.retryable).toBe(false);
    expect(failure.splitAllowed).toBe(false);
  });

  it("não marca job recente como stale e marca job antigo", () => {
    const now = 1_000_000;
    expect(isJobStale("queued", now - 9 * 60_000, now)).toBe(false);
    expect(isJobStale("queued", now - 11 * 60_000, now)).toBe(true);
    expect(isJobStale("analyzing", now - 19 * 60_000, now)).toBe(false);
    expect(isJobStale("analyzing", now - 21 * 60_000, now)).toBe(true);
  });

  it("aplica cooldown de 30s e bloqueio de 60s", () => {
    const failure = classifyAnalysisError(new Error("insufficient_quota"));
    const first = getManualRetryDecision({}, failure, 1_000);
    expect(first.allowed).toBe(true);
    expect(first.nextRetryAt?.getTime()).toBe(31_000);
    const repeated = getManualRetryDecision({ manualRetryCount: 1 }, failure, 1_000);
    expect(repeated.nextRetryAt?.getTime()).toBe(61_000);
    const blocked = getManualRetryDecision({ retryBlockedUntilMs: 2_000 }, failure, 1_000);
    expect(blocked.allowed).toBe(false);
  });

  it("impede continuação acima dos limites", () => {
    const base = {
      continuationCount: 0,
      maxContinuations: 2,
      providerCallCount: 1,
      maxProviderCalls: 24,
      retryable: true,
      nowMs: 1_000,
      deadlineAtMs: 2_000,
    };
    expect(canContinueJob(base)).toBe(true);
    expect(canContinueJob({ ...base, continuationCount: 2 })).toBe(false);
    expect(canContinueJob({ ...base, deadlineAtMs: 999 })).toBe(false);
    expect(canContinueJob({ ...base, retryable: false })).toBe(false);
    expect(canContinueJob({ ...base, providerCallCount: 24 })).toBe(false);
  });
});
