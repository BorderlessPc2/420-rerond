# Eval de assertividade — material `.pdf/testes/`

## Objetivo

Conferir se a análise da IA se aproxima do **gabarito humano**, não só do índice de conformidade.

## Fontes

| Arquivo | Uso |
|---------|-----|
| `ANÁLISE GABARITO.pdf` | Verdade de referência (POC EDP Viana) |
| `teste de analise - COMPARATIVO.pdf` | Errado × certo item a item |
| `RELATÓRIO GERADO POR PROGRAMA.pdf` | Baseline antigo (erros) |
| `AVALIAÇÃO DA FERRAMENTA...pdf` | Tipologia, checklist, estabilidade |
| `TESTE 2 PROGRAMA BASEINFRA.pdf` | Extra (pouco texto extraível) |

Código estruturado: `src/config/evalAssertividadeCliente.ts`  
Goldens derivados (pendentes): `src/services/goldenCase/goldenCaseSeed.ts`

## Validação automatizada (wiring)

Rodar na raiz:

```bash
npx vitest run src/config/assertividadeWiring.test.ts src/config/evalAssertividadeCliente.test.ts
```

Cobre: isolamento de prefixos por tipo, PDFs de norma no bundle, goldens pendentes, findings do gabarito.

## Validação empírica (produção — manual)

1. Em `/ensinar-ia`, filtrar **pendente** e **aprovar** ao menos o golden `poc/cliente-edp-viana-001` (e tipagem PAC/PPU se for testar esses tipos).
2. Nova solicitação tipo **POC** com pacote documental real (ideal: EDP Viana).
3. Rodar análise e pontuar com `scoreEvalCaso` / checklist do caso `eval-poc-edp-viana`.
4. Aceite sugerido: 100% críticos OK e ≥70% total; licença ambiental mantida.
5. Comparar com baseline antigo (`RELATÓRIO GERADO POR PROGRAMA.pdf`) — lessões do comparativo não devem se repetir.

## Como rodar (manual — resumo)

1. Criar solicitação tipo **POC** com o pacote EDP Viana (ou o mais próximo disponível).
2. Rodar análise em produção.
3. Abrir o caso `eval-poc-edp-viana` e marcar cada `finding` como OK / falha.
4. Critério de aceite sugerido:
   - **100% dos findings `critico`** OK
   - ≥ **70%** do total OK
   - Licença ambiental continua apontada (acerto histórico)
5. Casos modelo: em `/ensinar-ia`, filtrar status **pendente** → aprovar os `poc/cliente-*`, `pac/cliente-*`, `ppu/cliente-*` após revisão.

## Sync dos goldens

Na primeira listagem de golden cases na sessão, seeds `cliente-*` são criados no Firestore **somente se o doc ainda não existir** (nunca sobrescreve aprovação/rejeição).

## Fora desta fase

- Excel PER
- Classificar `pdf 1.pdf` / `pdf 2.pdf`
- Scorer automático contra OpenAI (próximo passo opcional)
