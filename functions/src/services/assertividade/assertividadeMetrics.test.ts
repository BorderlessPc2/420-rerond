import { describe, expect, it } from "vitest";
import {
  calcularMetricasAssertividade,
  type CasoAvaliado,
} from "./assertividadeMetrics";

describe("calcularMetricasAssertividade", () => {
  it("calcula score medio, criticos ok e taxa de correcao humana", () => {
    const casos: CasoAvaliado[] = [
      {
        id: "poc-001",
        tipoAnaliseId: "poc",
        score: 0.92,
        criticosOk: true,
        teveCorrecaoHumana: false,
      },
      {
        id: "poc-002",
        tipoAnaliseId: "poc",
        score: 0.74,
        criticosOk: false,
        teveCorrecaoHumana: true,
      },
      {
        id: "ppu-001",
        tipoAnaliseId: "ppu",
        score: 0.88,
        criticosOk: true,
        teveCorrecaoHumana: true,
      },
    ];

    const result = calcularMetricasAssertividade(casos);

    expect(result.totalCasos).toBe(3);
    expect(result.scoreMedio).toBeCloseTo(0.847, 3);
    expect(result.percentualCriticosOk).toBeCloseTo(0.667, 3);
    expect(result.percentualComCorrecaoHumana).toBeCloseTo(0.667, 3);
    expect(result.porTipo.poc.scoreMedio).toBeCloseTo(0.83, 2);
    expect(result.porTipo.ppu.totalCasos).toBe(1);
  });

  it("retorna zeros para lista vazia", () => {
    const result = calcularMetricasAssertividade([]);

    expect(result.totalCasos).toBe(0);
    expect(result.scoreMedio).toBe(0);
    expect(result.percentualCriticosOk).toBe(0);
    expect(result.percentualComCorrecaoHumana).toBe(0);
    expect(result.porTipo).toEqual({});
  });
});
