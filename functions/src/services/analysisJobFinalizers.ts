import { FieldValue, type DocumentReference, getFirestore } from "firebase-admin/firestore";
import { sanitizeForFirestore } from "./firestoreSanitizer";
import type { ClassifiedAnalysisFailure } from "./analysisPolicy";

const terminalState = (category?: string) => category === "insufficient_credits" || category === "billing_disabled" || category === "quota_exceeded" ? "blocked" : "failed";

export async function finalizeAnalysisJob(params: {
  jobRef: DocumentReference;
  solicitacaoRef: DocumentReference;
  jobId: string;
  state: "completed" | "failed" | "blocked" | "stale" | "cancelled";
  progress: number;
  error?: { code: string; message: string };
  failure?: ClassifiedAnalysisFailure;
  resultFields?: Record<string, unknown>;
}) {
  const db = getFirestore();
  await db.runTransaction(async (transaction) => {
    const [jobSnapshot, solicitacaoSnapshot] = await Promise.all([
      transaction.get(params.jobRef),
      transaction.get(params.solicitacaoRef),
    ]);
    if (!jobSnapshot.exists || !solicitacaoSnapshot.exists) return;
    const solicitacao = solicitacaoSnapshot.data() ?? {};
    if (solicitacao.activeAnaliseJobId !== params.jobId) return;
    const error = params.error ?? (params.failure ? { code: params.failure.code, message: params.failure.message } : undefined);
    const state = params.failure ? terminalState(params.failure.category) : params.state;
    const isBillingFailure = params.failure && ['insufficient_credits', 'billing_disabled', 'quota_exceeded'].includes(params.failure.category);
    const previousManualRetryCount = Number(jobSnapshot.data()?.manualRetryCount ?? solicitacao.manualRetryCount ?? 0);
    const retryBlockedUntil = isBillingFailure
      ? new Date(Date.now() + (previousManualRetryCount > 0 ? 60_000 : 30_000))
      : null;
    transaction.update(params.jobRef, sanitizeForFirestore({
      ...params.resultFields,
      state,
      progress: params.progress,
      error: error ?? null,
      failureCategory: params.failure?.category ?? null,
      retryable: params.failure?.retryable ?? false,
      retryBlockedUntil,
      manualRetryCount: isBillingFailure ? FieldValue.increment(1) : undefined,
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      heartbeatAt: FieldValue.serverTimestamp(),
    }));
    transaction.update(params.solicitacaoRef, sanitizeForFirestore({
      ...params.resultFields,
      activeAnaliseJobId: null,
      analiseJobStatus: state,
      analiseJobProgress: params.progress,
      analiseErroCodigo: error?.code ?? null,
      analiseErroMensagem: error?.message ?? null,
      analiseRetryBlockedUntil: retryBlockedUntil,
      retryBlockedUntil,
      manualRetryCount: isBillingFailure ? FieldValue.increment(1) : undefined,
      updatedAt: FieldValue.serverTimestamp(),
    }));
  });
}
