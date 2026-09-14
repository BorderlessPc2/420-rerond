# Manifesto — material do cliente para assertividade da IA

Pasta bruta: `.pdf/` (não versionar binários — ver `.gitignore`).

| Arquivo | Destino no sistema | Status |
|---------|--------------------|--------|
| `PAN - CHECKLIST.pdf` | Tipo `pan` + requisitos `PAN_*` | seed |
| `PPU - CHECKLIST.pdf` | Tipo `ppu` + requisitos `PPU_*` | seed |
| `POC - CAPIXABA.pdf` / `POC - ARAGUAIA.pdf` | Tipo `poc` + requisitos `POC_*` | seed |
| `PAC - VIABILIDADE - CAPIXABA.pdf` | Tipo `pac-viabilidade` | seed |
| `PAC - EXECUTIVO - *.pdf` | Tipo `pac-executivo` | seed |
| `SUROD - 12/13/111.pdf` | Catálogo `normas.json` + `functions/.../normas-pdf/` | seed |
| `DER Instrucoes...` / `IPR 728...` / `738_manual...` | Fontes normativas + PDF no modelo | seed |
| `Ampliações PER - *.xlsx` | Backlog PER/ocupação | pendente |
| `testes/ANÁLISE GABARITO.pdf` + `COMPARATIVO` | Eval `eval-poc-edp-viana` + golden `cliente-poc-edp-viana-*` | fase 3–4 |
| `testes/AVALIAÇÃO DA FERRAMENTA...pdf` | Goldens tipagem PAC/PPU + meta-eval | fase 3–4 |
| `testes/RELATÓRIO GERADO...` / `TESTE 2...` | Baseline / referência | fase 3–4 |
| `pdf 1.pdf` / `pdf 2.pdf` | Classificar | pendente |

Código:
- Checklists: `src/config/checklistsCliente.ts` (espelhado em `functions/src/config/`)
- Eval: `src/config/evalAssertividadeCliente.ts` + `docs-ia/treinamento-cliente/EVAL_ASSERTIVIDADE.md`
- Goldens: `src/services/goldenCase/goldenCaseSeed.ts` (status **pendente**)

Aprovação de golden cases: **cliente** na UI `/ensinar-ia` (filtrar status pendente).
