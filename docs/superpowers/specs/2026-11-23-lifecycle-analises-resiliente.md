# Spec: Lifecycle resiliente de análises IA

**Data:** 2026-11-23  
**Status:** Aprovada para implementação faseada  
**Escopo:** módulo de análises, jobs Firestore, Cloud Functions, pipeline IA, UX de retomada e caminho backend legado

## 1. Contexto

Ao sair de Gestão de Contratos e entrar em Análises, uma solicitação pode reabrir overlay de processamento indefinidamente. O caso observado envolve uma análise iniciada sem créditos: o job permanece tratado como ativo, falhas de provider não são separadas de falhas transitórias, e o frontend retoma qualquer job persistido em estado ativo.

O problema é de lifecycle de job, não apenas de apresentação. O sistema precisa impedir reentrada automática infinita, controlar custo, distinguir falhas permanentes, recuperar jobs órfãos e oferecer ação manual segura.

## 2. Objetivos

- Impedir que job sem atualização bloqueie módulo ou reabra overlay indefinidamente.
- Distinguir processamento inicial, continuação, espera de retry, bloqueio, stale e falha terminal.
- Impedir retry para crédito, billing, quota, API key e demais falhas permanentes.
- Impor limites globais de tempo, chamadas, retries, continuações e custo estimado.
- Garantir idempotência por `jobId` e finalização atômica.
- Reconciliar documento principal de solicitação com subcoleção `analiseJobs`.
- Definir Cloud Functions como caminho oficial; isolar/remover caminho HTTP síncrono legado.
- Substituir `catch (error: any)` em código tocado por `unknown` + type guards.
- Exibir estado recuperável e ação explícita, nunca iniciar reanálise automaticamente.
- Cobrir lifecycle com testes unitários, integração e fluxo de reentrada no módulo.

## 3. Não objetivos

- Não redesenhar prompts, checklist ou regras de negócio da análise.
- Não trocar provider de IA nesta entrega.
- Não migrar dados históricos de relatórios, salvo campos de lifecycle necessários.
- Não apagar imediatamente `server/index.ts`; primeiro bloquear uso e confirmar consumidores.

## 4. Decisão de modelo de estados

Usar estados explícitos. Não usar apenas `phase` para esconder estados operacionais.

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
```

Adicionar campo complementar:

```ts
type AnaliseJobPhase = 'initial' | 'continuation' | 'retry'
```

`phase` explica origem do estado; `state` determina comportamento e terminalidade.

### Estados terminais

```ts
completed | failed | blocked | stale | cancelled
```

### Estados ativos

```ts
uploaded | queued | extracting | analyzing | generating_report | retry_waiting | continuation_waiting
```

`blocked`, `stale` e `cancelled` nunca podem ser reutilizados pela função de enqueue.

## 5. Contrato do job

Adicionar ao documento `solicitacoes/{solicitacaoId}/analiseJobs/{jobId}`:

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

type AnalysisJob = {
  id: string
  solicitacaoId: string
  state: AnaliseJobState
  phase: AnaliseJobPhase
  progress: number
  stage?: string
  error?: { code: string; message: string } | null
  failureCategory?: AnalysisFailureCategory | null
  retryable?: boolean
  createdBy?: string | null
  createdAt?: Timestamp
  startedAt?: Timestamp
  updatedAt?: Timestamp
  heartbeatAt?: Timestamp
  completedAt?: Timestamp
  deadlineAt?: Timestamp
  lastErrorAt?: Timestamp
  attemptCount: number
  retryCount: number
  continuationCount: number
  providerCallCount: number
  estimatedTokens: number
  estimatedCost?: number | null
  maxProviderCalls: number
  maxContinuations: number
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

No campo principal `solicitacoes/{id}` manter:

```ts
analiseJobStatus
analiseJobProgress
activeAnaliseJobId
analiseErroCodigo
analiseErroMensagem
analiseTelemetry
```

Ao estado terminal, `activeAnaliseJobId` deve ser `null` por operação atômica ou transação.

## 6. Invariantes obrigatórias

1. Um documento de solicitação pode ter no máximo um job ativo.
2. Job terminal não pode ser retornado como job reutilizável.
3. Job com `deadlineAt <= now` não pode ser continuado.
4. Job com `continuationCount >= maxContinuations` não pode ser continuado.
5. Job com `providerCallCount >= maxProviderCalls` não pode chamar provider.
6. Falha não retryable nunca entra em `retry_waiting`.
7. Erro de créditos/billing/quota nunca aciona split de PDFs.
8. Reentrada no módulo nunca cria job nem chama provider.
9. `onSnapshot` falhando não dispara reanálise.
10. Finalização deve validar que `activeAnaliseJobId === jobId`; job antigo não pode sobrescrever job novo.
11. Worker reiniciado deve retomar somente por `jobId`, sem criar outro job.
12. Ações do usuário são necessárias para retry de `blocked`, `failed` e `stale`.

## 7. Política de limites

Valores iniciais configuráveis em um módulo único:

```ts
const JOB_LIMITS = {
  uploadedMs: 10 * 60_000,
  queuedMs: 10 * 60_000,
  extractingMs: 15 * 60_000,
  analyzingMs: 20 * 60_000,
  generatingReportMs: 15 * 60_000,
  absoluteDeadlineMs: 45 * 60_000,
  heartbeatStaleMs: 5 * 60_000,
  maxRetries: 3,
  maxContinuations: 2,
  maxProviderCalls: 24,
}
```

Os limites devem ser aplicados pelo backend, não somente pela UI. `updatedAt` e `heartbeatAt` são a base; `createdAt` serve para deadline absoluto.

## 8. Classificação de erros

Criar política central em `functions/src/services/analysisPolicy.ts`:

```ts
classifyAnalysisError(error: unknown): {
  category: AnalysisFailureCategory
  code: string
  message: string
  retryable: boolean
  splitAllowed: boolean
}

