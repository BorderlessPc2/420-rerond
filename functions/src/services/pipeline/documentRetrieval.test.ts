import { describe, expect, it } from "vitest";
import {
  selecionarChunksRelevantesSync,
  type DocumentChunk,
} from "./documentRetrieval";

describe("selecionarChunksRelevantesSync", () => {
  it("prioriza chunks do tipo correto e com termos do checklist", () => {
    const chunks: DocumentChunk[] = [
      {
        id: "1",
        documentName: "memorial.pdf",
        tipoDocumento: "memorial",
        text: "acesso com faixa de aceleracao e drenagem",
        pageStart: 1,
        pageEnd: 2,
      },
      {
        id: "2",
        documentName: "anexo.pdf",
        tipoDocumento: "outro",
        text: "contrato social da empresa",
        pageStart: 1,
        pageEnd: 1,
      },
      {
        id: "3",
        documentName: "planta.pdf",
        tipoDocumento: "planta",
        text: "ocupacao longitudinal em faixa de dominio",
        pageStart: 3,
        pageEnd: 4,
      },
    ];

    const result = selecionarChunksRelevantesSync({
      chunks,
      query: "avaliar acesso rodoviario com drenagem",
      checklistTerms: ["acesso", "drenagem"],
      maxChunks: 2,
    });

    expect(result.map((chunk) => chunk.id)).toEqual(["1", "3"]);
  });

  it("retorna vazio quando nenhum chunk tem sinal relevante", () => {
    const result = selecionarChunksRelevantesSync({
      chunks: [
        {
          id: "1",
          documentName: "contrato.pdf",
          tipoDocumento: "outro",
          text: "dados cadastrais",
        },
      ],
      query: "drenagem faixa dominio",
      checklistTerms: ["sinalizacao"],
      maxChunks: 3,
    });

    expect(result).toEqual([]);
  });
});
