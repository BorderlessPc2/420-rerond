# Ensinar a IA — Governança, RAG e Avaliação Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar a aba “Ensinar a IA” segura e mensurável, com tenant obrigatório, persistência confiável, RAG documental híbrido, orçamento real de contexto e avaliação end-to-end.

**Architecture:** Firestore continua como fonte de dados. Golden cases, feedbacks e chunks documentais serão filtrados por organização, concessionária e tipo antes do ranking; recuperação combina lexical e embeddings persistidos, com threshold, diversidade e telemetria. O frontend não terá autoridade para aprovar conteúdo nem mascarar falhas de persistência.

**Tech Stack:** React + TypeScript + Vite, Firebase Auth/Firestore, Cloud Functions TypeScript, OpenAI embeddings já usados pelo projeto, Vitest, Firebase Emulator quando disponível.

**Spec:** `docs/superpowers/specs/2026-10-23-ensinar-ia-rag-governanca-design.md`

## Global Constraints

- Não adicionar vector store novo na primeira versão.
- Não implementar Fine Tuning em produção neste plano.
- Conteúdo novo exige `organizacaoId` e `concessionariaId`.
- Registros sem tenant ficam fora do prompt até revisão.
- Em produção, falha de Firestore não pode ativar `localStorage`.
- Embeddings documentais devem ser reutilizados por hash, modelo e versão.
- Recência não pode substituir relevância silenciosamente.
- Nenhum item abaixo do threshold entra no prompt sem política explícita.
- Orçamento deve incluir sistema, requisitos, normas, memória, golden cases, feedbacks, RAG, PDFs e margem de saída.
- Não usar `any` para contornar erros de TypeScript.
- Cada mudança de comportamento deve ter teste focado antes da implementação.
- Manter Fine Tuning separado até baseline, dataset e critérios de não-regressão estarem aprovados.

---

## File Map

### Contratos e avaliação

- Modify: `src/config/evalAssertividadeCliente.ts` — dataset e critérios por tipo.
- Modify: `functions/src/config/evalAssertividadeCliente.ts` — contrato consumido pelas Functions.
- Modify: `functions/src/services/assertividade/assertividadeMetrics.ts` — métricas técnicas.
- Modify: `src/views/MetricasIA.tsx` — exibição das métricas novas, se o painel já for usado para esses resultados.
- Create: `functions/src/services/assertividade/assertividadeMetrics.test.ts` additions — precisão, recall, evidência, página, alucinação e agregação.
- Create/Modify: `scripts/fixtures/*` — casos dourados com severidade, evidências e páginas.

### Governança e persistência

- Modify: `src/models/GoldenCase.ts` — tenant, autoria, revisão, versão, origem e atividade.
- Modify: `src/models/FeedbackAprendizado.ts` — mesmos metadados necessários.
- Modify: `src/services/goldenCase/goldenCaseService.ts` — escopo, fallback controlado, transições e exportação.
- Modify: `src/services/feedback/feedbackService.ts` — escopo, fallback controlado, transições e exportação.
- Modify: `src/views/EnsinarIA.tsx` — tenant no formulário, erros, preview e ações autorizadas.
- Modify: `src/auth/AuthProvider.tsx`, `src/services/auth/authService.ts` — claims/role disponíveis para UI.
- Modify: `functions/src/services/goldenCaseService.ts` — validação server-side, escopo e auditoria.
- Modify: `functions/src/services/feedbackAprendizadoService.ts` — validação server-side, escopo e auditoria.
- Modify: `functions/src/index.ts` — endpoints/claims ou funções administrativas necessárias.
- Modify: `firestore.rules` — escopo por tenant e transições por papel.
- Modify: `firestore.indexes.json` — índices das consultas compostas.
- Modify: `.env.example` and relevant config — flag explícita de fallback somente para desenvolvimento.
- Create: export/import service or script under `scripts/` — migração manual revisada de registros locais.

### RAG e orçamento

