# Ensinar a IA — Governança com Acesso Amplo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar governança, escopo de recuperação, fallback confiável, RAG mensurável e avaliação para a aba “Ensinar a IA”, preservando acesso completo para qualquer usuário autenticado.

**Architecture:** Firebase Auth continua exigindo apenas usuário autenticado. Firestore valida autenticação, integridade do `organizacaoId` da empresa e estrutura dos registros, sem roles individuais; `concessionariaId` e `tipoAnaliseId` orientam recuperação. Backend compõe contexto lexical + semântico com threshold, orçamento e telemetria.

**Tech Stack:** React + TypeScript + Vite, Firebase Auth/Firestore, Cloud Functions TypeScript, OpenAI embeddings já instalados, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-23-ensinar-ia-governanca-acesso-amplo-design.md`

## Global Constraints

- Todo usuário autenticado pode criar, editar, aprovar, rejeitar, revogar e desativar conteúdo.
- Não implementar roles `colaborador`, `revisor` ou `admin`.
- `concessionariaId` orienta recuperação, não restringe funcionário.
- `tipoAnaliseId` é filtro técnico obrigatório.
- `organizacaoId` identifica empresa e não deve ser inventado pelo formulário.
- Conteúdo global da empresa pode ter `concessionariaId` vazio.
- Produção nunca transforma falha Firestore em sucesso `localStorage`.
- Fallback local exige `import.meta.env.DEV` e `VITE_ENABLE_LOCAL_FALLBACK=true`.
- Não adicionar vector store.
- Não implementar Fine Tuning.
- Não escolher threshold sem teste de calibração.

---

## Task 1: Establish company context and content contract

**Files:**
- Modify: `src/models/GoldenCase.ts`
- Modify: `src/models/FeedbackAprendizado.ts`
- Modify: `src/auth/AuthProvider.tsx`
- Modify: `src/services/auth/authService.ts`
- Modify: `src/services/goldenCase/goldenCaseService.ts`
- Modify: `src/services/feedback/feedbackService.ts`
- Test: new auth/content contract tests

**Interfaces:**
- `LearningCompanyContext = { uid: string; organizacaoId: string }`.
- `LearningContentScope = { organizacaoId: string; concessionariaId?: string | null; tipoAnaliseId: string }`.
- Auth context derives `uid` and company ID from existing CRM user/profile data; it does not derive roles.

- [ ] Add failing tests for authenticated context, missing company context, global company content and concessionaria-specific content.
- [ ] Run focused tests and confirm failure.
- [ ] Implement context exposure without adding role claims.
- [ ] Make new records carry author, company, optional concessionaria, type, explicit status, `ativo`, version and timestamps.
- [ ] Reject creation when company or type is missing; allow empty concessionaria only for global company content.
- [ ] Run focused tests, `npm run build` and `npm --prefix functions run build`.
- [ ] Commit.

```bash
git add src/auth src/models src/services/goldenCase src/services/feedback functions/src
 git commit -m "feat: define company-scoped learning content contract"
```

## Task 2: Make Firestore rules match broad authenticated access

**Files:**
- Modify: `firestore.rules`
- Modify: `firestore.indexes.json`
- Test: Firebase Emulator rules tests/fixtures

**Interfaces:**
- Authenticated request can read and write learning collections.
- Rules require `request.auth != null`.
- Rules require immutable `organizacaoId` to match the company context already used by the CRM; they do not inspect role claims.
- Rules permit all authenticated users to change status and active state.
- Physical delete follows existing product policy; if retained, it is authenticated-only and audited.

- [ ] Configure or verify Firebase Emulator execution for rules tests.
- [ ] Add failing cases: unauthenticated denied; authenticated same-company allowed; authenticated cross-company denied; global company content allowed; status changes allowed for any authenticated user.
- [ ] Run emulator rules tests and verify failure.
- [ ] Implement minimal rules with no role functions.
- [ ] Add composite indexes for company/type/status/active and company/concessionaria/type queries.
- [ ] Run emulator validation. Do not use remote deploy as the only validation.
- [ ] Commit.

```bash
firebase emulators:exec "npm test -- --run rules"
git add firestore.rules firestore.indexes.json
 git commit -m "fix: align learning rules with authenticated company access"
