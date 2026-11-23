# Spec final: Lifecycle resiliente de análises IA

**Data:** 2026-11-23  
**Status:** Aprovada para implementação final  
**Base:** auditoria da Fase 1 e decisões operacionais confirmadas

## 1. Decisões confirmadas

- Criar e publicar Cloud Function agendada para watchdog e reconciliação.
- Cloud Functions será único caminho oficial de análise.
- Endpoint síncrono em `server/index.ts` será instrumentado, bloqueado e removido após confirmação de consumidores.
- Novos estados persistidos serão oficiais, com migração lazy para jobs antigos.
- Erros de crédito/billing/quota não terão retry automático.
- Retry manual continuará disponível, mas com cooldown e bloqueio temporário após tentativas repetidas sem mudança de ambiente.
- Cooldown inicial: 30 segundos; bloqueio temporário progressivo até 1 minuto nesta entrega.

## 2. Problema

A entrada em Análises pode reabrir execução antiga indefinidamente. Jobs sem worker, jobs interrompidos por timeout e falhas de billing ficam registrados como ativos. A Fase 1 adicionou estados e classificação, mas ainda decide stale no frontend, não aplica limites no backend, não possui watchdog/heartbeat e não protege continuação.

O objetivo desta rodada é mover a autoridade de lifecycle para backend transacional e deixar frontend somente como observador e executor de ações explícitas.

## 3. Objetivos

- Backend decide `stale`, `blocked`, `failed`, `completed` e `cancelled`.
- Frontend nunca altera lifecycle diretamente ao detectar stale.
- Nenhum job órfão permanece ativo além dos limites definidos.
- Nenhum erro permanente executa retry automático ou split de PDF.
- Retry manual de billing existe, mas respeita cooldown e bloqueio temporário.
- Continuação respeita deadline, contadores, ownership e custo.
- Job antigo nunca limpa ou sobrescreve job novo.
- Watchdog opera sem depender de usuário abrir Análises.
- Cloud Functions substitui caminho síncrono legado.
- Testes cobrem lifecycle, concorrência, falhas e reentrada.

## 4. Não objetivos

- Trocar provider ou modelo de IA.
- Alterar prompts, checklist, RAG ou regras de conteúdo.
- Criar fallback sem IA.
- Permitir retry automático para créditos/billing/quota.
- Apagar histórico de jobs ou relatórios.

## 5. Estados oficiais

```ts
type AnaliseJobState =
  | 'uploaded'
  | 'queued'
  | 'extracting'
  | 'analyzing'
  | 'generating_report'
  | 'retry_waiting'
  | 'continuation_waiting'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'stale'
  | 'cancelled'

type AnaliseJobPhase = 'initial' | 'continuation' | 'retry'
```

Estados terminais:

```ts
completed | failed | blocked | stale | cancelled
```

Estados ativos:

```ts
uploaded | queued | extracting | analyzing | generating_report | retry_waiting | continuation_waiting
```

`blocked` significa falha permanente ou bloqueio temporário de retry manual. O motivo deve estar em `failureCategory` e `error`.

## 6. Contrato persistido

Documento:

`solicitacoes/{solicitacaoId}/analiseJobs/{jobId}`

Campos obrigatórios para jobs novos:

```ts
type AnalysisJob = {
  id: string
  solicitacaoId: string
  state: AnaliseJobState
  phase: AnaliseJobPhase
  progress: number
  stage?: string
  error?: { code: string; message: string } | null
  failureCategory?: AnalysisFailureCategory | null
  retryable: boolean
  createdBy?: string | null
  createdAt: Timestamp
  startedAt?: Timestamp
  updatedAt: Timestamp
  heartbeatAt: Timestamp
  deadlineAt: Timestamp
  completedAt?: Timestamp
  lastErrorAt?: Timestamp
  attemptCount: number
  retryCount: number
  continuationCount: number
  providerCallCount: number
  manualRetryCount: number
  nextRetryAt?: Timestamp | null
  retryBlockedUntil?: Timestamp | null
  maxRetries: number
  maxContinuations: number
  maxProviderCalls: number
  continuation?: {
    requested?: boolean
    claimId?: string | null
    completedBatches?: number[]
    plannedBatches?: number
    lastBatchIndex?: number
    requestedAt?: Timestamp
  } | null
}
```