- Modify: `functions/src/services/pipeline/documentRetrieval.ts` — ranking híbrido, threshold, diversidade e explicabilidade.
- Modify: `functions/src/services/pipeline/pdfTextExtractor.ts` — metadados de página/status e cobertura.
- Modify: `functions/src/services/pipeline/chunkText.ts` — preservar IDs e offsets se necessário.
- Modify: `functions/src/services/embeddingService.ts` — batch, cache, hash, threshold e ranking compartilhado.
- Modify: `functions/src/services/goldenCaseService.ts` — query única, filtros duros e fallback marcado.
- Modify: `functions/src/services/feedbackAprendizadoService.ts` — query única, filtros duros e fallback marcado.
- Modify: `functions/src/services/pipeline/types.ts` — telemetria e resultado de seleção.
- Create: `functions/src/services/pipeline/contextBudget.ts` — orçamento unificado.
- Modify: `functions/src/services/pipeline/estimateTokens.ts` — estimativas para todos os blocos.
- Modify: `functions/src/services/pipeline/batchPlanner.ts` — orçamento global e retries.
- Modify: `functions/src/services/analiseJobProcessor.ts` — seleção, orçamento, telemetria, downloads e prompt final.
- Create/Modify: tests under `functions/src/services/pipeline/` — retrieval, budget, embeddings, tenant, failure modes.

### Integração e preview

- Modify: `src/views/EnsinarIA.tsx` — consumir preview oficial.
- Modify/Create: service/API for preview — mesma composição usada pelo backend.
- Modify: `functions/src/services/analiseJobProcessor.test.ts` — fluxo com fixtures e IDs injetados.
- Create: integration fixtures and test harness — tenant, documentos, golden, feedback e resultado.

---

## Task 1: Fix the evaluation contract and capture baseline

**Files:**
- Modify: `src/config/evalAssertividadeCliente.ts`
- Modify: `functions/src/config/evalAssertividadeCliente.ts`
- Modify: `functions/src/services/assertividade/assertividadeMetrics.ts`
- Modify: `scripts/fixtures/*`
- Test: `src/config/evalAssertividadeCliente.test.ts`, `functions/src/services/assertividade/assertividadeMetrics.test.ts`

**Interfaces:**
- Produce `EvalCase` fields for `tipoAnaliseId`, findings, severity, expected evidence, expected pages, applicable norms and false-positive rules.
- Produce metric functions with deterministic numeric output for precision, recall, critical accuracy, evidence accuracy, page accuracy, hallucination rate and checklist/report consistency.

- [ ] **Step 1: Add failing metric tests** for one exact-match case, one missing finding, one false positive, one wrong evidence page and one critical finding.
- [ ] **Step 2: Run focused tests.**

```bash
npx vitest run src/config/evalAssertividadeCliente.test.ts functions/src/services/assertividade/assertividadeMetrics.test.ts
```

Expected: FAIL because new fields/metrics are absent.

- [ ] **Step 3: Extend dataset and metric types** without removing current scorer compatibility.
- [ ] **Step 4: Implement deterministic metric functions** using normalized finding IDs, not only free-text keyword presence.
- [ ] **Step 5: Run focused tests again.** Expected: PASS.
- [ ] **Step 6: Run `npm run test:assertividade`** and record current baseline output in the existing evaluation documentation; do not claim improvement.
- [ ] **Step 7: Commit.**

```bash
git add src/config functions/src/services/assertividade scripts/fixtures docs-ia
 git commit -m "test: establish Ensinar IA evaluation baseline"
```

## Task 2: Define tenant and authorization contracts

**Files:**
- Modify: `src/models/GoldenCase.ts`
- Modify: `src/models/FeedbackAprendizado.ts`
- Modify: `src/auth/AuthProvider.tsx`
- Modify: `src/services/auth/authService.ts`
- Modify: `functions/src/services/goldenCaseService.ts`
- Modify: `functions/src/services/feedbackAprendizadoService.ts`
- Modify: `functions/src/index.ts`
- Test: model/service tests and new authorization tests

**Interfaces:**
- Define a shared authenticated context containing `uid`, `organizacaoId`, `concessionariaId` and role claims.
- Define eligible content as explicit `status === "aprovado"`, `ativo === true`, matching organization, matching concessionaria and matching type.
- Define status transitions: collaborator creates/edits draft, reviewer approves/rejects, administrator revokes/deactivates/imports.

- [ ] **Step 1: Add failing tests** for missing tenant rejection, cross-organization rejection, cross-concessionaria rejection, unauthorized approval and legacy status rejection.
- [ ] **Step 2: Run the focused backend tests and verify failure.**
- [ ] **Step 3: Add model fields** for `concessionariaId`, author, reviewer, explicit activity, version, origin and review timestamps.
- [ ] **Step 4: Implement backend validation** at service boundaries; never trust tenant or role fields supplied by the client.
- [ ] **Step 5: Implement explicit eligibility predicate** shared by golden and feedback selection.
- [ ] **Step 6: Run focused tests and build Functions.**

