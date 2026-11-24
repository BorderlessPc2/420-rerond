"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMissingApiKeyFailure = getMissingApiKeyFailure;
exports.validateAnalysisType = validateAnalysisType;
exports.shouldClaimContinuation = shouldClaimContinuation;
exports.canStartAnaliseJob = canStartAnaliseJob;
function getMissingApiKeyFailure() {
    return {
        code: "missing_api_key",
        message: "OPENAI_API_KEY não configurada para processamento do job.",
    };
}
function validateAnalysisType(tipoAnaliseId, includesDocuments) {
    if (includesDocuments && !tipoAnaliseId.trim()) {
        return {
            code: "missing_analysis_type",
            message: "Selecione o tipo de análise antes de processar documentos.",
        };
    }
    return null;
}
function shouldClaimContinuation(before, after) {
    return Boolean(after?.requested && !before?.claimId && after.claimId);
}
function canStartAnaliseJob(job) {
    if (job.state === "queued")
        return true;
    return job.state === "analyzing"
        && job.phase === "continuation"
        && Boolean(job.continuation?.claimId);
}
//# sourceMappingURL=jobGuards.js.map