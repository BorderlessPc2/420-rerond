# Relatório — implementação 14/09/2026

**Projeto:** 420-rerond (Rerond)  
**Ambiente:** Firebase `rerond-c747b` — https://rerond-c747b.web.app  
**Commit:** `fa0f600` — `feat: assertividade com checklists, normas PDF, goldens e eval do cliente`

## Objetivo do dia

Consumir o material de treinamento do cliente para tornar a IA **mais assertiva** (checklists corretos por tipologia, normas reais no prompt, casos modelo e forma de medir qualidade), sem fine-tune — só injeção de contexto aprovada.

---

## 1. Checklists e tipos de análise

- Novo módulo `src/config/checklistsCliente.ts` (espelhado em `functions/src/config/`), com orientação de assertividade e requisitos ricos para:
  - **PAN**, **POC**, **PPU**, **PAC viabilidade**, **PAC executivo**, **acesso**
- `TipoAnalise` / seeds atualizados: tipo **PAN**, `normasFontes` ligadas, `promptOrientacao` assertivo
- `tiposAnaliseSeed` nas Functions; built-ins preferem o seed para requisitos/normas/orientação
- Sync one-shot de tipos no Firestore (primeira carga da sessão), sem depender só de coleção vazia

## 2. Normas PDF na análise

- PDFs versionados em `functions/.../normas-pdf/` (SUROD 12/13/111, DER acessos, IPR 728, manual sinalização 738)
- Catálogo `normas.json` com `requerPdf: true`
- `analiseJobProcessor`: além do catálogo, baixa **normas custom do perfil** (`arquivoUrl`) e anexa como `input_file` ao modelo

## 3. Fase 3–4 — goldens + eval (material `.pdf/testes/`)

- **4 casos modelo** em `goldenCaseSeed.ts`, status **`pendente`** (cliente aprova em `/ensinar-ia`):
  1. POC EDP Viana — 15 pares gabarito × programa (comparativo)
  2. PAC — tipagem exige checklist PAC
  3. PPU — checklist específico (não ocupação genérica)
  4. POC — ausência real × falha de leitura / estabilidade
- Sync: cria no Firestore **somente se o doc não existir** (não sobrescreve aprovação)
- Banner na UI quando há `cliente-*` pendentes
- Suite `evalAssertividadeCliente.ts` + playbook `docs-ia/treinamento-cliente/EVAL_ASSERTIVIDADE.md`
- Testes unitários do scorer (vitest)

## 4. Documentação e higiene

- `docs-ia/treinamento-cliente/MANIFESTO.md` — mapa arquivo → destino → status
- Guia Ensinar a IA atualizado (seeds do cliente / aprovação)
- `.gitignore`: pasta `.pdf/` (binários brutos fora do git)

---

## Deploy

| Alvo | Status |
|------|--------|
| Hosting | Deployado (inclui fase 3–4) |
| Functions (`analisarSolicitacao`, `processAnaliseJob`, `formatarRelatorioComplementos`) | Deployado com normas PDF + checklists |
| Remote `origin/main` | Push do commit `fa0f600` |

---

## Como validar

1. Abrir **Ensinar a IA** → filtrar **pendente** → revisar/aprovar goldens `cliente-*`
2. Rodar análise **POC** e conferir findings em `EVAL_ASSERTIVIDADE.md` / `eval-poc-edp-viana`
3. Confirmar que normas SUROD/DER aparecem no contexto da análise (processor)

---

## Ainda pendente (fora deste dia)

| Item | Motivo |
|------|--------|
| Excel `Ampliações PER - *.xlsx` | Backlog PER |
| Classificar `pdf 1.pdf` / `pdf 2.pdf` | Origem indefinida |
| Scorer automático vs OpenAI | Eval ainda manual |
| Embeddings / RAG semântico | Backlog Sprint 8 |
| Validação empírica completa com gabarito em produção | Depende de rodar casos reais + aprovação dos goldens |

---

## Arquivos principais

- `src/config/checklistsCliente.ts`
- `src/config/evalAssertividadeCliente.ts`
- `src/models/TipoAnalise.ts`
- `src/services/goldenCase/goldenCaseSeed.ts`
- `src/services/goldenCase/goldenCaseService.ts`
- `functions/src/services/analiseJobProcessor.ts`
- `functions/src/config/normas.json` + `normas-pdf/`
- `docs-ia/treinamento-cliente/*`