```bash
npx vitest run functions/src/services/contextSelection functions/src/services/*Service.test.ts
npm --prefix functions run build
```

- [ ] **Step 7: Commit.**

```bash
git add src/models src/auth src/services/auth functions/src/services functions/src/index.ts
 git commit -m "feat: enforce learning content tenant authorization"
```

## Task 3: Harden Firestore rules and add audit records

**Files:**
- Modify: `firestore.rules`
- Modify: `firestore.indexes.json`
- Modify: backend golden/feedback services and administrative function boundary
- Create/Modify: audit model/service/tests

**Interfaces:**
- Firestore rules consume claims for role and tenant; client cannot change immutable tenant or author fields.
- Audit records contain target collection, target ID, action, actor UID, tenant, previous status/version, next status/version and timestamp.

- [ ] **Step 1: Add rules tests or emulator fixtures** for read/write isolation, status transitions and delete denial.
- [ ] **Step 2: Run rules tests to verify failure.**
- [ ] **Step 3: Restrict `goldenCases` and `feedbacksAprendizado` reads/writes** to matching tenant and role.
- [ ] **Step 4: Replace normal physical delete with `ativo: false` and audit entry; retain hard delete only for a separately authorized administrative path.**
- [ ] **Step 5: Add required composite indexes** for tenant/type/status/activity queries.
- [ ] **Step 6: Run Firebase rules validation and service tests.**

```bash
firebase deploy --only firestore:rules --dry-run
npx vitest run functions/src/services
```

- [ ] **Step 7: Commit.**

```bash
git add firestore.rules firestore.indexes.json functions/src src/models
 git commit -m "feat: enforce Firestore learning-content boundaries"
```

## Task 4: Remove production false-success fallback and support reviewed migration

**Files:**
- Modify: `src/services/goldenCase/goldenCaseService.ts`
- Modify: `src/services/feedback/feedbackService.ts`
- Modify: `src/services/tipoAnalise/tipoAnaliseService.ts` only where shared behavior affects this flow
- Modify: `src/views/EnsinarIA.tsx`
- Modify: `.env.example` and config
- Create: `scripts/exportEnsinarIaLocalData.ts` or equivalent existing script location
- Test: service fallback tests and import validation tests

**Interfaces:**
- `isLocalFallbackEnabled()` returns true only for explicit development configuration.
- Production Firestore errors reject the operation and return an actionable error.
- Export output includes source collection, record, tenant fields, author and export timestamp; import accepts only reviewed records with complete tenant metadata.

- [ ] **Step 1: Add failing tests** proving permission errors reject in production and only activate local fallback under explicit development flag.
- [ ] **Step 2: Run focused tests and verify failure.**
- [ ] **Step 3: Gate `mockMode` behind the explicit flag** and stop converting production reads/writes into local success.
- [ ] **Step 4: Add reviewed export/import validation** that rejects missing tenant, invalid type, invalid status and unsafe URLs.
- [ ] **Step 5: Update UI error state** so failed persistence is visibly failed; keep any local-data banner explicit and non-successful.
- [ ] **Step 6: Run focused tests and `npm run build`.**
- [ ] **Step 7: Commit.**

```bash
git add src/services src/views/EnsinarIA.tsx scripts .env.example
 git commit -m "fix: stop masking learning persistence failures"
```

## Task 5: Fix frontend tenant propagation, review UX and safe links

**Files:**
- Modify: `src/views/EnsinarIA.tsx`
- Modify: `src/models/GoldenCase.ts`
- Modify: `src/models/FeedbackAprendizado.ts`
- Modify: frontend golden/feedback services
- Test: component/service tests already used by the project

**Interfaces:**
- Create/update requests derive tenant from authenticated context, not arbitrary form values.
- Review handlers expose loading/error state per record and never report success before Firestore confirms.
- `sanitizeDocumentUrl(value)` returns a URL only for `http:` or `https:`; otherwise returns no link.

- [ ] **Step 1: Add failing tests** for tenant propagation, unsafe URL rejection, review failure state and duplicate-click prevention.
- [ ] **Step 2: Implement tenant propagation and local validation.**
- [ ] **Step 3: Implement safe URL parsing and rendering.**
- [ ] **Step 4: Add per-item pending/error handling to approval, rejection, revocation and deactivation actions.**
- [ ] **Step 5: Remove normal permanent-delete UI or route it through the authorized administrative path.**
- [ ] **Step 6: Run frontend tests, lint and build.**