Documento principal mantém:

```ts
analiseJobStatus
analiseJobProgress
activeAnaliseJobId
analiseErroCodigo
analiseErroMensagem
analiseTelemetry
```

Adicionar, se necessário para UX:

```ts
analiseFailureCategory
analiseRetryBlockedUntil
```

## 7. Invariantes

1. Uma solicitação possui no máximo um job ativo.
2. Somente backend altera `activeAnaliseJobId` e estado de lifecycle.
3. Toda finalização valida `activeAnaliseJobId === jobId`.
4. Job terminal nunca é reutilizado.
5. Job stale nunca volta para ativo automaticamente.
6. Entrada no módulo nunca cria job.
7. `onSnapshot` nunca inicia retry.
8. Erro permanente nunca entra em retry automático.
9. Créditos/billing/quota nunca acionam split de PDF.
10. Job além de `deadlineAt` não chama provider.
11. Job acima de `maxProviderCalls` não chama provider.
12. Continuação acima de `maxContinuations` não executa.
13. Job antigo nunca limpa referência de job novo.
14. Retry manual só ocorre após ação explícita.
15. Retry manual respeita `nextRetryAt` e `retryBlockedUntil`.

## 8. Política de tempo e limites

Criar módulo único:

`functions/src/services/analysisPolicy.ts`

```ts
const JOB_LIMITS = {
  uploadedMs: 10 * 60_000,
  queuedMs: 10 * 60_000,
  extractingMs: 15 * 60_000,
  analyzingMs: 20 * 60_000,
  generatingReportMs: 15 * 60_000,
  heartbeatStaleMs: 5 * 60_000,
  absoluteDeadlineMs: 45 * 60_000,
  maxRetries: 3,
  maxContinuations: 2,
  maxProviderCalls: 24,
  manualRetryCooldownMs: 30_000,
  manualRetryBlockMs: 60_000,
}
```

A decisão usa:

1. `retryBlockedUntil`, se presente;
2. `deadlineAt`;
3. `heartbeatAt`;
4. `updatedAt` somente para jobs legados sem heartbeat.

## 9. Classificação de erros

Implementar funções centrais:

```ts
classifyAnalysisError(error: unknown): ClassifiedAnalysisFailure
canRetryAnalysis(failure, job): boolean
shouldSplitAnalysis(failure, job): boolean
shouldContinueAnalysis(job, now): boolean
getManualRetryDecision(job, failure, now): {
  allowed: boolean
  nextRetryAt?: Date
  blockedUntil?: Date
  reason?: string
}
```

### Categorias

```ts
type AnalysisFailureCategory =
  | 'insufficient_credits'
  | 'billing_disabled'
  | 'quota_exceeded'
  | 'rate_limit'
  | 'provider_timeout'
  | 'provider_unavailable'
  | 'context_window'
  | 'missing_api_key'
  | 'invalid_input'
  | 'storage_error'
  | 'connection_error'
  | 'unknown'
```

O classificador deve priorizar campos estruturados:

```ts
error.code
error.type
error.status
error.statusCode
error.response.data.error.code
error.response.data.error.type
```

Somente depois usar mensagem textual restrita.

### Não retryable automático

- créditos insuficientes;
- billing desabilitado;
- quota excedida;
- API key ausente/inválida;
- input inválido;
- storage permanente;
- JSON/schema inválido;
- context window após teto de split.

### Retryable automático, sempre limitado

- rate limit temporário;
- timeout transitório;
- provider indisponível;
- 502/503/504;
- falha de rede transitória.

### Manual retry de billing

Quando falha for `insufficient_credits`, `billing_disabled` ou `quota_exceeded`:

