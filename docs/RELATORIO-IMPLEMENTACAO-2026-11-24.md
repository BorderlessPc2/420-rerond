# Relatório de implementação — Análises IA

**Data:** 24/11/2026  
**Projeto:** 420-rerond  
**Branch:** `fix/avaliacao-ia-cliente`  
**Aplicação:** https://rerond-c747b.web.app  
**Firebase project:** `rerond-c747b`

## Resumo

Uma análise com PDF grande parava no meio e não gerava o relatório. A pausa para continuar em outra execução marcava o job como em andamento, e o processador só aceitava job na fila, então descartava a retomada. A continuação agora segue os lotes que faltam. Se o prazo ou o limite de chamadas impedir seguir, o job encerra com mensagem e a opção de tentar de novo. As Functions foram publicadas em produção.

## O que acontecia

O módulo entra em Análises, cria um job e a Function `processAnaliseJob` lê os PDFs. Quando o arquivo é grande, ele é fatiado. Se a execução passa de 7,5 minutos com lotes ainda pendentes, o job pede continuação.

A Function `continueAnaliseJob` reivindicava esse job e gravava o estado `analyzing` antes de chamar o processador. O processador via qualquer estado diferente de `queued` e saía sem processar o restante. A barra ficava em andamento até o prazo estourar, sem relatório.

## O que passou a valer

- Job na fila continua sendo processado.
- Job já reivindicado como continuação (`analyzing`, fase `continuation` e `claimId`) também é processado, a partir dos lotes já salvos.
- Continuação fora do prazo encerra como interrompida (`stale`).
- Continuação acima do limite de tempo ou de chamadas encerra como bloqueada (`blocked`), com o código `continuation_limit`.
- O watchdog percorre as solicitações pelo identificador do documento, inclusive as que não têm `updatedAt`.
- No overlay, o texto de créditos e billing só aparece quando a mensagem de erro fala de crédito, billing ou cota. Outro bloqueio orienta a editar a solicitação e tentar de novo.

## Execução observada em produção

Por volta de 11:49 (UTC−3), uma análise do arquivo `EC1-101ES-057+700-ACE-PIT-ID-Z9-002-R00.pdf` na solicitação `US0F7BWoDhIkRf5bZTCy` dividiu o PDF em 3 partes e carregou 9 trechos de referência. A barra ficou perto de 70% enquanto a IA lia a primeira parte e avançou para 75% quando a parte seguinte começou. Esse percentual é a etapa de conformidade. Ele anda em saltos, uma vez por parte, e não sobe de forma contínua.

## Publicação

| Item | Resultado |
|------|-----------|
| Functions | `analisarSolicitacao`, `processAnaliseJob`, `continueAnaliseJob`, `watchdogAnaliseJobs` e `formatarRelatorioComplementos` atualizadas em `southamerica-east1`, 24/11/2026, conta `borderlessrerond@gmail.com`. |
| Índice Firestore composto em `analiseJobs` | Não publicado. O Firestore respondeu que a consulta usa índice de campo único e o índice composto não é necessário. |
| Hosting | Não republicado nesta sessão. O aviso do overlay sobre bloqueio sem ser crédito ainda está só no código. |

A conta `novaisrogerio20@gmail.com` não tinha permissão no projeto. A publicação usou `borderlessrerond@gmail.com`.

## Validação

- `jobGuards` e `analysisPolicy`: 12 testes aprovados.
- `npm --prefix functions run build`: passou.
- A análise de produção do PIT citado acima passou da primeira parte e seguiu na seguinte durante esta sessão.

## Arquivos principais

- `functions/src/services/analiseJobProcessor.ts`
- `functions/src/services/jobGuards.ts`
- `functions/src/services/jobGuards.test.ts`
- `functions/src/services/analysisPolicy.ts`
- `functions/src/services/analysisPolicy.test.ts`
- `functions/src/index.ts`
- `src/components/AnaliseProgressOverlay.tsx`

## Fora deste commit

Não entram no Git: `.superpowers/`, PDF de avaliação da IA, relatórios de outras datas que ainda estavam soltos, `erros-importacao-contratos.xlsx` e `public/proposta-gestao-pontos.html`.
