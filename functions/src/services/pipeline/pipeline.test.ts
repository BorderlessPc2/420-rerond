import { describe, expect, it } from "vitest";
import { chunkText } from "./chunkText";
import { estimateTokensFromBytes, estimateTokensFromText } from "./estimateTokens";
import { planDocumentBatches } from "./batchPlanner";
import { selectDocumentosPorPrioridade } from "./documentPriority";
import { withRetry, isLikelyRateLimitError } from "./withRetry";

describe("estimateTokens", () => {
  it("estima por caracteres", () => {
    expect(estimateTokensFromText("abcd")).toBe(1);
    expect(estimateTokensFromText("a".repeat(8))).toBe(2);
  });

  it("estima por bytes", () => {
    expect(estimateTokensFromBytes(40)).toBe(1);
    expect(estimateTokensFromBytes(80)).toBe(2);
    expect(estimateTokensFromBytes(400_000)).toBe(10_000);
  });
});

describe("chunkText", () => {
  it("retorna vazio para texto vazio", () => {
    expect(chunkText("")).toEqual([]);
  });

  it("divide texto longo com overlap", () => {
    const text = "A".repeat(50) + "\n\n" + "B".repeat(50);
    const chunks = chunkText(text, 60, 5);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].index).toBe(0);
    expect(chunks[0].text.length).toBeLessThanOrEqual(60);
  });
});

describe("planDocumentBatches", () => {
  it("agrupa documentos pequenos e isola grandes", () => {
    const batches = planDocumentBatches(
      [
        { id: "1", filename: "a.pdf", sizeBytes: 1000 },
        { id: "2", filename: "b.pdf", sizeBytes: 1000 },
        { id: "3", filename: "c.pdf", sizeBytes: 20_000_000 },
      ],
      { maxBytesPerBatch: 5_000_000, maxTokensPerBatch: 1_000_000 },
    );
    expect(batches.length).toBeGreaterThanOrEqual(2);
    expect(batches.some((b) => b.items.some((i) => i.filename === "c.pdf"))).toBe(true);
  });
});

describe("selectDocumentosPorPrioridade", () => {
  it("prioriza memorial/planta sobre anexos genéricos ao omitir por limite", () => {
    const result = selectDocumentosPorPrioridade(
      [
        { filename: "anexo-extra.pdf", tipoDocumento: "outro", sizeBytes: 100 },
        { filename: "planta.pdf", tipoDocumento: "planta_baixa", sizeBytes: 100 },
        { filename: "memorial.pdf", tipoDocumento: "memorial_descritivo", sizeBytes: 100 },
        { filename: "foto.pdf", tipoDocumento: "desconhecido", sizeBytes: 100 },
      ],
      { maxCount: 2, maxBytesPerFile: 1_000_000 },
    );
    expect(result.incluidos.map((i) => i.filename)).toEqual(["memorial.pdf", "planta.pdf"]);
    expect(result.omitidos).toHaveLength(2);
    expect(result.omitidos.every((o) => o.motivo.includes("prioridade"))).toBe(true);
  });

  it("omite arquivo acima do tamanho mesmo com prioridade alta", () => {
    const result = selectDocumentosPorPrioridade(
      [
        {
          filename: "memorial-gigante.pdf",
          tipoDocumento: "memorial_descritivo",
          sizeBytes: 50_000_000,
        },
        { filename: "planta.pdf", tipoDocumento: "planta_baixa", sizeBytes: 100 },
      ],
      { maxCount: 10, maxBytesPerFile: 20_000_000 },
    );
    expect(result.incluidos.map((i) => i.filename)).toEqual(["planta.pdf"]);
    expect(result.omitidos[0].motivo).toMatch(/tamanho excedido/);
  });
});

describe("withRetry", () => {
  it("retenta em 429 e depois sucesso", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls += 1;
        if (calls < 3) throw new Error("429 rate limit");
        return "ok";
      },
      { maxAttempts: 3, baseDelayMs: 1, sleep: async () => undefined },
    );
    expect(result).toBe("ok");
    expect(calls).toBe(3);
  });

  it("não retenta erro não retryable", async () => {
    await expect(
      withRetry(
        async () => {
          throw new Error("invalid schema");
        },
        { maxAttempts: 3, baseDelayMs: 1, sleep: async () => undefined },
      ),
    ).rejects.toThrow("invalid schema");
  });

  it("detecta rate limit", () => {
    expect(isLikelyRateLimitError(new Error("HTTP 429"))).toBe(true);
    expect(isLikelyRateLimitError(new Error("boom"))).toBe(false);
  });
});
