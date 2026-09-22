import { describe, expect, it } from "vitest";
import { rankByContext } from "./rankByContext";

describe("rankByContext", () => {
  it("nunca retorna item de outro tipo quando existem itens do tipo correto", () => {
    const result = rankByContext({
      items: [
        {
          id: "acesso-1",
          tipoAnaliseId: "acesso",
          text: "acesso drenagem faixa aceleracao",
        },
        {
          id: "ocup-1",
          tipoAnaliseId: "ocupacao-faixa",
          text: "ocupacao longitudinal",
        },
      ],
      tipoAnaliseId: "acesso",
      query: "analise de acesso com drenagem",
      maxItems: 3,
    });

    expect(result.map((item) => item.id)).toEqual(["acesso-1"]);
  });

  it("prioriza organizacao e similaridade textual dentro do mesmo tipo", () => {
    const result = rankByContext({
      items: [
        {
          id: "generico",
          tipoAnaliseId: "poc",
          text: "projeto simples",
        },
        {
          id: "eco101",
          tipoAnaliseId: "poc",
          organizacaoId: "eco101",
          text: "drenagem acesso e faixa de dominio",
        },
      ],
      tipoAnaliseId: "poc",
      organizacaoId: "eco101",
      query: "drenagem em faixa de dominio",
      maxItems: 2,
    });

    expect(result.map((item) => item.id)).toEqual(["eco101"]);
  });

  it("remove itens do mesmo tipo sem similaridade quando nao ha escopo de org", () => {
    const result = rankByContext({
      items: [
        {
          id: "sem-sinal",
          tipoAnaliseId: "poc",
          text: "contrato social e dados cadastrais",
        },
      ],
      tipoAnaliseId: "poc",
      query: "drenagem faixa dominio",
      maxItems: 3,
    });

    expect(result).toEqual([]);
  });
});
