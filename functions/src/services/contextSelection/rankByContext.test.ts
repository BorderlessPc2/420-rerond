import { describe, expect, it } from "vitest";
import { rankByContext, rankByContextDetailed } from "./rankByContext";

describe("rankByContext", () => {
  it("nunca retorna item de outro tipo quando existem itens do tipo correto", () => {
    const result = rankByContext({
      items: [
        {
          id: "acesso-1",
          tipoAnaliseId: "acesso",
          organizacaoId: "org-1",
          concessionariaId: "conc-1",
          text: "acesso drenagem faixa aceleracao",
        },
        {
          id: "ocup-1",
          tipoAnaliseId: "ocupacao-faixa",
          text: "ocupacao longitudinal",
        },
      ],
      tipoAnaliseId: "acesso",
      organizacaoId: "org-1",
      concessionariaId: "conc-1",
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
          concessionariaId: "conc-1",
          text: "drenagem acesso e faixa de dominio",
        },
      ],
      tipoAnaliseId: "poc",
      organizacaoId: "eco101",
      concessionariaId: "conc-1",
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

  it("prioriza concessionaria atual sobre conteúdo global da mesma organização", () => {
    const result = rankByContext({
      items: [
        {
          id: "global",
          tipoAnaliseId: "poc",
          organizacaoId: "org-1",
          text: "drenagem faixa dominio",
        },
        {
          id: "especifica",
          tipoAnaliseId: "poc",
          organizacaoId: "org-1",
          concessionariaId: "conc-1",
          text: "drenagem faixa dominio",
        },
      ],
      tipoAnaliseId: "poc",
      organizacaoId: "org-1",
      concessionariaId: "conc-1",
      query: "drenagem faixa dominio",
      maxItems: 2,
    })

    expect(result.map((item) => item.id)).toEqual(["especifica", "global"])
  })

  it("prioriza concessionaria atual e marca fallback de outra concessionaria", () => {
    const result = rankByContextDetailed({
      items: [
        {
          id: "outra-concessionaria",
          tipoAnaliseId: "poc",
          organizacaoId: "org-1",
          concessionariaId: "conc-2",
          text: "drenagem faixa dominio",
        },
        {
          id: "mesma-concessionaria",
          tipoAnaliseId: "poc",
          organizacaoId: "org-1",
          concessionariaId: "conc-1",
          text: "drenagem faixa dominio",
        },
      ],
      tipoAnaliseId: "poc",
      organizacaoId: "org-1",
      concessionariaId: "conc-1",
      query: "drenagem faixa dominio",
      maxItems: 3,
    });

    expect(result.map((entry) => entry.item.id)).toEqual([
      "mesma-concessionaria",
      "outra-concessionaria",
    ]);
    expect(result[0]).toMatchObject({
      scope: "same-concessionaria",
      selectionReason: "same-concessionaria",
    });
    expect(result[1]).toMatchObject({
      scope: "cross-concessionaria",
      selectionReason: "cross-concessionaria-fallback",
    });
  });
});
