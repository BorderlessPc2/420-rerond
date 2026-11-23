# Relatório de auditoria — Lifecycle de análises IA

**Data:** 2026-11-23  
**Escopo:** mudanças realizadas na sessão, cruzadas com `docs/superpowers/specs/2026-11-23-lifecycle-analises-final.md`.

## Resumo executivo

A implementação avançou nos pontos centrais: watchdog agendado, paginação, finalização transacional, reconciliação de referências quebradas, heartbeat, limites de custo, continuação protegida, classificação de falhas, estados `blocked`/`stale` e UX de cooldown.

Build e testes existentes passam, mas a implementação ainda não atende 100% da spec. Há gaps de integração e dois riscos relevantes antes de deploy:

1. O botão de retry exibido nos cards ignora cooldown e abre o modal diretamente.
2. O watchdog usa `orderBy("updatedAt")`, podendo excluir jobs legados sem `updatedAt` e exigindo índice composto não verificado.

Também faltam testes de integração/E2E para provar concorrência, watchdog, ownership e retry manual.

## Implementado hoje

### Backend

- `watchdogAnaliseJobs` em Cloud Functions agendada a cada minuto.
- Paginação do watchdog em lotes de 50.
- Processamento sequencial dos jobs para evitar rajada de transações.
- Detecção por `heartbeatAt`, `updatedAt` e `deadlineAt`.
- Finalização de stale por `finalizeAnalysisJob`.
- Reconciliação de solicitação com `activeAnaliseJobId` apontando para job inexistente ou terminal.
- Enqueue com estado, fase, heartbeat, deadline e contadores iniciais.
- Tratamento transacional de job ativo stale antes da criação de job novo.
- Continuação com claim transacional, ownership, `continuationCount`, fase e heartbeat.
- Finalizadores com validação de ownership também para sucesso.
- Preservação de telemetry, evidências e IDs RAG no resultado/falha.
- Wrapper `providerCall.ts` com validação de deadline, limite de chamadas e heartbeat.
- Classificação centralizada de erros e retry baseado em `classifyAnalysisError`.
- Cooldown backend de 30 segundos e bloqueio subsequente de 60 segundos.
- Endpoint legado bloqueado por padrão com `410 Gone`.

### Frontend

- Estados `blocked`, `stale`, `cancelled`, `retry_waiting` e `continuation_waiting`.
- Overlay próprio para falha bloqueada e execução interrompida.
- Percentual zero para estados de falha.
- Contador visual de cooldown no botão do overlay.
- Modelo frontend com `retryBlockedUntil`, `manualRetryCount` e campos de erro.
- Reentrada no módulo não inicia job novo por si só.
- Remoção do estado morto `jobStaleIds`.

### Testes e gates

Executados com sucesso:

```text
npm run build
npm run test -- --run
npm --prefix functions run build
 git diff --check
```

Resultado atual: 41 arquivos de teste e 183 testes aprovados.

## Matriz contra critérios de aceite

| Critério | Status | Observação |
|---|---|---|
| Frontend não decide stale | Parcialmente atendido | Não há mutação stale no frontend; ainda há lógica de abertura automática para jobs ativos persistidos. |
| Job ativo possui heartbeat/deadline/contadores | Parcial | Jobs novos sim; jobs legados dependem de lazy migration/watchdog. |
| Watchdog sem abrir tela | Atendido em código | Deploy e índice Firestore ainda precisam validação operacional. |
| Ownership ao limpar referência | Parcialmente atendido | Finalizador valida; reconciliação usa transação. Enqueue stale atualiza job antigo, mas não limpa explicitamente ownership antes do novo update. |
| Crédito sem retry automático | Parcial | Chamadas principais usam wrapper, mas `withRetry` continua presente e precisa de teste com erro estruturado real. |
| Crédito sem split automático | Não comprovado | Falta teste de integração do caminho de split/fallback. |
| Retry manual 30/60s | Parcial | Backend calcula bloqueio; overlay respeita. Botão do card ainda abre modal diretamente. |
| Continuação com limites | Parcialmente atendido | Claim protegido; falha acima do limite apenas retorna sem persistir `blocked`/`stale`. |
| Provider bloqueado após deadline | Atendido no wrapper | Precisa teste de integração. |
| Provider limitado por chamadas | Atendido no wrapper | Precisa teste de concorrência; incremento transacional existe. |
| UX blocked/stale | Atendido parcialmente | Overlay correto; cooldown não cobre botão do card. |
| Reentrada não dispara análise | Parcial | `loadSolicitacoes` retoma listener de job ativo persistido; isso acompanha execução, mas pode reabrir overlay de job que deveria ter sido encerrado antes do watchdog. |
| Cloud Functions caminho oficial | Parcial | Endpoint legado bloqueado, código antigo ainda existe. |
| Endpoint legado bloqueado | Atendido em código | Falta teste automatizado do 410 e confirmação de consumidores. |
| Testes de lifecycle | Não atendido | Existem testes de política, mas não integração Firestore, watchdog, concorrência ou E2E. |
| Gates de build | Atendido | Passaram, com warnings existentes. |
| Sem artefatos compilados não intencionais | Não atendido | `functions/lib` foi regenerado e aparece no diff; confirmar política do repositório antes de commit. |

## Achados priorizados

### P0 — corrigir antes de deploy

#### P0.1 Retry de card ignora cooldown

Local: `src/views/Solicitacoes.tsx:569-581`

O botão `Tentar novamente` faz:

```tsx
onClick={() => setModalReanaliseAberto(solicitacao)}
```

Ele não chama `retryFailedAnalysis`, não consulta `retryBlockedUntil` e não desabilita durante cooldown.

