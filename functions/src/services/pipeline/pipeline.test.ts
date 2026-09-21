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

  it("não empilha mais que maxItemsPerBatch (muitos arquivos)", () => {
    const items = Array.from({ length: 24 }, (_, i) => ({
      id: String(i),
      filename: `doc-${i}.pdf`,
      sizeBytes: 500_000,
    }));
    const batches = planDocumentBatches(items, {
      maxItemsPerBatch: 6,
      maxBytesPerBatch: 28 * 1024 * 1024,
      maxTokensPerBatch: 280_000,
    });
    expect(batches.length).toBe(4);
    expect(batches.every((b) => b.items.length <= 6)).toBe(true);
    expect(batches.every((b) => b.totalBytes <= 28 * 1024 * 1024)).toBe(true);
  });

  it("respeita teto de bytes com folga para normas (~50MB API)", () => {
    const items = [
      { id: "1", filename: "a.pdf", sizeBytes: 15 * 1024 * 1024 },
      { id: "2", filename: "b.pdf", sizeBytes: 15 * 1024 * 1024 },
      { id: "3", filename: "c.pdf", sizeBytes: 15 * 1024 * 1024 },
    ];
    const batches = planDocumentBatches(items, {
      maxBytesPerBatch: 28 * 1024 * 1024,
      maxTokensPerBatch: 1_000_000,
      maxItemsPerBatch: 10,
    });
    expect(batches.length).toBeGreaterThanOrEqual(2);
    expect(batches.every((b) => b.totalBytes <= 28 * 1024 * 1024)).toBe(true);
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

  it("omite o 19º+ PDF e mantém memorial/planta entre 25 arquivos", () => {
    const items = [
      { filename: "z-anexo.pdf", tipoDocumento: "outro", sizeBytes: 100_000 },
      ...Array.from({ length: 20 }, (_, i) => ({
        filename: `anexo-${i}.pdf`,
        tipoDocumento: "desconhecido",
        sizeBytes: 100_000,
      })),
      { filename: "memorial.pdf", tipoDocumento: "memorial_descritivo", sizeBytes: 100_000 },
      { filename: "planta.pdf", tipoDocumento: "planta_baixa", sizeBytes: 100_000 },
      { filename: "art.pdf", tipoDocumento: "art", sizeBytes: 100_000 },
    ];
    const result = selectDocumentosPorPrioridade(items, {
      maxCount: 18,
      maxBytesPerFile: 35 * 1024 * 1024,
    });
    expect(result.incluidos).toHaveLength(18);
    expect(result.omitidos.length).toBe(items.length - 18);
    const names = result.incluidos.map((i) => i.filename);
    expect(names).toContain("memorial.pdf");
    expect(names).toContain("planta.pdf");
    expect(names).toContain("art.pdf");
    expect(result.omitidos.every((o) => o.motivo.includes("limite") || o.motivo.includes("prioridade"))).toBe(
      true,
    );
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

  it("detecta rate limit e não confunde com context window", () => {
    expect(isLikelyRateLimitError(new Error("HTTP 429"))).toBe(true);
    expect(isLikelyRateLimitError(new Error("boom"))).toBe(false);
    expect(isLikelyRateLimitError(new Error("context window exceeded"))).toBe(false);
  });
});

describe("pdfSplit planning", () => {
  it("marca PDF grande para split e calcula partes", async () => {
    const { shouldSplitPdf, planPdfPartCount, isLikelyContextWindowError } = await import(
      "./pdfSplit"
    );
    expect(shouldSplitPdf(20 * 1024 * 1024)).toBe(true);
    expect(shouldSplitPdf(100_000)).toBe(false);
    expect(planPdfPartCount(30 * 1024 * 1024, 100)).toBeGreaterThanOrEqual(2);
    expect(isLikelyContextWindowError(new Error("maximum context length exceeded"))).toBe(true);
    expect(isLikelyContextWindowError(new Error("429 rate limit"))).toBe(false);
  });
});
