"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerCall = providerCall;
const firestore_1 = require("firebase-admin/firestore");
const analysisPolicy_1 = require("./analysisPolicy");
const openaiService_1 = require("./openaiService");
async function providerCall(params) {
    const db = (0, firestore_1.getFirestore)();
    await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(params.jobRef);
        if (!snapshot.exists)
            throw new Error("analysis_job_not_found");
        const job = snapshot.data() ?? {};
        const deadlineAt = job.deadlineAt?.toMillis?.() ?? 0;
        const providerCallCount = Number(job.providerCallCount ?? 0);
        const maxProviderCalls = Number(job.maxProviderCalls ?? 24);
        if (deadlineAt && deadlineAt <= Date.now())
            throw new Error("analysis_deadline_exceeded");
        if (providerCallCount >= maxProviderCalls)
            throw new Error("analysis_provider_call_limit");
        transaction.update(params.jobRef, {
            providerCallCount: firestore_1.FieldValue.increment(1),
            heartbeatAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        transaction.update(params.solicitacaoRef, {
            heartbeatAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    });
    try {
        return await (0, openaiService_1.analyze)(params.parts, params.options);
    }
    catch (error) {
        throw Object.assign(error instanceof Error ? error : new Error(String(error)), {
            analysisFailure: (0, analysisPolicy_1.classifyAnalysisError)(error),
        });
    }
}
//# sourceMappingURL=providerCall.js.map