```

## Task 3: Remove false-success local fallback and add reviewed export

**Files:**
- Modify: `src/config/localFallback.ts`
- Modify: `src/services/goldenCase/goldenCaseService.ts`
- Modify: `src/services/feedback/feedbackService.ts`
- Modify: `src/views/EnsinarIA.tsx`
- Create: `scripts/exportEnsinarIaLocalData.ts`
- Test: local fallback and export validation tests

**Interfaces:**
- `isLocalFallbackEnabled(): boolean` returns `import.meta.env.DEV && import.meta.env.VITE_ENABLE_LOCAL_FALLBACK === 'true'`.
- Production permission error rejects with an explicit unsynchronized-data message.
- Export contains records, source key, export timestamp and synchronization state.

- [ ] Add failing tests for production permission error and explicit development fallback.
- [ ] Run tests and confirm failure.
- [ ] Gate fallback in golden/feedback services.
- [ ] Ensure mock mode cannot continue after production permission failure.
- [ ] Add export script that reads only known local keys and emits reviewed JSON; do not auto-import.
- [ ] Show “não sincronizado” rather than success in UI.
- [ ] Run tests and build.
- [ ] Commit.

## Task 4: Align frontend queries and actions with company scope

**Files:**
- Modify: `src/views/EnsinarIA.tsx`
- Modify: `src/services/goldenCase/goldenCaseService.ts`
- Modify: `src/services/feedback/feedbackService.ts`
- Test: service/query tests and UI behavior tests

**Interfaces:**
- List queries accept `{ organizacaoId, concessionariaId?, tipoAnaliseId?, status?, includeInactive? }`.
- Lists include same-company global content and selected concessionaria content.
- Create/update derive company and author from auth context; form cannot override them.
- All authenticated users can approve/reject/revoke/deactivate.

- [ ] Add failing tests for company filter, global content inclusion, concessionaria priority metadata and status operations.
- [ ] Implement Firestore queries with company scope; keep global content query explicit.
- [ ] Add tenant fields to seeds only where company identity is known; keep unscoped seeds out of production sync.
- [ ] Add per-action loading/error handling and safe URL validation.
- [ ] Run frontend tests, lint and build.
- [ ] Commit.

## Task 5: Harden retrieval policy without using ranking as security

**Files:**
- Modify: `functions/src/services/goldenCaseService.ts`
- Modify: `functions/src/services/feedbackAprendizadoService.ts`
- Modify: `functions/src/services/contextSelection/rankByContext.ts`
- Modify: `functions/src/services/analiseJobProcessor.ts`
- Test: retrieval scope tests

**Interfaces:**
- `listGoldenCasesAprovadosParaAnalise({ organizacaoId, concessionariaId, tipoAnaliseId, queryText, maxItems })`.
- `listFeedbacksAprovadosParaAnalise` has the same scope.
- Result includes `scope: 'concessionaria' | 'global'`, score and selection reason.

- [ ] Add failing tests for same type, same concessionaria priority, same-company global fallback and different-company exclusion.
- [ ] Apply company/type eligibility before ranking.
- [ ] Rank same concessionaria before global content; use recency only as tie-breaker.
- [ ] Mark cross-concessionaria fallback explicitly or disable it per policy; never treat score as access control.
- [ ] Run service and processor tests.
- [ ] Commit.

## Task 6: Implement controlled hybrid document retrieval

**Files:**
- Modify: `functions/src/services/pipeline/documentRetrieval.ts`
- Modify: `functions/src/services/pipeline/pdfTextExtractor.ts`
- Modify: `functions/src/services/embeddingService.ts`
- Modify: `functions/src/services/pipeline/types.ts`
- Modify: `functions/src/services/analiseJobProcessor.ts`
- Test: document retrieval, embedding and extraction tests

**Interfaces:**
- `RetrievedChunk` returns lexical score, semantic score, combined score, threshold decision, source document and page metadata.
- `selecionarChunksRelevantes` accepts `maxChunksPerDocument` and threshold policy.
- No below-threshold chunk enters prompt.

- [ ] Add failing tests for diversity, threshold exclusion, semantic candidate, lexical fallback and no-evidence state.
- [ ] Preserve document/page/hash/parser metadata during extraction.
- [ ] Implement lexical + semantic ranking with policy supplied by caller.
- [ ] Add per-document cap and deduplication.
- [ ] Mark extraction failure, empty text, embedding failure and no evidence separately.
- [ ] Run focused tests and Functions build.
- [ ] Commit.

## Task 7: Precompute and reuse embeddings

**Files:**
- Modify: `functions/src/services/embeddingService.ts`
- Modify: `functions/src/services/goldenCaseService.ts`
- Modify: `functions/src/services/feedbackAprendizadoService.ts`
- Modify: `functions/src/services/analiseJobProcessor.ts`
- Test: embedding reuse/batch/cache tests

**Interfaces:**
- Content embeddings reuse matching hash/model/version.
- One analysis query embedding is shared by golden, feedback and document retrieval.
- Embedding failure falls back only to explicit lexical mode and emits telemetry.

- [ ] Add failing tests for hash reuse, model invalidation, query reuse, batch and failure telemetry.
- [ ] Implement bounded batch and cache.
- [ ] Remove recency as silent substitute for failed semantic retrieval.
- [ ] Run tests and Functions build.
- [ ] Commit.

## Task 8: Add unified context budget

**Files:**
- Create: `functions/src/services/pipeline/contextBudget.ts`
- Modify: `functions/src/services/pipeline/estimateTokens.ts`
- Modify: `functions/src/services/pipeline/batchPlanner.ts`
- Modify: `functions/src/services/pipeline/types.ts`
- Modify: `functions/src/services/analiseJobProcessor.ts`
- Test: context budget tests

**Interfaces:**
- `planContextBudget({ system, requirements, norms, memory, golden, feedback, rag, pdfs, outputReserve })` returns selected blocks, removed blocks, estimated tokens/bytes and retry allowance.
- Usage telemetry records actual tokens, calls, retries, elapsed time, cost and fallback states.

- [ ] Add failing tests for all block accounting, output reserve, critical evidence preservation and retry limit.
- [ ] Implement deterministic trimming.
- [ ] Gate retries and splits by remaining job budget.
- [ ] Persist planned and actual usage.
- [ ] Run pipeline tests and Functions build.
- [ ] Commit.

## Task 9: Align preview with backend selection

**Files:**
- Modify/Create: preview service/API
- Modify: `src/views/EnsinarIA.tsx`
- Modify: backend selection module
- Test: preview contract tests

**Interfaces:**
- `buildEnsinarIAPreview(input)` returns selected golden, feedback and document context with scope, scores, threshold, IDs and fallback reason.
- Preview and analysis share pure selection code.

- [ ] Add failing test proving approved feedback appears identically in preview and analysis.
- [ ] Extract shared selection composition.
- [ ] Render selected context and explicit no-evidence states.
- [ ] Run frontend/Functions tests.
- [ ] Commit.

## Task 10: Add end-to-end evaluation and update docs

**Files:**
- Modify: `functions/src/services/analiseJobProcessor.test.ts`
- Create: integration fixtures
- Modify: `functions/src/services/assertividade/assertividadeMetrics.ts`
- Modify: `docs-ia/guia_ensinar_ia.md`, `docs-ia/checklist_sprints.md`, `docs-ia/escopo.md`

**Interfaces:**
- Fixture covers one company, two concessionarias, two types, global content and scoped content.
- Test verifies prompt selection, IDs, evidence, telemetry, persistence and exclusion of another company.

- [ ] Add failing full-flow test.
- [ ] Add failure cases for no evidence, extraction error, embedding outage and budget overflow.
- [ ] Implement only changes required by assertions.
- [ ] Reconcile docs with actual limits and access model.
- [ ] Run full tests and builds.
- [ ] Commit.

## Task 11: Final verification

- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run `npm test -- --run`.
- [ ] Run `npm --prefix functions run build`.
- [ ] Run Firebase Emulator rules tests.
- [ ] Exercise authenticated user flow: create, approve, reject, deactivate and reload.
- [ ] Verify another authenticated employee can perform same operations.
- [ ] Verify different company content is excluded.
- [ ] Verify production fallback is disabled.
- [ ] Verify Fine Tuning is absent from production path.
- [ ] Record any blocked external validation; do not claim complete.

---

## Self-review

- Access model matches product decision: authenticated users have full operations.
- Concessionaria is retrieval scope, not authorization.
- No role claims are referenced.
- Fallback, RAG, budget, preview and E2E each have separate tasks.
- Fine Tuning is excluded.
