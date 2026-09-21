import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { expandPdfsForContext, splitPdfByPages, shouldSplitPdf } from "./pdfSplit";
import { planDocumentBatches } from "./batchPlanner";
import { selectDocumentosPorPrioridade } from "./documentPriority";
import { mergeChecklistItems, consolidatePareceres } from "./consolidateBatchResults";

async function makePdf(pages: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    doc.addPage([612, 792]);
  }
  return Buffer.from(await doc.save());
}

describe("fluxo muitos arquivos / PDF grande (estabilidade)", () => {
  it("pipeline: 25 PDFs → seleciona 18 com prioridade → planeja lotes ≤6 itens", () => {
    const raw = [
      { filename: "memorial.pdf", tipoDocumento: "memorial_descritivo", sizeBytes: 800_000 },
      { filename: "planta.pdf", tipoDocumento: "planta_baixa", sizeBytes: 1_200_000 },
      ...Array.from({ length: 23 }, (_, i) => ({
        filename: `extra-${i}.pdf`,
        tipoDocumento: "desconhecido",
        sizeBytes: 400_000,
      })),
    ];

    const selected = selectDocumentosPorPrioridade(raw, {
      maxCount: 18,
      maxBytesPerFile: 35 * 1024 * 1024,
    });
    expect(selected.incluidos).toHaveLength(18);
    expect(selected.omitidos).toHaveLength(7);
    expect(selected.incluidos.some((i) => i.filename === "memorial.pdf")).toBe(true);
    expect(selected.incluidos.some((i) => i.filename === "planta.pdf")).toBe(true);

    const batches = planDocumentBatches(
      selected.incluidos.map((item, index) => ({
        id: String(index),
        filename: item.filename,
        sizeBytes: item.sizeBytes ?? 0,
      })),
      {
        maxItemsPerBatch: 6,
        maxBytesPerBatch: 28 * 1024 * 1024,
        maxTokensPerBatch: 280_000,
      },
    );

    expect(batches.length).toBeGreaterThanOrEqual(3);
    expect(batches.every((b) => b.items.length <= 6)).toBe(true);
    expect(batches.every((b) => b.totalBytes <= 28 * 1024 * 1024)).toBe(true);
    const plannedFiles = batches.flatMap((b) => b.items.map((i) => i.filename));
    expect(plannedFiles).toHaveLength(18);
  });

  it("splitPdfByPages divide e consolida checklist de partes sem erro", async () => {
    // Buffer pequeno: força split via options baixas
    const buffer = await makePdf(10);
    expect(buffer.length).toBeGreaterThan(0);

    const slices = await splitPdfByPages(buffer, "memorial-longo.pdf", {
      maxBytesPerPart: Math.max(1, Math.floor(buffer.length / 3)),
      maxTokensPerPart: 100,
      overlapPages: 1,
      maxParts: 4,
    });
    expect(slices.length).toBeGreaterThanOrEqual(2);
    expect(slices[0].pageStart).toBe(1);
    expect(slices.every((s) => s.buffer.length > 0)).toBe(true);

    const checklists = slices.map((_, i) => [
      {
        item: "REQ_TEST",
        status: i === 0 ? "INFORMACAO_AUSENTE" : "OK",
        situacaoEncontrada: `parte ${i + 1}`,
      },
    ]);
    const merged = mergeChecklistItems(checklists);
    expect(merged).toHaveLength(1);
    // pior status vence entre INFORMACAO_AUSENTE e OK → INFORMACAO_AUSENTE rank 2 > OK 1
    expect(String((merged[0] as { status?: string }).status)).toBe("INFORMACAO_AUSENTE");

    const parecer = consolidatePareceres(
      slices.map((s) => ({
        filenames: [s.filename],
        parecer: `Achados nas páginas ${s.pageStart}-${s.pageEnd}.`,
      })),
    );
    expect(parecer).toContain("LOTE");
    expect(parecer.length).toBeGreaterThan(40);
  });

  it("expandPdfsForContext não quebra lista mista (pequenos + grande)", async () => {
    const small = await makePdf(1);
    const large = await makePdf(8);
    // força shouldSplit no large via options
    const expanded = await expandPdfsForContext(
      [
        { filename: "pequeno.pdf", buffer: small },
        { filename: "grande.pdf", buffer: large },
      ],
      {
        maxBytesPerPart: Math.max(500, Math.floor(large.length / 2)),
        maxTokensPerPart: 50,
        overlapPages: 1,
        maxParts: 4,
      },
    );
    expect(expanded.some((p) => p.filename === "pequeno.pdf" && p.partCount === 1)).toBe(true);
    const grandes = expanded.filter((p) => p.sourceFilename === "grande.pdf");
    expect(grandes.length).toBeGreaterThanOrEqual(1);
    if (shouldSplitPdf(large.length, { maxBytesPerPart: Math.floor(large.length / 2), maxTokensPerPart: 50 })) {
      expect(grandes.length).toBeGreaterThanOrEqual(2);
    }
  });
});
