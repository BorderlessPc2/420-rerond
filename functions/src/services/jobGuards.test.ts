import { describe, expect, it } from "vitest";
import {
  getMissingApiKeyFailure,
  shouldClaimContinuation,
  validateAnalysisType,
} from "./jobGuards";

describe("job guards", () => {
  it("returns actionable failure when API key is missing", () => {
    expect(getMissingApiKeyFailure()).toEqual({
      code: "missing_api_key",
      message: "OPENAI_API_KEY não configurada para processamento do job.",
    });
  });

  it("rejects document analysis without an analysis type", () => {
    expect(validateAnalysisType("", true)).toEqual({
      code: "missing_analysis_type",
      message: "Selecione o tipo de análise antes de processar documentos.",
    });
    expect(validateAnalysisType("pac-executivo", true)).toBeNull();
  });

  it("claims continuation only once for the same request", () => {
    const requested = { requested: true, claimId: "claim-1" };
    expect(shouldClaimContinuation({ requested: true }, requested)).toBe(true);
    expect(shouldClaimContinuation(requested, requested)).toBe(false);
  });
});