Impacto: usuário pode iniciar o fluxo manual antes dos 30/60 segundos. O backend ainda bloqueia, mas a UX fica divergente e o modal pode induzir tentativa inválida.

Correção futura: centralizar retry em callback único que verifica cooldown e refletir estado disabled no card.

#### P0.2 Watchdog pode ignorar jobs legados sem `updatedAt`

Local: `functions/src/index.ts:547-552`

A consulta usa:

```ts
.orderBy("updatedAt")
```

Jobs antigos sem `updatedAt` podem não aparecer na consulta. Isso contradiz a migração lazy, que exige watchdog cobrir jobs ativos sem timestamp confiável.

Impacto: job órfão antigo pode permanecer ativo.

Correção futura: consulta compatível com dados legados, migração explícita ao ler, ou estratégia separada para jobs sem timestamp. Validar índice composto no Firestore.

### P1 — corrigir na próxima rodada

#### P1.1 Falha de continuação acima do limite não persiste estado

Local: `functions/src/index.ts:580-614`

Quando `canContinueJob` retorna falso, a função apenas retorna. A spec exige `stale` ou `blocked` conforme motivo.

Impacto: job pode continuar em `continuation_waiting` sem explicação nem encerramento.

#### P1.2 Retry manual não cria explicitamente novo job

O backend bloqueia por timestamp, mas o fluxo atual chama a mesma função de enqueue após o modal. Não há teste ou marcador explícito garantindo que job anterior `blocked` não é reutilizado e que novo job tem `phase: "retry"`.

#### P1.3 Reconciliação percorre todas as solicitações a cada minuto

O watchdog pagina a collection inteira `solicitacoes`, lê cada referência ativa individualmente e pode gerar custo alto em escala.

Correção futura: query filtrada por estados ativos/referência, índice dedicado, ou coleção de jobs como fonte primária de reconciliação.

#### P1.4 Watchdog exige índices não verificados

As consultas usam `collectionGroup`, `where in`, `orderBy` e paginação. O arquivo de índices não foi atualizado nem validado em emulador/deploy.

Impacto: função pode falhar em produção com erro de índice ausente.

#### P1.5 Finalização de stale não registra categoria específica

`finalizeAnalysisJob` recebe `state: "stale"` sem `failure`, portanto `failureCategory` pode ficar `null`. A spec pede motivo persistido em `failureCategory` e `error`.

#### P1.6 Política de heartbeat diverge do limite `heartbeatStaleMs`

`JOB_LIMITS.heartbeatStaleMs` continua declarado, mas `isJobStale` usa somente os limites por estado. O campo ficou sem efeito e pode induzir manutenção incorreta.

#### P1.7 Provider wrapper não controla todas as decisões do pipeline

Chamadas foram migradas para `providerCall`, mas `withRetry` continua externo. O wrapper incrementa chamadas por tentativa, porém a decisão de split/fallback ainda permanece espalhada no processor.

Isso atende parcialmente a centralização, não totalmente à seção 14 da spec.

### P2 — qualidade e manutenção

- `server/index.ts` ainda contém caminho síncrono legado, apesar de bloqueado.
- Faltam testes para `finalizeAnalysisJob`, watchdog, reconciliação e ownership perdido.
- Faltam testes de erro estruturado de créditos/billing/quota através do provider real.
- Faltam testes E2E de reentrada, worker morto e retry antes/depois de cooldown.
- Condições longas no JSX prejudicam legibilidade; extrair predicates para funções nomeadas.
- `functions/lib` e mapas gerados precisam de política clara: versionar ou ignorar, não deixar decisão implícita.

## Recomendação de deploy

Não fazer commit/push/deploy ainda sem corrigir os dois P0:

1. retry pelo card deve usar o mesmo guard de cooldown;
2. watchdog precisa garantir cobertura de jobs legados sem `updatedAt` e validar índices.

Depois:

1. adicionar testes de integração e E2E mínimos;
2. confirmar `firestore.indexes.json`;
3. confirmar consumidores do endpoint legado;
4. revisar artefatos `functions/lib`;
5. rodar gates;
6. commit;
7. push;
8. deploy Hosting e Functions, se Functions fizer parte do fluxo necessário.

## Arquivos alterados hoje

Principais arquivos funcionais:

- `functions/src/index.ts`
- `functions/src/services/analiseJobProcessor.ts`
- `functions/src/services/analysisPolicy.ts`
- `functions/src/services/analysisJobFinalizers.ts`
- `functions/src/services/providerCall.ts`
- `src/views/Solicitacoes.tsx`
- `src/components/AnaliseProgressOverlay.tsx`
- `src/models/AnaliseJob.ts`
- `src/models/Solicitacao.ts`
- `src/services/solicitacao/analiseJobService.ts`
- `server/index.ts`
- `src/components/gestao/ModalGestao.css`
- `src/views/GestaoContratos.css`
- `src/views/GestaoPontos.tsx`
- `src/utils/analiseErrorMessage.ts`

Arquivos de especificação/documentação:

- `docs/superpowers/specs/2026-11-23-lifecycle-analises-final.md`
- `docs/superpowers/specs/2026-11-23-lifecycle-analises-resiliente.md`
- `docs/RELATORIO-AUDITORIA-LIFECYCLE-ANALISES-2026-11-23.md`

## Conclusão

A base está melhor e os principais mecanismos de proteção existem. Ainda não é recomendável declarar a spec totalmente atendida nem publicar sem corrigir retry de card, cobertura de jobs legados no watchdog e índices. Commit/push/deploy devem ocorrer após essa rodada corretiva e validação operacional.
12
