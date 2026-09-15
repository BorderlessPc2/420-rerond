# Resultado da validação — 15/09/2026 (pós-aprovação dos goldens)

## Confirmação Firestore

| ID | Status | Tipo | Pares |
|----|--------|------|-------|
| `cliente-poc-edp-viana-comparativo` | aprovado + ativo | poc | 15 |
| `cliente-poc-leitura-vs-ausencia` | aprovado + ativo | poc | 2 |
| `cliente-pac-tipologia-checklist` | aprovado + ativo | pac | 2 |
| `cliente-ppu-checklist-especifico` | aprovado + ativo | ppu | 2 |

Injeção simulada (máx. 3): POC→2, PAC→1, PPU→1.

## Testes automatizados

- `evalAssertividadeCliente.test.ts` — OK
- `goldenClienteCoverage.test.ts` — OK
- Cobertura lexical findings críticos no bloco POC — **7/7 OK**
- PDFs normativos em `functions/lib/config/normas-pdf` — **6/6 OK**

## Simulação OpenAI (cenário sintético EDP Viana + goldens)

Comando: `npx tsx scripts/validateAssertividadeCliente.ts`

| Métrica | Resultado |
|---------|-----------|
| Findings cobertos | **13/15 (86,7%)** |
| Findings críticos | **todos OK** |
| Anti-padrões evitados | perfil não marcado ausente; plano de trabalho sem inventar falha; planta/sinalização objetados |

Findings não marcados no juiz (não críticos / cobertos indiretamente): `f-pba`, `f-especificacoes`.

## Ainda não feito (empírico completo na UI)

Rodar **análise real** tipo POC com o pacote documental do processo e conferir:

1. Log / campo `goldenCaseIdsInjetados` contendo os IDs `cliente-poc-*`
2. Checklist do playbook `EVAL_ASSERTIVIDADE.md` item a item no relatório gerado

Sem service account local válido (`FIREBASE_CLIENT_EMAIL` vazio / `firebase-service-account.json` ausente), não foi possível listar jobs recentes via Admin SDK nesta máquina.
