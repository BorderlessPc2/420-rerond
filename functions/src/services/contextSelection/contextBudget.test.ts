import { describe, expect, it } from "vitest";
import { allocateContextBudget } from "./contextBudget";

describe("allocateContextBudget", () => {
  it("reserva saída e distribui orçamento entre blocos", () => {
    const result = allocateContextBudget({
      maxTokens: 1000,
      blocks: {
        system: 400,
        requisitos: 300,
        normas: 300,
        memoria: 200,
        golden: 200,
        feedback: 200,
        rag: 200,
        pdf: 500,
      },
      outputReserve: 200,
    });

    expect(result.totalAllocated).toBeLessThanOrEqual(800);
    expect(result.outputReserve).toBe(200);
    expect(result.blocks.system).toBeGreaterThan(0);
    expect(result.blocks.requisitos).toBeGreaterThan(0);
  });

  it("prioriza sistema e requisitos quando orçamento é insuficiente", () => {
    const result = allocateContextBudget({
      maxTokens: 100,
      blocks: {
        system: 80,
        requisitos: 80,
        normas: 80,
        memoria: 80,
        golden: 80,
        feedback: 80,
        rag: 80,
        pdf: 80,
      },
      outputReserve: 20,
    });

    expect(result.blocks.system).toBeGreaterThanOrEqual(result.blocks.pdf);
    expect(result.blocks.requisitos).toBeGreaterThanOrEqual(result.blocks.pdf);
    expect(result.totalAllocated).toBeLessThanOrEqual(80);
  });
});
