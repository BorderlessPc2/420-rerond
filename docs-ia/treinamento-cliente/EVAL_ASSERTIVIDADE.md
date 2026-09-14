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

## Como rodar (manual)

1. Criar solicitação tipo **POC** com o pacote EDP Viana (ou o mais próximo disponível).
2. Rodar análise em produção.
3. Abrir o caso `eval-poc-edp-viana` no módulo de eval e marcar cada `finding` como OK / falha.
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
