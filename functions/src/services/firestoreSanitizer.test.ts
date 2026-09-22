import { describe, expect, it } from "vitest";

import { sanitizeForFirestore } from "./firestoreSanitizer";

function hasUndefined(value: unknown): boolean {
  if (value === undefined) return true;
  if (Array.isArray(value)) return value.some(hasUndefined);
  if (!value || typeof value !== "object") return false;
  return Object.values(value as Record<string, unknown>).some(hasUndefined);
}

describe("sanitizeForFirestore", () => {
  it("converte undefined aninhado em null para update do Firestore", () => {
    const payload = sanitizeForFirestore({
      batchResults: [
        {
          conferenciaInputs: [
            {
              campo: "rodovia",
              evidencia: undefined,
              nested: { arquivo: undefined, pagina: "1" },
            },
          ],
        },
      ],
    });

    expect(hasUndefined(payload)).toBe(false);
    expect(payload.batchResults[0].conferenciaInputs[0].evidencia).toBeNull();
    expect(payload.batchResults[0].conferenciaInputs[0].nested.arquivo).toBeNull();
  });
});
