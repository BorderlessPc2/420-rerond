export type ContextBlockName =
  | "system"
  | "requisitos"
  | "normas"
  | "memoria"
  | "golden"
  | "feedback"
  | "rag"
  | "pdf";

export type ContextBlockSizes = Record<ContextBlockName, number>;

export interface ContextBudgetResult {
  blocks: ContextBlockSizes;
  outputReserve: number;
  totalAllocated: number;
}

const PRIORITY: ContextBlockName[] = [
  "system",
  "requisitos",
  "normas",
  "memoria",
  "golden",
  "feedback",
  "rag",
  "pdf",
];

export function allocateContextBudget(params: {
  maxTokens: number;
  blocks: ContextBlockSizes;
  outputReserve: number;
}): ContextBudgetResult {
  const available = Math.max(0, params.maxTokens - Math.max(0, params.outputReserve));
  const requestedTotal = PRIORITY.reduce(
    (total, name) => total + Math.max(0, params.blocks[name]),
    0,
  );
  const result = {} as ContextBlockSizes;
  let remaining = available;

  for (const name of PRIORITY) {
    const requested = Math.max(0, params.blocks[name]);
    const share = requestedTotal > 0 ? Math.floor((requested / requestedTotal) * available) : 0;
    const allocated = Math.min(requested, Math.max(0, Math.min(remaining, share)));
    result[name] = allocated;
    remaining -= allocated;
  }

  if (remaining > 0) {
    for (const name of PRIORITY) {
      const room = Math.max(0, params.blocks[name] - result[name]);
      const extra = Math.min(room, remaining);
      result[name] += extra;
      remaining -= extra;
      if (remaining === 0) break;
    }
  }

  return {
    blocks: result,
    outputReserve: Math.max(0, params.outputReserve),
    totalAllocated: available - remaining,
  };
}
