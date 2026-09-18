# Baseline de assertividade - 2026-09-18

## Objetivo

Iniciar a implementação do plano de robustez da IA usando a base documental do cliente em `.pdf/`, com foco em POC EDP Viana.

## Fontes

- `.pdf/testes/ANALISE GABARITO.pdf`
- `.pdf/testes/teste de analise - COMPARATIVO.pdf`
- `.pdf/testes/RELATORIO GERADO POR PROGRAMA.pdf`
- `.pdf/_extract/testes/*.txt`
- `scripts/fixtures/parecer-poc-*.txt`

## Resultados do scorer

Comando:

```bash
npm run score:assertividade -- --relatorio <arquivo> --caso eval-poc-edp-viana --meta 90 --json
```

| Fixture | Score | Críticos OK | Aceite meta |
|---------|-------|-------------|-------------|
| `parecer-poc-baseline-historico.txt` | 14/15 (93,3%) | Não - falha `f-plano-trabalho` | Não |
| `parecer-poc-viana-bom.txt` | 15/15 (100%) | Sim | Sim |
| `parecer-poc-viana-ruim.txt` | 1/15 (6,7%) | Não | Não |

## Decisão técnica

O percentual geral não é suficiente para aceitar uma análise: findings críticos são gate obrigatório. O baseline histórico reprova mesmo com 93,3% porque inventa problema no Plano de Trabalho.

## Implementação feita

- `score:assertividade` agora usa `scripts/scoreAssertividadeRelatorio.mjs`, sem depender de `tsx`.
- `evalAssertividadeFixtures.test.ts` fixa regressão dos fixtures POC.
- `test:assertividade` inclui a regressão de fixtures.

## Próximo passo operacional

Rodar análise real em produção para `tipoAnaliseId=poc` com o pacote EDP Viana e conferir:

- `goldenCaseIdsInjetados` com os casos `cliente-poc-*`
- 100% dos findings críticos OK
- pelo menos 90% geral
