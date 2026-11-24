export type JobFailure = {
  code: string
  message: string
}

export function getMissingApiKeyFailure(): JobFailure {
  return {
    code: "missing_api_key",
    message: "OPENAI_API_KEY não configurada para processamento do job.",
  }
}

export function validateAnalysisType(
  tipoAnaliseId: string,
  includesDocuments: boolean,
): JobFailure | null {
  if (includesDocuments && !tipoAnaliseId.trim()) {
    return {
      code: "missing_analysis_type",
      message: "Selecione o tipo de análise antes de processar documentos.",
    };
  }
  return null;
}

export function shouldClaimContinuation(
  before: { requested?: boolean; claimId?: string } | null | undefined,
  after: { requested?: boolean; claimId?: string } | null | undefined,
): boolean {
  return Boolean(after?.requested && !before?.claimId && after.claimId)
}

export function canStartAnaliseJob(job: {
  state?: string
  phase?: string
  continuation?: { claimId?: string } | null
}): boolean {
  if (job.state === "queued") return true
  return job.state === "analyzing"
    && job.phase === "continuation"
    && Boolean(job.continuation?.claimId)
}
