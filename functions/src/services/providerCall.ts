import { FieldValue, type DocumentReference, getFirestore } from "firebase-admin/firestore";
import { classifyAnalysisError } from "./analysisPolicy";
import { analyze, type AnaliseResult, type InputPart } from "./openaiService";

export async function providerCall(params: {
  jobRef: DocumentReference;
  solicitacaoRef: DocumentReference;
  parts: InputPart[];
  options?: Parameters<typeof analyze>[1];
}): Promise<AnaliseResult> {
  const db = getFirestore();
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(params.jobRef);
    if (!snapshot.exists) throw new Error("analysis_job_not_found");
    const job = snapshot.data() ?? {};
    const deadlineAt = job.deadlineAt?.toMillis?.() ?? 0;
    const providerCallCount = Number(job.providerCallCount ?? 0);
    const maxProviderCalls = Number(job.maxProviderCalls ?? 24);
    if (deadlineAt && deadlineAt <= Date.now()) throw new Error("analysis_deadline_exceeded");
    if (providerCallCount >= maxProviderCalls) throw new Error("analysis_provider_call_limit");
    transaction.update(params.jobRef, {
      providerCallCount: FieldValue.increment(1),
      heartbeatAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(params.solicitacaoRef, {
      heartbeatAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  try {
    return await analyze(params.parts, params.options);
  } catch (error: unknown) {
    throw Object.assign(error instanceof Error ? error : new Error(String(error)), {
      analysisFailure: classifyAnalysisError(error),
    });
  }
}