- marcar job como `blocked`;
- não executar retry automático;
- exibir motivo claro;
- permitir botão manual;
- ao clicar, validar cooldown no backend;
- primeira tentativa manual permitida após 30 segundos;
- se falhar novamente sem mudança de ambiente, bloquear nova tentativa por 60 segundos;
- incrementar `manualRetryCount`;
- não ultrapassar limite de tentativas manuais por janela operacional;
- backend decide o bloqueio, não frontend.

O retry manual sempre cria um novo job após o job anterior estar terminal. Não reutilizar job `blocked`.

## 10. Enqueue transacional

`functions/src/index.ts` deve:

1. validar autenticação, solicitação, tipo e escopo;
2. ler solicitação e job ativo;
3. se job ativo saudável, retornar `reused: true`;
4. se job ativo stale, marcar stale em transação com ownership;
5. se houver `retryBlockedUntil > now`, retornar `failed-precondition` com tempo restante;
6. se criação manual após blocked for válida, criar novo job;
7. inicializar todos os contadores e limites;
8. definir `deadlineAt`;
9. definir `heartbeatAt`;
10. atualizar solicitação e job na mesma transação.

Defaults:

```ts
phase: 'initial'
attemptCount: 0
retryCount: 0
continuationCount: 0
providerCallCount: 0
manualRetryCount: 0
maxRetries: 3
maxContinuations: 2
maxProviderCalls: 24
retryable: true
failureCategory: null
```

## 11. Watchdog agendado

Criar Cloud Function agendada, por exemplo:

`watchdogAnaliseJobs`

Periodicidade inicial: a cada 1 minuto.

Responsabilidades:

1. buscar jobs em estados ativos;
2. limitar lote de leitura;
3. verificar `heartbeatAt` e `deadlineAt`;
4. verificar referência principal;
5. marcar job stale em transação;
6. limpar `activeAnaliseJobId` somente se ainda apontar para o job;
7. sincronizar `analiseJobStatus` no principal;
8. preservar `error`, telemetry e timestamps;
9. reconciliar principal apontando para job inexistente;
10. ser idempotente.

Transição stale:

```text
job ativo + heartbeat expirado
  → job.stale
  → solicitação.stale
  → activeAnaliseJobId = null, se ownership confirmar
```

O watchdog nunca cria retry.

## 12. Heartbeat

Alterar `updateJob` para gravar sempre:

```ts
heartbeatAt: FieldValue.serverTimestamp()
updatedAt: FieldValue.serverTimestamp()
```

Adicionar heartbeat durante operações longas:

- download de arquivos;
- extração;
- split de PDFs;
- cada chamada ao provider;
- consolidação;
- espera entre lotes.

Heartbeat não pode ultrapassar `heartbeatStaleMs` durante worker vivo.

## 13. Continuação segura

`continueAnaliseJob` deve validar em transação:

```ts
job.state === 'continuation_waiting'
solicitacao.activeAnaliseJobId === jobId
job.continuationCount < job.maxContinuations
job.providerCallCount < job.maxProviderCalls
job.deadlineAt > now
job.failureCategory não permanente
```

Ao reivindicar:

- gerar `claimId` único;
- incrementar `continuationCount` atomicamente;
- definir `phase: 'continuation'`;
- atualizar heartbeat;
- processar o mesmo `jobId`;
- impedir segundo claim.

Falha em qualquer validação deve produzir `stale` ou `blocked`, conforme motivo.

## 14. Wrapper de provider

Criar wrapper único:

`functions/src/services/providerCall.ts`

Toda chamada ao provider deve:

1. ler estado atual do job;
2. validar deadline;
3. validar limite de chamadas;
4. incrementar `providerCallCount` atomicamente;
5. atualizar heartbeat;
6. executar provider;
7. classificar erro;
8. decidir retry/split;
9. persistir falha e contadores.

Remover uso direto de `isLikelyRateLimitError` como política final. Essa função pode permanecer como detector de baixo nível, mas nunca decidir sozinha lifecycle.

## 15. Finalização atômica

Criar:

```ts
completeAnalysisJob(jobId, result)
failAnalysisJob(jobId, failure)
blockAnalysisJob(jobId, failure)
markAnalysisJobStale(jobId, reason)
cancelAnalysisJob(jobId, reason)
```

