"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.finalizeAnalysisJob = finalizeAnalysisJob;
const firestore_1 = require("firebase-admin/firestore");
const firestoreSanitizer_1 = require("./firestoreSanitizer");
const terminalState = (category) => category === "insufficient_credits" || category === "billing_disabled" || category === "quota_exceeded" ? "blocked" : "failed";
async function finalizeAnalysisJob(params) {
    const db = (0, firestore_1.getFirestore)();
    await db.runTransaction(async (transaction) => {
        const [jobSnapshot, solicitacaoSnapshot] = await Promise.all([
            transaction.get(params.jobRef),
            transaction.get(params.solicitacaoRef),
        ]);
        if (!jobSnapshot.exists || !solicitacaoSnapshot.exists)
            return;
        const solicitacao = solicitacaoSnapshot.data() ?? {};
        if (solicitacao.activeAnaliseJobId !== params.jobId)
            return;
        const error = params.error ?? (params.failure ? { code: params.failure.code, message: params.failure.message } : undefined);
        const state = params.failure ? terminalState(params.failure.category) : params.state;
        const isBillingFailure = params.failure && ['insufficient_credits', 'billing_disabled', 'quota_exceeded'].includes(params.failure.category);
        const previousManualRetryCount = Number(jobSnapshot.data()?.manualRetryCount ?? solicitacao.manualRetryCount ?? 0);
        const retryBlockedUntil = isBillingFailure
            ? new Date(Date.now() + (previousManualRetryCount > 0 ? 60_000 : 30_000))
            : null;
        transaction.update(params.jobRef, (0, firestoreSanitizer_1.sanitizeForFirestore)({
            ...params.resultFields,
            state,
            progress: params.progress,
            error: error ?? null,
            failureCategory: params.failure?.category ?? null,
            retryable: params.failure?.retryable ?? false,
            retryBlockedUntil,
            manualRetryCount: isBillingFailure ? firestore_1.FieldValue.increment(1) : undefined,
            completedAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            heartbeatAt: firestore_1.FieldValue.serverTimestamp(),
        }));
        transaction.update(params.solicitacaoRef, (0, firestoreSanitizer_1.sanitizeForFirestore)({
            ...params.resultFields,
            activeAnaliseJobId: null,
            analiseJobStatus: state,
            analiseJobProgress: params.progress,
            analiseErroCodigo: error?.code ?? null,
            analiseErroMensagem: error?.message ?? null,
            analiseRetryBlockedUntil: retryBlockedUntil,
            retryBlockedUntil,
            manualRetryCount: isBillingFailure ? firestore_1.FieldValue.increment(1) : undefined,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }));
    });
}
//# sourceMappingURL=analysisJobFinalizers.js.map