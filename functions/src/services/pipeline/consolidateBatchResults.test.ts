import { describe, expect, it } from "vitest";
import {
  consolidatePareceres,
  mergeChecklistItems,
  mergeConferenciaInputs,
  mergeDadosExtraidos,
} from "./consolidateBatchResults";

describe("mergeChecklistItems", () => {
  it("pior status vence", () => {
    const merged = mergeChecklistItems([
      [{ item: "A1", status: "OK", fundamentacao: "curto" }],
      [{ item: "A1", status: "NAO_CONFORME", fundamentacao: "texto mais longo e claro" }],
    ]) as Array<{ status: string; fundamentacao: string }>;
    expect(merged).toHaveLength(1);
    expect(merged[0].status).toBe("NAO_CONFORME");
    expect(merged[0].fundamentacao).toContain("mais longo");
  });
});

describe("mergeDadosExtraidos", () => {
  it("preenche campos faltantes", () => {
    const merged = mergeDadosExtraidos([
      { rodovia: "BR-101", kilometragem: "" },
      { kilometragem: "KM 10", municipio: "Serra" },
    ]);
    expect(merged).toEqual({
      rodovia: "BR-101",
      kilometragem: "KM 10",
      municipio: "Serra",
    });
  });
});

describe("mergeConferenciaInputs", () => {
  it("prioriza DIVERGENTE", () => {
    const merged = mergeConferenciaInputs([
      [{ campo: "rodovia", status: "COMPATIVEL" }],
      [{ campo: "rodovia", status: "DIVERGENTE", evidencia: { arquivo: "a.pdf" } }],
    ]) as Array<{ status: string }>;
    expect(merged[0].status).toBe("DIVERGENTE");
  });
});

describe("consolidatePareceres", () => {
  it("concatena múltiplos lotes", () => {
    const text = consolidatePareceres([
      { filenames: ["a.pdf"], parecer: "Parecer A" },
      { filenames: ["b.pdf"], parecer: "Parecer B" },
    ]);
    expect(text).toContain("LOTE 1/2");
    expect(text).toContain("Parecer A");
    expect(text).toContain("Parecer B");
  });
});