Cada operação:

- usa transação;
- valida ownership;
- grava job;
- atualiza solicitação somente se job ainda for ativo;
- limpa `activeAnaliseJobId` de forma condicional;
- preserva histórico e telemetry.

Job que perdeu ownership não pode sobrescrever relatório nem status.

## 16. Frontend

### Remover

Remover de `src/views/Solicitacoes.tsx`:

- cálculo de stale baseado apenas em `updatedAt`;
- `updateSolicitacao` para marcar stale;
- limpeza direta de `activeAnaliseJobId`.

### Manter

Frontend pode:

- ler estado persistido;
- mostrar banner;
- assinar job;
- solicitar reconciliação backend;
- abrir modal de retry;
- criar nova análise após clique.

### UX

Job ativo recente:

```text
Análise em andamento · 42%
Última atualização há 30 segundos.
[Continuar acompanhando] [Minimizar]
```

Job stale:

```text
Análise interrompida
A execução não recebeu atualização dentro do prazo.
[Ver detalhes] [Editar solicitação] [Tentar novamente]
```

Job blocked por créditos:

```text
Análise bloqueada
O provedor de IA está sem créditos ou com billing indisponível.
Nova tentativa manual disponível em 30 segundos.
[Tentar novamente] [Fechar]
```

Durante cooldown:

```text
Aguarde 30 segundos antes de tentar novamente.
```

Após repetição sem correção:

```text
Novas tentativas temporariamente bloqueadas por 1 minuto.
Corrija o billing/créditos antes de tentar novamente.
```

`AnaliseProgressOverlay` deve tratar `blocked` e `stale` como falhas visuais reais:

- título correto;
- ícone/estado correto;
- percentual 0;
- ações manuais;
- sem animação de progresso infinito.

## 17. Backend legado

Caminho oficial:

- `functions/src/index.ts`;
- `functions/src/services/analiseJobProcessor.ts`;
- `src/services/solicitacao/analiseJobService.ts`.

Caminho legado:

- `server/index.ts:337-493`.

Plano obrigatório:

1. localizar consumidores;
2. adicionar log estruturado `legacy_analysis_endpoint_called`;
3. adicionar feature flag de bloqueio;
4. bloquear novas chamadas em produção com `410 Gone` após confirmação;
5. manter resposta de migração durante janela de transição;
6. remover endpoint e código síncrono após validação;
7. garantir que só Cloud Functions execute análise.

Não duplicar retry, status ou classificação no legado.

## 18. Tipagem

Nos arquivos tocados:

```ts
catch (error: unknown) {
  const failure = classifyAnalysisError(error)
}
```

Adicionar type guards para erros estruturados de provider, Firebase e HTTP. Não usar `any` para classificação ou decisão de retry.

## 19. Migração lazy

Jobs existentes sem campos novos recebem defaults ao serem lidos:

- `phase: 'initial'`;
- contadores `0`;
- `retryable: true` apenas se estado não terminal;
- `heartbeatAt` usando `updatedAt`;
- `deadlineAt` derivado de `createdAt` com limite absoluto;
- jobs ativos sem timestamp confiável são candidatos ao watchdog.

Não alterar jobs históricos em lote nesta fase.

## 20. Testes obrigatórios

### Política

- códigos estruturados de crédito;
- mensagens de crédito sem falso positivo;
- billing;
- quota;
- 429;
- timeout;
- 502/503/504;
- contexto;
- conexão;
- API key;
- `canRetryAnalysis`;
- `shouldSplitAnalysis`;
- `shouldContinueAnalysis`;
- cooldown de 30 segundos;
- bloqueio temporário de 60 segundos.

### Backend

- enqueue inicial cria todos campos;
- enqueue reutiliza job saudável;
- enqueue transforma job stale em terminal antes de criar novo;
- job bloqueado não é reutilizado;
- retry manual cria novo job somente após cooldown;
- erro de crédito não faz retry automático;
- erro de crédito não faz split;
- provider call respeita limite;
- deadline impede provider;
- continuação acima do limite é bloqueada;
- claim concorrente permite apenas um worker;
- job antigo não sobrescreve job novo;
- watchdog marca stale;
- watchdog é idempotente;
- principal/subjob são reconciliados;
- job sem worker é recuperado.