```bash
npm run lint
npm run build
```

- [ ] **Step 7: Commit.**

```bash
git add src/views/EnsinarIA.tsx src/models src/services
 git commit -m "fix: make Ensinar IA review flow tenant-safe"
```

## Task 6: Add hard tenant filtering to golden and feedback retrieval

**Files:**
- Modify: `functions/src/services/goldenCaseService.ts`
- Modify: `functions/src/services/feedbackAprendizadoService.ts`
- Modify: `functions/src/services/contextSelection/rankByContext.ts`
- Modify: `functions/src/services/analiseJobProcessor.ts`
- Test: `functions/src/services/contextSelection/rankByContext.test.ts` and service tests

**Interfaces:**
- Retrieval functions require `{ tipoAnaliseId, organizacaoId, concessionariaId, queryText, maxItems }`.
- Firestore filtering rejects mismatched tenant before ranking.
- Ranking only orders already eligible items; it is never an isolation mechanism.

- [ ] **Step 1: Add failing tests** proving organization, concessionaire and type mismatches never reach ranking or prompt composition.
- [ ] **Step 2: Run focused tests and verify failure.**
- [ ] **Step 3: Apply hard Firestore/in-memory filters** for all required tenant fields and explicit active/approved status.
- [ ] **Step 4: Update processor call sites** to pass the canonical tenant context from the solicitation/job.
- [ ] **Step 5: Remove implicit global-content behavior from analysis selection.**
- [ ] **Step 6: Run service, processor and build tests.**
- [ ] **Step 7: Commit.**

```bash
git add functions/src/services functions/src/services/analiseJobProcessor.ts
 git commit -m "fix: isolate learning retrieval by concessionaire"
```

## Task 7: Build document chunk metadata and hybrid retrieval

**Files:**
- Modify: `functions/src/services/pipeline/pdfTextExtractor.ts`
- Modify: `functions/src/services/pipeline/chunkText.ts`
- Modify: `functions/src/services/pipeline/documentRetrieval.ts`
- Modify: `functions/src/services/embeddingService.ts`
- Modify: `functions/src/services/pipeline/types.ts`
- Test: `documentRetrieval.test.ts`, `pdfTextExtractor.test.ts`, `embeddingRag.test.ts`, new hybrid retrieval tests

**Interfaces:**
- `DocumentChunk` includes document ID, tenant, document type, text, page range, content hash, parser version and optional embedding metadata.
- `retrieveDocumentChunks(input)` returns selected chunks plus score breakdown, threshold decision, evidence origin and fallback reason.
- `rankBySimilarity` accepts candidates and one query embedding, returning scores without silently selecting below threshold.

- [ ] **Step 1: Add failing tests** for synonym/semantic candidate, lexical-only candidate, below-threshold exclusion, duplicate removal, per-document cap and diversity.
- [ ] **Step 2: Run focused tests and verify failure.**
- [ ] **Step 3: Preserve page/offset metadata during extraction and distinguish extraction error, empty text and no evidence.**
- [ ] **Step 4: Add content hash and embedding metadata to chunks.**
- [ ] **Step 5: Implement hybrid score composition** with versioned weights and explicit threshold supplied by policy.
- [ ] **Step 6: Implement per-document limits, deduplication and document-type diversity.**
- [ ] **Step 7: Keep lexical fallback explicit in the returned selection metadata.**
- [ ] **Step 8: Run focused pipeline tests.**
- [ ] **Step 9: Commit.**

```bash
git add functions/src/services/pipeline functions/src/services/embeddingService.ts
 git commit -m "feat: add controlled hybrid document retrieval"
```

## Task 8: Move embedding work out of the analysis critical path

**Files:**
- Modify: `functions/src/services/embeddingService.ts`
- Modify: `functions/src/services/goldenCaseService.ts`
- Modify: `functions/src/services/feedbackAprendizadoService.ts`
- Modify: `functions/src/services/analiseJobProcessor.ts`
- Create/Modify: indexing job/function and Firestore chunk persistence
- Test: embedding cache, batch, lock, reuse and failure tests

**Interfaces:**
- `ensureEmbeddingForContent(content)` reuses an embedding when content hash, model and version match.
- `createEmbeddingsBatch(items)` returns embeddings keyed by stable content ID and does not issue duplicate work under concurrent calls.
- `getOrCreateQueryEmbedding(queryText)` is scoped to the analysis and reused by golden, feedback and document retrieval.

