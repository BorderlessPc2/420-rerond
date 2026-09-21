import { PDFDocument } from "pdf-lib";
import { estimateTokensFromBytes } from "./estimateTokens";

export type PdfSlice = {
  filename: string;
  buffer: Buffer;
  /** Nome original sem sufixo de parte. */
  sourceFilename: string;
  partIndex: number;
  partCount: number;
  pageStart: number;
  pageEnd: number;
  sizeBytes: number;
};

export type SplitPdfOptions = {
  /** Bytes alvo por fatia (default 12MB). */
  maxBytesPerPart?: number;
  /** Tokens estimados alvo por fatia (default 120k). */
  maxTokensPerPart?: number;
  /** Sobreposição de páginas entre fatias (default 1). */
  overlapPages?: number;
  /** Máximo de fatias por arquivo (default 8). */
  maxParts?: number;
};

function partFilename(
  sourceFilename: string,
  partIndex: number,
  partCount: number,
  pageStart: number,
  pageEnd: number,
): string {
  const base = sourceFilename.replace(/\.pdf$/i, "") || "documento";
  return `${base}__parte-${partIndex + 1}-de-${partCount}_p${pageStart}-${pageEnd}.pdf`;
}

/**
 * Decide se o PDF deve ser fatiado antes da chamada ao modelo.
 */
export function shouldSplitPdf(
  sizeBytes: number,
  options: { maxBytesPerPart?: number; maxTokensPerPart?: number } = {},
): boolean {
  const maxBytes = options.maxBytesPerPart ?? 12 * 1024 * 1024;
  const maxTokens = options.maxTokensPerPart ?? 120_000;
  if (sizeBytes <= 0) return false;
  if (sizeBytes > maxBytes) return true;
  return estimateTokensFromBytes(sizeBytes) > maxTokens;
}

/**
 * Quantas fatias usar com base no tamanho (mín. 2 se shouldSplit).
 */
export function planPdfPartCount(
  sizeBytes: number,
  pageCount: number,
  options: SplitPdfOptions = {},
): number {
  const maxBytes = options.maxBytesPerPart ?? 12 * 1024 * 1024;
  const maxTokens = options.maxTokensPerPart ?? 120_000;
  const maxParts = Math.max(2, options.maxParts ?? 8);
  if (pageCount <= 1) return 1;

  const byBytes = Math.ceil(sizeBytes / maxBytes);
  const byTokens = Math.ceil(estimateTokensFromBytes(sizeBytes) / maxTokens);
  const needed = Math.max(byBytes, byTokens, 2);
  return Math.min(maxParts, Math.max(2, needed), pageCount);
}

/**
 * Divide um PDF em fatias por intervalo de páginas, com overlap opcional.
 * Se falhar (PDF criptografado/corrompido), retorna o original como única fatia.
 */
