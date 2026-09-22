import { PDFParse } from "pdf-parse";
import { chunkText } from "./chunkText";
import type { DocumentChunk } from "./documentRetrieval";

export interface PdfTextSource {
  filename: string;
  buffer: Buffer;
  tipoDocumento?: string;
  sourceFilename?: string;
  pageStart?: number;
  pageEnd?: number;
}

export interface ExtractPdfChunksOptions {
  maxCharsPerChunk?: number;
  overlapChars?: number;
  maxChunksPerPdf?: number;
  maxTextCharsPerPdf?: number;
}

export interface PdfTextExtractionPlan<T extends PdfTextSource = PdfTextSource> {
  selected: T[];
  skipped: Array<{ filename: string; reason: string; sizeBytes: number }>;
  totalSelectedBytes: number;
}

function normalizeText(value: string): string {
  return value.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").trim();
}

function isPreferredTextRagDocument(tipoDocumento?: string): boolean {
  const tipo = (tipoDocumento || "").toLowerCase();
  return (
    tipo.includes("memorial") ||
    tipo.includes("requerimento") ||
    tipo.includes("parecer") ||
    tipo.includes("art") ||
    tipo.includes("plano") ||
    tipo.includes("projeto")
  );
}

export function planPdfTextExtraction<T extends PdfTextSource>(
  pdfs: T[],
  options: {
    maxPdfs?: number;
    maxBytesPerPdf?: number;
    maxTotalBytes?: number;
  } = {},
): PdfTextExtractionPlan<T> {
  const maxPdfs = options.maxPdfs ?? 6;
  const maxBytesPerPdf = options.maxBytesPerPdf ?? 8 * 1024 * 1024;
  const maxTotalBytes = options.maxTotalBytes ?? 24 * 1024 * 1024;
  const selected: T[] = [];
  const skipped: PdfTextExtractionPlan<T>["skipped"] = [];
  let totalSelectedBytes = 0;

  const ordered = [...pdfs].sort((a, b) => {
    const aPreferred = isPreferredTextRagDocument(a.tipoDocumento) ? 1 : 0;
    const bPreferred = isPreferredTextRagDocument(b.tipoDocumento) ? 1 : 0;
    if (aPreferred !== bPreferred) return bPreferred - aPreferred;
    return a.buffer.length - b.buffer.length;
  });

  for (const pdf of ordered) {
    const sizeBytes = pdf.buffer.length;
    if (selected.length >= maxPdfs) {
      skipped.push({ filename: pdf.filename, reason: "limite_quantidade_rag", sizeBytes });
      continue;
    }
    if (sizeBytes > maxBytesPerPdf) {
      skipped.push({ filename: pdf.filename, reason: "limite_tamanho_pdf_rag", sizeBytes });
      continue;
    }
    if (totalSelectedBytes + sizeBytes > maxTotalBytes) {
      skipped.push({ filename: pdf.filename, reason: "limite_total_bytes_rag", sizeBytes });
      continue;
    }
    selected.push(pdf);
    totalSelectedBytes += sizeBytes;
  }

  return { selected, skipped, totalSelectedBytes };
}

export async function extractPdfTextChunks(
  pdfs: PdfTextSource[],
  options: ExtractPdfChunksOptions = {},
): Promise<DocumentChunk[]> {
  const maxCharsPerChunk = options.maxCharsPerChunk ?? 6000;
  const overlapChars = options.overlapChars ?? 300;
  const maxChunksPerPdf = options.maxChunksPerPdf ?? 6;
  const maxTextCharsPerPdf = options.maxTextCharsPerPdf ?? 60_000;
  const chunks: DocumentChunk[] = [];

  for (const pdf of pdfs) {
    let parser: PDFParse | null = null;
    try {
      parser = new PDFParse({ data: pdf.buffer });
      const result = await parser.getText({
        pageJoiner: "\n\n--- página page_number de total_number ---\n\n",
      });
      const text = normalizeText(result.text).slice(0, maxTextCharsPerPdf);
      if (!text) continue;

      const sourceName = pdf.sourceFilename || pdf.filename;
      const textChunks = chunkText(text, maxCharsPerChunk, overlapChars).slice(
        0,
        maxChunksPerPdf,
      );
      for (const chunk of textChunks) {
        chunks.push({
          id: `${sourceName}#${chunk.index}`,
          documentName: sourceName,
          tipoDocumento: pdf.tipoDocumento || "desconhecido",
          text: chunk.text,
          pageStart: pdf.pageStart,
          pageEnd: pdf.pageEnd,
        });
      }
    } catch (err) {
      console.warn(
        `Falha ao extrair texto do PDF ${pdf.filename}; RAG textual ignorado para este arquivo:`,
        err instanceof Error ? err.message : err,
      );
    } finally {
      if (parser) {
        await parser.destroy().catch(() => undefined);
      }
    }
  }

  return chunks;
}