- [ ] **Step 1: Add failing tests** for same-hash reuse, model-version invalidation, concurrent lock, batch failure and shared query vector.
- [ ] **Step 2: Run focused tests and verify failure.**
- [ ] **Step 3: Implement hash/model/version checks and a bounded batch path.**
- [ ] **Step 4: Add lock/idempotency behavior for concurrent indexing.**
- [ ] **Step 5: Add analysis-scoped query embedding cache.**
- [ ] **Step 6: Change analysis-time fallback to lexical-only with explicit telemetry; remove recency-as-relevance fallback.**
- [ ] **Step 7: Add call/token/cost counters.**
- [ ] **Step 8: Run Functions build and focused tests.**
- [ ] **Step 9: Commit.**

```bash
git add functions/src
 git commit -m "perf: precompute and reuse learning embeddings"
```

## Task 9: Add unified context budget and safe retry policy

**Files:**
- Create: `functions/src/services/pipeline/contextBudget.ts`
- Modify: `functions/src/services/pipeline/estimateTokens.ts`
- Modify: `functions/src/services/pipeline/batchPlanner.ts`
- Modify: `functions/src/services/pipeline/types.ts`
- Modify: `functions/src/services/analiseJobProcessor.ts`
- Test: new `contextBudget.test.ts`, batch planner tests and processor tests

**Interfaces:**
- `ContextBudgetInput` contains named blocks for system, requirements, norms, memory, golden, feedback, RAG, PDFs and output reserve.
- `planContextBudget(input)` returns estimated tokens/bytes, selected blocks, removed blocks with reasons, remaining reserve and retry budget.
- `recordContextUsage(plan, usage)` returns actual tokens, calls, elapsed time, estimated cost and over-budget status.

- [ ] **Step 1: Add failing tests** for full-context accounting, output reserve, critical evidence preservation, low-priority trimming and retry exhaustion.
- [ ] **Step 2: Run focused tests and verify failure.**
- [ ] **Step 3: Implement unified accounting using existing token/byte estimators.**
- [ ] **Step 4: Define deterministic trimming order that preserves critical evidence.**
- [ ] **Step 5: Gate split/retry behavior on remaining global budget.**
- [ ] **Step 6: Persist planned/actual budget, removals, retries, calls, elapsed time and cost in telemetry.**
- [ ] **Step 7: Run pipeline and Functions tests.**
- [ ] **Step 8: Commit.**

```bash
git add functions/src/services/pipeline functions/src/services/analiseJobProcessor.ts
 git commit -m "feat: enforce unified analysis context budget"
```

## Task 10: Make preview use backend selection contract

**Files:**
- Modify: `src/views/EnsinarIA.tsx`
- Create/Modify: preview API/service shared with backend selection logic
- Modify: `functions/src/services/analiseJobProcessor.ts` or extract a pure selection module
- Test: preview contract tests and backend selection tests

**Interfaces:**
- `buildEnsinarIAPreview(input)` returns selected golden cases, feedbacks, document chunks, scores, thresholds, IDs, evidence origins and fallback states.
- Preview and analysis use the same tenant/type filters and selection policy.

- [ ] **Step 1: Add failing test** proving an approved feedback appears in preview exactly when it appears in analysis selection.
- [ ] **Step 2: Run test and verify failure.**
- [ ] **Step 3: Extract or reuse pure selection composition rather than duplicating ranking logic in React.**
- [ ] **Step 4: Expose preview response with score, threshold, origin and fallback fields.**
- [ ] **Step 5: Render all selected context categories and explicit no-evidence/fallback states.**
- [ ] **Step 6: Run frontend and Functions tests/build.**
- [ ] **Step 7: Commit.**

```bash
git add src/views/EnsinarIA.tsx functions/src
 git commit -m "feat: align Ensinar IA preview with analysis context"
```

## Task 11: Add end-to-end processor evaluation

**Files:**
- Modify: `functions/src/services/analiseJobProcessor.test.ts`
- Create: integration fixtures/harness under `functions/src/services` or existing test fixture location
- Modify: `functions/src/services/assertividade/assertividadeMetrics.ts`
- Modify: `package.json` only if a dedicated command is needed
- Test: integration test covering processor, retrieval, prompt, IDs, evidence and persistence