export async function splitPdfByPages(
  buffer: Buffer,
  sourceFilename: string,
  options: SplitPdfOptions = {},
): Promise<PdfSlice[]> {
  const overlapPages = Math.max(0, options.overlapPages ?? 1);
  try {
    const src = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pageCount = src.getPageCount();
    if (pageCount <= 1 || !shouldSplitPdf(buffer.length, options)) {
      return [
        {
          filename: sourceFilename,
          buffer,
          sourceFilename,
          partIndex: 0,
          partCount: 1,
          pageStart: 1,
          pageEnd: Math.max(1, pageCount),
          sizeBytes: buffer.length,
        },
      ];
    }

    const partCount = planPdfPartCount(buffer.length, pageCount, options);
    const baseSize = Math.ceil(pageCount / partCount);
    const slices: PdfSlice[] = [];

    for (let i = 0; i < partCount; i++) {
      let start = i * baseSize;
      let end = i === partCount - 1 ? pageCount : Math.min(pageCount, (i + 1) * baseSize);
      if (i > 0) start = Math.max(0, start - overlapPages);
      if (end <= start) end = Math.min(pageCount, start + 1);

      const out = await PDFDocument.create();
      const indices = Array.from({ length: end - start }, (_, k) => start + k);
      const copied = await out.copyPages(src, indices);
      copied.forEach((p) => out.addPage(p));
      const bytes = Buffer.from(await out.save());
      const pageStart = start + 1;
      const pageEnd = end;

      slices.push({
        filename: partFilename(sourceFilename, i, partCount, pageStart, pageEnd),
        buffer: bytes,
        sourceFilename,
        partIndex: i,
        partCount,
        pageStart,
        pageEnd,
        sizeBytes: bytes.length,
      });
    }

    return slices.length > 0
      ? slices
      : [
          {
            filename: sourceFilename,
            buffer,
            sourceFilename,
            partIndex: 0,
            partCount: 1,
            pageStart: 1,
            pageEnd: pageCount,
            sizeBytes: buffer.length,
          },
        ];
  } catch (err) {
    console.warn(
      `splitPdfByPages falhou para ${sourceFilename}; enviando arquivo inteiro:`,
      err instanceof Error ? err.message : err,
    );
    return [
      {
        filename: sourceFilename,
        buffer,
        sourceFilename,
        partIndex: 0,
        partCount: 1,
        pageStart: 1,
        pageEnd: 1,
        sizeBytes: buffer.length,
      },
    ];
  }
}

/**
 * Expande lista de PDFs: arquivos grandes viram várias fatias; demais passam intactos.
 */
export async function expandPdfsForContext<
  T extends { filename: string; buffer: Buffer },
>(
  pdfs: T[],
  options: SplitPdfOptions = {},
): Promise<Array<T & PdfSlice>> {
  const out: Array<T & PdfSlice> = [];
  for (const pdf of pdfs) {
    if (!shouldSplitPdf(pdf.buffer.length, options)) {
      out.push({
        ...pdf,
        sourceFilename: pdf.filename,
        partIndex: 0,
        partCount: 1,
        pageStart: 1,
        pageEnd: 1,
        sizeBytes: pdf.buffer.length,
      });
      continue;
    }
    const slices = await splitPdfByPages(pdf.buffer, pdf.filename, options);
    for (const slice of slices) {
      out.push({
        ...pdf,
        filename: slice.filename,
        buffer: slice.buffer,
        sourceFilename: slice.sourceFilename,
        partIndex: slice.partIndex,
        partCount: slice.partCount,
        pageStart: slice.pageStart,
        pageEnd: slice.pageEnd,
        sizeBytes: slice.sizeBytes,
      });
    }
  }
  return out;
}

/** Label de contexto para o modelo (não marcar ausência por estar em outra parte). */
export function buildPdfPartContextLabel(slice: {
  sourceFilename: string;
  partIndex: number;
  partCount: number;
  pageStart: number;
  pageEnd: number;
}): string | null {
  if (!slice.partCount || slice.partCount <= 1) return null;
  return (
    `[PARTE ${slice.partIndex + 1}/${slice.partCount} do arquivo "${slice.sourceFilename}" ` +
    `(páginas ${slice.pageStart}–${slice.pageEnd}). ` +
    `Este é um recorte do mesmo documento. NÃO marque INFORMACAO_AUSENTE só porque um dado ` +
    `pode estar em outra parte — registre o que esta parte contém e indique a limitação. ` +
    `As partes serão consolidadas depois.]`
  );
}

export function isLikelyContextWindowError(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    msg.includes("context_length") ||
    msg.includes("context length") ||
    msg.includes("maximum context") ||
    msg.includes("context window") ||
    msg.includes("too large") ||
    msg.includes("token limit") ||
    msg.includes("max tokens") ||
    (msg.includes("400") && msg.includes("context")) ||
    msg.includes("request too large") ||
    msg.includes("payload too large")
  );
}
