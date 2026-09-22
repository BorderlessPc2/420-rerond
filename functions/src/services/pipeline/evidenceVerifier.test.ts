import { describe, expect, it } from "vitest";
import { verificarEvidencias } from "./evidenceVerifier";

describe("verificarEvidencias", () => {
  it("marca item fragil quando falta localizacao ou justificativa", () => {
    const result = verificarEvidencias([
      {
        id: "A",
        status: "NAO_CONFORME",
        evidencia: "Memorial cita largura de 4m",
        localizacao: "memorial.pdf p. 4",
        justificativa: "Norma exige largura minima de 5m",
        norma: "Norma X",
      },
      {
        id: "B",
        status: "INFORMACAO_AUSENTE",
        evidencia: "",
        localizacao: "",
        justificativa: "Nao encontrado",
        norma: "Norma Y",
      },
    ]);

    expect(result.itensFrageis).toEqual(["B"]);
    expect(result.percentualComEvidenciaCompleta).toBe(0.5);
  });

  it("aceita campos alternativos produzidos por diferentes prompts", () => {
    const result = verificarEvidencias([
      {
        codigo: "C",
        situacao: "não conforme",
        evidências: "Planta mostra acesso no km informado",
        página: "planta.pdf p. 2",
        motivo: "Há divergência com o afastamento exigido",
        fundamentação: "Portaria SUROD",
      },
    ]);

    expect(result.itensFrageis).toEqual([]);
    expect(result.percentualComEvidenciaCompleta).toBe(1);
  });
});
