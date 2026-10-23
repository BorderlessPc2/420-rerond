export interface RankableContextItem {
  id: string;
  tipoAnaliseId?: string | null;
  organizacaoId?: string | null;
  concessionariaId?: string | null;
  text: string;
  updatedAtMs?: number;
  createdAtMs?: number;
}

export interface RankByContextParams<T extends RankableContextItem> {
  items: T[];
  tipoAnaliseId: string;
  organizacaoId?: string | null;
  concessionariaId?: string | null;
  query: string;
  maxItems: number;
  minTextScore?: number;
}

export type ContextSelectionScope = "same-concessionaria" | "global" | "cross-concessionaria";

export type ContextSelectionReason =
  | "same-concessionaria"
  | "global-organization"
  | "cross-concessionaria-fallback";

export interface RankedContextItem<T extends RankableContextItem> {
  item: T;
  textScore: number;
  score: number;
  scope: ContextSelectionScope;
  selectionReason: ContextSelectionReason;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function scoreText(text: string, query: string): number {
  const haystack = normalize(text);
  const terms = normalize(query)
    .split(/\s+/)
    .filter((term) => term.length > 3);
  return terms.filter((term) => haystack.includes(term)).length;
}

export function rankByContextDetailed<T extends RankableContextItem>(
  params: RankByContextParams<T>,
): RankedContextItem<T>[] {
  if (params.maxItems <= 0) return [];

  const tipoId = params.tipoAnaliseId.trim();
  const sameType = params.items.filter((item) => item.tipoAnaliseId === tipoId);
  const pool =
    sameType.length > 0
      ? sameType
      : params.items.filter((item) => !item.tipoAnaliseId);
  const scopedPool = pool.filter((item) => {
    if (!params.organizacaoId) return !item.organizacaoId;
    return item.organizacaoId === params.organizacaoId;
  });

  return scopedPool
    .map((item) => {
      const textScore = scoreText(item.text, params.query);
      const isSameConcessionaria =
        Boolean(params.concessionariaId) && item.concessionariaId === params.concessionariaId;
      const isGlobal = !item.concessionariaId;
      const scope: ContextSelectionScope = isSameConcessionaria
        ? "same-concessionaria"
        : isGlobal
          ? "global"
          : "cross-concessionaria";
      const selectionReason: ContextSelectionReason = isSameConcessionaria
        ? "same-concessionaria"
        : isGlobal
          ? "global-organization"
          : "cross-concessionaria-fallback";
      const orgScore = item.organizacaoId ? 4 : 2;
      const concessionariaScore = isSameConcessionaria ? 3 : 0;
      const scopeScore = isGlobal ? 1 : 0;
      const recencyScore =
        (item.updatedAtMs ?? item.createdAtMs ?? 0) / 1_000_000_000_000;
      return {
        item,
        textScore,
        scope,
        selectionReason,
        score: textScore + orgScore + concessionariaScore + scopeScore + recencyScore,
      };
    })
    .filter((entry) => {
      if (entry.textScore >= (params.minTextScore ?? 1)) return true;
      if (entry.scope === "same-concessionaria" || entry.scope === "global") {
        return Boolean(params.organizacaoId);
      }
      return false;
    })
    .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
    .slice(0, params.maxItems);
}

export function rankByContext<T extends RankableContextItem>(
  params: RankByContextParams<T>,
): T[] {
  return rankByContextDetailed(params).map((entry) => entry.item);
}
