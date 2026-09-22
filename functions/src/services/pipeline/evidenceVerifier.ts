export interface EvidenceChecklistItem {
  id: string;
  status: string;
  evidencia?: string;
  localizacao?: string;
  justificativa?: string;
  norma?: string;
}

export interface EvidenceVerificationResult {
  totalItens: number;
  itensFrageis: string[];
  percentualComEvidenciaCompleta: number;
}

function hasContent(value: string | undefined): boolean {
  return Boolean(value && value.trim().length >= 3);
}

function readString(raw: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function normalizeStatus(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function isConforme(status: string): boolean {
  const normalized = normalizeStatus(status);
  return ["CONFORME", "OK", "APROVADO", "SIM", "PRESENTE"].includes(normalized);
}

export function normalizeEvidenceChecklistItem(
  item: unknown,
  index: number,
): EvidenceChecklistItem | null {
  if (!item || typeof item !== "object") return null;
  const raw = item as Record<string, unknown>;
  const id =
    readString(raw, ["id", "codigo", "item", "regraId", "checklistId"]) ??
    `item-${index + 1}`;
  const status =
    readString(raw, ["status", "situacao", "resultado", "veredito"]) ?? "INDEFINIDO";

  return {
    id,
    status,
    evidencia: readString(raw, ["evidencia", "evidência", "evidencias", "evidências"]),
    localizacao: readString(raw, [
      "localizacao",
      "localização",
      "arquivoPagina",
      "pagina",
      "página",
    ]),
    justificativa: readString(raw, ["justificativa", "motivo", "analise", "análise"]),
    norma: readString(raw, ["norma", "normaRelacionada", "fundamentacao", "fundamentação"]),
  };
}

export function verificarEvidencias(
  itens: Array<EvidenceChecklistItem | unknown>,
): EvidenceVerificationResult {
  const normalized = itens
    .map((item, index) =>
      "id" in Object(item) && "status" in Object(item)
        ? (item as EvidenceChecklistItem)
        : normalizeEvidenceChecklistItem(item, index),
    )
    .filter((item): item is EvidenceChecklistItem => Boolean(item));

  const itensFrageis = normalized
    .filter((item) => {
      if (isConforme(item.status)) return false;
      return (
        !hasContent(item.evidencia) ||
        !hasContent(item.localizacao) ||
        !hasContent(item.justificativa) ||
        !hasContent(item.norma)
      );
    })
    .map((item) => item.id);

  const totalItens = normalized.length;
  const completos = totalItens - itensFrageis.length;

  return {
    totalItens,
    itensFrageis,
    percentualComEvidenciaCompleta: totalItens === 0 ? 0 : completos / totalItens,
  };
}