canRetryAnalysis(failure: ClassifiedFailure, job: AnalysisJob): boolean
shouldSplitAnalysis(failure: ClassifiedFailure, job: AnalysisJob): boolean
shouldContinueAnalysis(job: AnalysisJob, now: Date): boolean
```

### Não retryable

- `insufficient_credits`
- `billing_disabled`
- `quota_exceeded`
- `missing_api_key`
- `invalid_input`
- `context_window` quando teto de split foi atingido
- `storage_error` permanente
- schema/JSON inválido sem estratégia de correção

### Retryable, com teto

- rate limit temporário;
- timeout do provider;
- 502, 503, 504;
- falha de rede transitória.

Mensagem de crédito deve ser explícita, sem instruir reanálise imediata:

> A análise foi bloqueada porque o provedor de IA está sem créditos ou com billing indisponível. Configure o ambiente antes de tentar novamente.

## 9. Enqueue e idempotência

`analisarSolicitacao` deve:

1. Validar autenticação, solicitação, tipo e escopo.
2. Ler job ativo.
3. Se job ativo e saudável, retornar o mesmo `jobId` com `reused: true`.
4. Se job ativo stale, executar transação de stale/release antes de criar novo.
5. Nunca reutilizar estados `blocked`, `failed`, `stale` ou `cancelled`.
6. Criar novo job com contadores zerados, `phase: 'initial'`, `deadlineAt` definido.
7. Atualizar documento principal na mesma transação.

A criação deve continuar sendo idempotente sob concorrência.

## 10. Continuação segura

Antes de `continueAnaliseJob`, validar em transação:

```ts
if (job.state !== 'continuation_waiting') return
if (job.continuationCount >= job.maxContinuations) blockOrStale()
if (job.deadlineAt <= now) markStale()
if (job.failureCategory && !job.retryable) markBlocked()
if (job.providerCallCount >= job.maxProviderCalls) markBlocked()
if (solicitacao.activeAnaliseJobId !== jobId) return
```

Após claim:

- incrementar `continuationCount` uma única vez;
- mudar `phase` para `continuation`;
- atualizar `heartbeatAt`;
- executar o mesmo `jobId`;
- não criar subjob;
- se o worker morrer, watchdog decide stale.

## 11. Retry e custo

Toda chamada ao provider deve passar por wrapper único:

```ts
runProviderCall({
  jobRef,
  solicitacaoRef,
  operation,
  execute,
})
```

O wrapper deve:

- verificar deadline;
- verificar `maxProviderCalls`;
- incrementar contador atomicamente;
- atualizar heartbeat;
- classificar erro;
- aplicar retry somente se permitido;
- persistir último erro;
- nunca esconder erro permanente.

Split de PDF só pode ocorrer para context window ou estratégia explicitamente configurada. Não aplicar split para créditos/billing/quota.

## 12. Watchdog e reconciliação

Adicionar função agendada ou mecanismo equivalente para jobs ativos.

Para cada job ativo:

1. Ler `heartbeatAt`/`updatedAt`.
2. Comparar com timeout do estado.
3. Validar `deadlineAt`.
4. Validar referência no documento principal.
5. Se stale, executar transação:
   - job → `stale`;
   - `error.code = 'job_stale'`;
   - limpar `activeAnaliseJobId` somente se ainda apontar para o job;
   - principal → `analiseJobStatus: 'stale'`;
   - preservar telemetry e último erro.
6. Se principal aponta para job inexistente, limpar/reconciliar.
7. Se job terminal ainda está no principal, sincronizar estado.

O watchdog deve ser idempotente.

## 13. Finalização atômica

Criar funções centrais:

```ts
completeAnalysisJob(jobId, result)
failAnalysisJob(jobId, failure)
blockAnalysisJob(jobId, failure)
markAnalysisJobStale(jobId, reason)
```

Cada função deve usar transação e verificar ownership:

```text
solicitacao.activeAnaliseJobId === jobId
```

Se não for o job atual, não sobrescrever resultado/status principal.

## 14. Frontend e UX

### Entrada no módulo

`src/views/Solicitacoes.tsx` não deve abrir overlay automaticamente para qualquer estado ativo.

Regras:

- job saudável e atualizado: mostrar banner não bloqueante;
- job stale/blocked/failed: mostrar banner de estado e ações;
- reentrada nunca chama enqueue;
- listener de Firestore não dispara retry;
- erro de listener dispara reconciliação/leitura, não reanálise.

### Banner de job ativo

```text
Análise em andamento · 42%
A última atualização ocorreu há 30 segundos.
[Continuar acompanhando] [Minimizar]
```

### Banner de job interrompido

```text
Análise interrompida
Motivo: análise sem atualização dentro do prazo.
[Ver detalhes] [Editar solicitação] [Tentar novamente] [Descartar execução]
```

### Banner de bloqueio por créditos

```text
Análise bloqueada
O provedor de IA está sem créditos ou com billing indisponível.
[Tentar novamente após configurar ambiente] [Fechar]
```

`Tentar novamente` deve exigir clique explícito e abrir configuração/modal existente; nunca executar durante mount.

## 15. Caminho backend oficial

Caminho oficial: Cloud Functions:

- `functions/src/index.ts:337-544`
- `src/services/solicitacao/analiseJobService.ts:53-75`
- `functions/src/services/analiseJobProcessor.ts`

Caminho legado:

- `server/index.ts:337-493`

Plano:

1. Buscar consumidores de `POST /api/solicitacoes/:id/analisar`.
2. Adicionar log/telemetria de uso.
3. Bloquear novas chamadas em produção com resposta explícita `410 Gone` ou feature flag desligada.
4. Documentar migração para Cloud Functions.
5. Remover endpoint e código síncrono somente após confirmação de zero consumidores.
6. Não manter regras de retry diferentes nos dois caminhos.

## 16. Tipagem e padrão de erros

Substituir `catch (error: any)` nos arquivos tocados:

```ts
catch (error: unknown) {
  const failure = classifyAnalysisError(error)
}
```

Criar type guards para:

- erro HTTP/provider;
- erro Firebase Functions;
- erro com `code`, `status`, `response`;
- erro de quota/billing.

Não usar `any` para fazer narrowing.

## 17. Plano de implementação

### Fase 1 — Desbloqueio imediato

- Adicionar estados `blocked` e `stale`.
- Adicionar `failureCategory` e classificador de crédito/billing/quota.
- Desligar retry para erros permanentes.
- Detectar job stale no carregamento.
- Limpar referência ativa com transação.
- Impedir overlay automático para stale/blocked.
- Mensagens acionáveis.
- Testes de crédito, stale e reentrada.

### Fase 2 — Política global

- Criar `analysisPolicy.ts`.
- Adicionar contadores e `deadlineAt`.
- Centralizar provider calls.
- Aplicar `maxRetries`, `maxProviderCalls`, `maxContinuations`.
- Separar `retry_waiting` e `continuation_waiting`.
- Testes de limites e não-retry.

### Fase 3 — Resiliência de worker

- Heartbeat.
- Watchdog agendado.
- Reconciliação principal/subjob.
- Finalização atômica.
- Idempotência sob retry de evento.
- Testes de worker morto, timeout e job criado sem trigger.

### Fase 4 — Legado e UX completa

- Instrumentar e bloquear endpoint síncrono.
- Remover duplicação após confirmação de uso zero.
- Banner não bloqueante.
- Modal de detalhes.
- Ações de editar, retry e descartar.
- Teste end-to-end de saída de Gestão de Contratos e entrada em Análises.

## 18. Testes obrigatórios

### Unitários

- `classifyAnalysisError` para créditos, billing, quota, 429, timeout, context e API key.
- `canRetryAnalysis` para cada categoria.
- `shouldSplitAnalysis` nunca permite split para créditos.
- `shouldContinueAnalysis` respeita deadline, contador, custo e estado.
- timeout por estado.
- transições válidas e inválidas.

### Integração backend

- job sem worker vira stale.
- job antigo não é reutilizado.
- job ativo recente é reutilizado sem duplicar.
- continuação acima do limite é bloqueada.
- deadline expirado não continua.
- erro permanente finaliza como blocked.
- provider call incrementa contador atomicamente.
- finalização de job antigo não sobrescreve job novo.
- principal e subjob são reconciliados.

### Frontend

- reentrada não cria job.
- job stale não abre overlay bloqueante.
- erro de snapshot não dispara retry.
- banner mostra ação correta por estado.
- retry só ocorre após clique.
- conexão perdida mostra diagnóstico correto.

### End-to-end

1. Criar solicitação sem créditos.
2. Iniciar análise.
3. Confirmar `blocked`/`failed` sem loop.
4. Sair para Gestão de Contratos.
5. Voltar para Análises.
6. Confirmar que módulo abre normalmente.
7. Confirmar que nenhuma nova chamada ao provider ocorre.
8. Configurar ambiente e clicar manualmente em tentar novamente.

## 19. Critérios de aceite

- Nenhuma entrada no módulo dispara nova análise automaticamente.
- Job sem heartbeat dentro do limite não permanece ativo indefinidamente.
- Solicitação com erro de crédito não executa retry nem split recursivo.
- `activeAnaliseJobId` é limpo ao finalizar como `blocked`, `stale`, `failed`, `completed` ou `cancelled`.
- Job stale não reaparece como overlay de processamento.
- Continuação respeita `maxContinuations`, `deadlineAt` e `maxProviderCalls`.
- Dois eventos concorrentes não processam o mesmo job duas vezes.
- Erro de listener não inicia análise.
- Cloud Functions é único caminho oficial documentado.
- Endpoint síncrono legado não recebe novas chamadas em produção.
- Testes lifecycle passam.
- `npm run build`, `npm run test` e `npm --prefix functions run build` passam.
- Fluxo manual completo passa sem `Connection error` enganoso.

## 20. Observabilidade

Registrar por job:

- `jobId`, `solicitacaoId`;
- estado anterior/novo;
- phase;
- failureCategory;
- attemptCount;
- retryCount;
- continuationCount;
- providerCallCount;
- duração;
- deadline/stale reason;
- provider/model;
- tamanho e quantidade de documentos;
- custo/token estimado quando disponível.

Alertas recomendados:

- jobs stale por hora;
- blocked por créditos;
- retries acima do normal;
- divergência entre documento principal e subjob;
- jobs ativos acima do deadline;
- endpoint legado chamado.

## 21. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Jobs antigos sem novos campos | Defaults seguros durante leitura e migração lazy |
| Usuário perde análise em andamento | Só marcar stale após heartbeat/deadline comprovado |
| Retry reduz resiliência | Manter retry apenas para categorias transitórias |
| Watchdog encerra worker lento | Heartbeat frequente e deadline separado |
| Endpoint legado ainda usado | Instrumentar, bloquear depois de confirmar consumidores |
| Corrida entre retry e retry manual | Transação de ownership por `activeAnaliseJobId` |
| Provider retorna mensagens novas | Classificador por code/status + fallback conservador não retryable |

## 22. Resultado esperado

O sistema passa a tratar análise como workflow durável, com estados explícitos, limites e recuperação. Erros de crédito deixam de produzir reprocessamento sem chance de sucesso. A entrada em Análises deixa de ser um gatilho implícito de execução e vira somente observação de estado. Toda nova tentativa depende de ação explícita do usuário e de um job novo ou retomada validada pelo backend.

## 23. Evidências usadas

- `src/views/Solicitacoes.tsx:151-160`
- `src/views/Solicitacoes.tsx:64-129`
- `src/services/solicitacao/analiseJobService.ts:99-122`
- `functions/src/index.ts:382-393`
- `functions/src/index.ts:399-442`
- `functions/src/services/analiseJobProcessor.ts:109-113`
- `functions/src/services/analiseJobProcessor.ts:1214-1275`
- `functions/src/services/analiseJobProcessor.ts:1394-1409`
- `functions/src/services/analiseJobProcessor.ts:1694-1713`
- `src/utils/analiseErrorMessage.ts:52-55`
- `server/index.ts:337-493`
- `functions/src/services/pipeline/withRetry.ts:37-59`

## 24. Ordem de execução aprovada

Implementar nesta ordem:

1. Fase 1 — desbloqueio imediato.
2. Fase 2 — política global de retry/custo.
3. Fase 3 — worker/watchdog/reconciliação.
4. Fase 4 — legado e UX completa.

Cada fase deve passar seus testes e critérios antes da próxima. Não fazer correção parcial que mantenha reentrada automática ou retry de crédito.