### Frontend

- entrada no módulo não cria job;
- stale não abre overlay de progresso;
- blocked mostra mensagem de crédito;
- listener falhando não chama retry;
- retry só acontece após clique;
- cooldown é exibido;
- botão fica desabilitado durante cooldown;
- retry cria novo job após autorização backend.

### Legado

- endpoint síncrono registra uso;
- feature flag bloqueia endpoint;
- resposta 410 contém caminho oficial;
- nenhum teste frontend depende do endpoint legado.

### E2E

1. criar solicitação;
2. iniciar análise sem créditos;
3. confirmar `blocked`;
4. confirmar zero retry automático;
5. sair para Gestão de Contratos;
6. voltar para Análises;
7. confirmar que página abre normalmente;
8. confirmar banner de bloqueio;
9. tentar antes do cooldown e receber bloqueio;
10. esperar cooldown;
11. tentar manualmente;
12. confirmar nova falha bloqueada sem loop;
13. simular worker morto;
14. executar watchdog;
15. confirmar `stale` e liberação da solicitação.

## 21. Critérios de aceite

- Nenhuma decisão stale é feita pelo frontend.
- Todo job ativo tem heartbeat, deadline e contadores.
- Watchdog detecta job órfão sem abrir tela.
- `activeAnaliseJobId` só é limpo com ownership confirmado.
- Erro de créditos/billing/quota não faz retry ou split automático.
- Retry manual existe e respeita 30s/60s de bloqueio.
- Continuação respeita deadline, limite de chamadas e limite de continuações.
- Provider nunca é chamado após deadline ou limite de chamadas.
- `blocked` e `stale` possuem UX própria.
- Reentrada no módulo não dispara análise.
- Cloud Functions é único caminho oficial.
- Endpoint legado é bloqueado após instrumentação.
- Todos os testes de lifecycle passam.
- `npm run build`, `npm run test`, `npm --prefix functions run build` passam.
- Não há arquivos compilados não intencionais no diff final.

## 22. Ordem de implementação

1. Centralizar tipos, política e type guards.
2. Corrigir classificador estruturado.
3. Criar enqueue com campos e limites.
4. Criar finalizadores transacionais.
5. Adicionar heartbeat e wrapper de provider.
6. Proteger continuação.
7. Criar watchdog agendado.
8. Remover stale mutável do frontend.
9. Corrigir overlay/banner/cooldown.
10. Instrumentar e bloquear backend legado.
11. Adicionar testes unitários, integração e E2E.
12. Rodar gates completos e revisar diff.

## 23. Limitações e decisões não incluídas

- Não há fallback sem IA.
- Não há crédito local ou fila alternativa.
- Cooldown de 30/60 segundos protege contra repetição imediata, mas não substitui correção de billing.
- Scheduler exige deploy/configuração operacional do Firebase.
- Bloqueio do legado depende de confirmar consumidores existentes.
- Migração lazy não corrige todos os jobs antigos instantaneamente; watchdog deve cobrir jobs ativos.

## 24. Evidências auditadas

- `src/views/Solicitacoes.tsx`
- `src/services/solicitacao/analiseJobService.ts`
- `src/models/AnaliseJob.ts`
- `src/utils/analiseErrorMessage.ts`
- `functions/src/index.ts`
- `functions/src/services/analiseJobProcessor.ts`
- `functions/src/services/pipeline/withRetry.ts`
- `server/index.ts`

## 25. Resultado esperado

Análises passam a operar como workflow durável e observável. Falha de crédito produz estado bloqueado claro, sem retry automático. Retry manual permanece possível, mas com cooldown controlado pelo backend. Jobs órfãos são encerrados por watchdog, não por mutação de tela. Continuação, custo, ownership e deadline passam a ser invariantes de backend. O usuário pode sair e voltar ao módulo sem reabrir loop ou iniciar nova execução implicitamente.
