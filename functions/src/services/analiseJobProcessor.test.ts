import { describe, expect, it } from "vitest";
import {
  buildDocumentoProjetoLabel,
  isPecaGraficaTipoDocumento,
} from "./analiseJobProcessor";

describe("buildDocumentoProjetoLabel", () => {
  it("marca tipos graficos para reduzir falso negativo de planta/desenho", () => {
    expect(isPecaGraficaTipoDocumento("projeto_geometrico")).toBe(true);
    expect(isPecaGraficaTipoDocumento("projeto_drenagem")).toBe(true);
    expect(isPecaGraficaTipoDocumento("memorial_descritivo")).toBe(false);

    const label = buildDocumentoProjetoLabel(
      "geometrico.pdf",
      [
        {
          url: "gs://bucket/geometrico.pdf",
          nome: "Projeto geometrico R02.pdf",
          tipoDocumento: "projeto_geometrico",
        },
      ],
      "gs://bucket/geometrico.pdf",
    );

    expect(label).toContain("PEÇA GRÁFICA");
    expect(label).toContain("NÃO FOI POSSÍVEL AVALIAR");
    expect(label).toContain("tipoDocumento=projeto_geometrico");
  });
});
