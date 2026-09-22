import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { extractPdfTextChunks, planPdfTextExtraction } from "./pdfTextExtractor";

async function makePdf(text: string): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText(text, {
    x: 40,
    y: 760,
    size: 12,
    font,
    color: rgb(0, 0, 0),
    maxWidth: 500,
  });
  return Buffer.from(await pdf.save());
}

describe("extractPdfTextChunks", () => {
  it("extrai texto de PDF e preserva metadados do documento", async () => {
    const buffer = await makePdf("Memorial de acesso com drenagem e faixa de dominio.");

    const chunks = await extractPdfTextChunks([
      {
        filename: "memorial.pdf",
        buffer,
        tipoDocumento: "memorial_descritivo",
      },
    ]);

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].documentName).toBe("memorial.pdf");
    expect(chunks[0].tipoDocumento).toBe("memorial_descritivo");
    expect(chunks.map((chunk) => chunk.text).join(" ")).toContain("Memorial");
  });

  it("planeja extração textual sem incluir PDFs grandes demais no caminho quente", () => {
    const small = Buffer.alloc(1024);
    const large = Buffer.alloc(20 * 1024 * 1024);
    const plan = planPdfTextExtraction(
      [
        { filename: "anexo.pdf", buffer: small, tipoDocumento: "outro" },
        { filename: "memorial.pdf", buffer: small, tipoDocumento: "memorial_descritivo" },
        { filename: "memorial-gigante.pdf", buffer: large, tipoDocumento: "memorial_descritivo" },
      ],
      { maxPdfs: 2, maxBytesPerPdf: 8 * 1024 * 1024, maxTotalBytes: 10 * 1024 * 1024 },
    );

    expect(plan.selected.map((pdf) => pdf.filename)).toEqual(["memorial.pdf", "anexo.pdf"]);
    expect(plan.skipped).toContainEqual({
      filename: "memorial-gigante.pdf",
      reason: "limite_tamanho_pdf_rag",
      sizeBytes: large.length,
    });
  });
});