**Interfaces:**
- Test fixture creates one tenant, two concessionárias, two analysis types, approved and ineligible content, and representative PDFs/chunks.
- Test asserts selected tenant/type, excluded cross-tenant content, prompt blocks, injected IDs, evidence metadata, persisted telemetry and final score.

- [ ] **Step 1: Write integration fixture and failing test** for the full approved path and cross-tenant exclusion.
- [ ] **Step 2: Run the integration test and record missing seams.**
- [ ] **Step 3: Add failure-mode cases** for embedding outage, extraction error, empty PDF, below-threshold candidates, context overflow and retry budget exhaustion.
- [ ] **Step 4: Implement only production changes required by failed assertions; do not weaken assertions.**
- [ ] **Step 5: Run all relevant tests.**

```bash
npm test
npm run test:assertividade
npm --prefix functions run build
```

- [ ] **Step 6: Add command/documentation for repeatable baseline and integration evaluation.**
- [ ] **Step 7: Commit.**

```bash
git add functions/src package.json docs-ia
 git commit -m "test: verify Ensinar IA pipeline end to end"
```

## Task 12: Update documentation and operational runbook

**Files:**
- Modify: `docs-ia/guia_ensinar_ia.md`
- Modify: `docs-ia/checklist_sprints.md`
- Modify: `docs-ia/escopo.md`
- Modify: `docs-ia/baseline_assertividade_2026-09-18.md`
- Modify: relevant client training/evaluation docs
- Create: migration and operational runbook under `docs-ia/`

**Interfaces:**
- Documentation must state actual limits, tenant requirements, fallback behavior, retrieval type, threshold policy, metrics and deployment gates.
- Runbook must specify reviewed local-data export/import, index rebuild, embedding failure handling, rollback and evaluation commands.

- [ ] **Step 1: Replace claims that lexical retrieval is semantic RAG.**
- [ ] **Step 2: Reconcile documented limits with implemented limits.**
- [ ] **Step 3: Define one official acceptance matrix by type and severity.**
- [ ] **Step 4: Document that Fine Tuning is not implemented and remains a later experiment.**
- [ ] **Step 5: Document migration and failure procedures.**
- [ ] **Step 6: Run documentation consistency search for stale limits/claims.**
- [ ] **Step 7: Commit.**

```bash
git add docs-ia
 git commit -m "docs: align Ensinar IA operations with implementation"
```

## Task 13: Final verification and release gate

**Files:**
- No source changes expected unless verification finds a regression.
- Review: all files changed by Tasks 1–12.

- [ ] **Step 1: Run root checks.**

```bash
npm run lint
npm run build
npm test
npm run test:assertividade
```

- [ ] **Step 2: Run Functions checks.**

```bash
npm --prefix functions run build
npm --prefix functions test --if-present
```

- [ ] **Step 3: Verify Firestore rules and indexes using the project’s configured Firebase command.**
- [ ] **Step 4: Exercise the user-visible flow:** authenticate, create a draft, reject unauthorized approval, approve as reviewer, reload from Firestore, inspect preview, run analysis, verify injected IDs/evidence/telemetry, and confirm cross-tenant content is absent.
- [ ] **Step 5: Verify production configuration has local fallback disabled.**
- [ ] **Step 6: Verify no Fine Tuning code or claim was added to the production path.**
- [ ] **Step 7: Record failures plainly; do not mark complete with red gates.**

---

## Deferred Fine Tuning Experiment

After Tasks 1–13 pass, create a separate design and plan for Fine Tuning. It must define anonymization, train/validation/test split, model/version registry, rollback, cost ceiling and comparison of base+RAG, fine-tuned-only and fine-tuned+RAG. Do not add Fine Tuning implementation to this plan’s production path.

## Plan Self-Review

- Spec coverage: baseline/metrics Task 1; tenant and authorization Tasks 2–3; fallback/migration Task 4; frontend safety Task 5; concessionaire isolation Task 6; hybrid RAG Tasks 7–8; budget Task 9; preview Task 10; end-to-end evaluation Task 11; documentation Task 12; verification Task 13; Fine Tuning separation in the deferred section.
- Placeholder scan: no `TODO`, `TBD`, or unspecified implementation step is used as a deliverable.
- Type consistency: retrieval, budget and preview interfaces are named in their producing tasks before consumers use them.
- Scope: implementation stops at controlled hybrid RAG and evaluation. Fine Tuning remains a separate experiment as required by the spec.
