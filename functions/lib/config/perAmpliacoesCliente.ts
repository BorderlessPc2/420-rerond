/**
 * Taxonomia compacta do inventário PER Via Araguaia
 * (fonte: Ampliações PER - DUPLICAÇÃO Via Araguaia.xlsx).
 * NÃO injeta as ~300 linhas — só categorias + regras de cruzamento.
 */
export const PER_AMPLIACAO_CATEGORIAS = [
  "Duplicação",
  "Faixa Adicional",
  "Via Marginal",
  "Acesso",
  "Trombeta",
  "Diamante",
  "Retorno em X",
  "Retorno em U",
  "Passagem Inferior",
  "Passarela",
  "Rotatória",
  "Contorno",
  "Travessia urbana",
] as const;

export type PerAmpliacaoCategoria = (typeof PER_AMPLIACAO_CATEGORIAS)[number];

export const PER_ARAGUAIA_RESUMO = {
  concessao: "Via Araguaia",
  rodoviasPrincipais: ["BR-153", "BR-414"],
  estados: ["Goiás", "Tocantins"],
  contagemPorCategoria: {
    Duplicação: 58,
    "Faixa Adicional": 8,
    "Via Marginal": 37,
    Acesso: 16,
    Trombeta: 11,
    Diamante: 19,
    "Retorno em X": 105,
    "Retorno em U": 39,
    "Passagem Inferior": 6,
    Passarela: 19,
    Rotatória: 6,
    Contorno: 1,
  } as Record<string, number>,
};

export const ORIENTACAO_PER_ARAGUAIA = `
ORIENTAÇÃO PER — AMPLIAÇÕES VIA ARAGUAIA (referência de tipologias, não checklist de outro processo):
- Quando o tipo normativo for obra prevista no PER (obra_per), classifique a intervenção em uma categoria: ${PER_AMPLIACAO_CATEGORIAS.join(", ")}.
- Cruze rodovia, km inicial/final e município do processo com a categoria declarada; divergência → NAO_CONFORME com evidência.
- NÃO invente trecho/km/categoria PER que não conste nos documentos desta solicitação.
- Distinga Duplicação × Faixa Adicional × Via Marginal × Acesso × dispositivos (Trombeta, Diamante, Retornos, Passarela, Rotatória).
- Inventário de referência (agregado Via Araguaia): rodovias ${PER_ARAGUAIA_RESUMO.rodoviasPrincipais.join(", ")}; UFs ${PER_ARAGUAIA_RESUMO.estados.join(", ")}.
- Exigir coerência tipológica (Art. PER / SUROD 12): localização, configuração e quantitativos compatíveis com a categoria.
- Se o processo for obra NÃO prevista no PER (obra_nao_per), NÃO force enquadramento nas categorias acima.
`.trim();

export const REQ_OBRA_PER_CLIENTE = [
  {
    id: "PER_CATEGORIA_AMPLIACAO",
    descricao:
      "Identificar a categoria de ampliação/dispositivo (Duplicação, Faixa Adicional, Via Marginal, Acesso, Trombeta, Diamante, Retorno, Passarela, etc.).",
    categoria: "ESCOPO",
  },
  {
    id: "PER_LOCALIZACAO_KM",
    descricao:
      "Rodovia, km inicial/final e município coerentes com o trecho PER declarado nos documentos.",
    categoria: "LOCALIZACAO",
  },
  {
    id: "PER_CONFIGURACAO_TIPOLOGIA",
    descricao:
      "Configuração e tipologia da obra compatíveis com a categoria PER (não misturar Duplicação com Faixa Adicional sem lastro).",
    categoria: "TECNICO",
  },
  {
    id: "PER_QUANTITATIVOS",
    descricao:
      "Extensão/quantidade informada coerente com a natureza da ampliação e com os anexos.",
    categoria: "QUANTITATIVO",
  },
  {
    id: "PER_DOCS_SUROD12",
    descricao:
      "Volumes/codificação e documentação mínima conforme SUROD 12 aplicável a obra PER.",
    categoria: "DOCUMENTAL",
  },
];
