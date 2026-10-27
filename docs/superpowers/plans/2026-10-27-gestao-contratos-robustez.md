# Gestão de contratos robusta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar protocolos com pontos no mesmo fluxo, importar protocolos/pontos de planilhas com prévia segura e melhorar a leitura visual da área de contratos.

**Architecture:** Regras puras de validação e parsing ficam separadas dos componentes React. Persistência usa `writeBatch`, com criação conjunta atômica por protocolo e reutilização de protocolos existentes na importação. A UI mantém coleções e rotas atuais, adicionando composição de pontos, importação e variantes visuais no design system existente.

**Tech Stack:** React 19, TypeScript 5.9, Firebase Firestore, Vite, Vitest, SheetJS `xlsx`, CSS existente.

**Spec:** `docs/superpowers/specs/2026-10-27-gestao-contratos-robustez-design.md`

## Global Constraints

- Não adicionar libs além de `xlsx`.
- Manter coleções `gestaoContratos`, `gestaoProtocolos`, `gestaoPontos` e `gestaoMovimentos`.
- Validar campos em fronteiras de entrada; não usar `any`.
- Protocolos sem pontos continuam válidos.
- Coordenadas devem ser informadas em par e ficar dentro dos limites geográficos.
- CSV aceita UTF-8 com/sem BOM e separadores `;` e `,`.
- Importação exige prévia antes da gravação.
- Protocolo existente é reutilizado por `(titulo, concessionaria, rodovia)` normalizados.
- Ponto duplicado por `(protocolo, codigo)` vira erro de linha.
- Rodar `npm test -- --run`, `npm run lint`, `npm run build`.

## Review Focus

- Reenvio da mesma planilha não duplica protocolo nem pontos: teste de reutilização e código duplicado em `gestaoImportacao.test.ts`.
- Linha com coordenada única ou fora do limite não passa: teste de validação no parser.
- Falha de ponto não deixa protocolo parcialmente salvo: teste do serviço com mock de `writeBatch`.
- Planilha com milhares de pontos respeita limite de 500 operações: teste da estratégia de batches.
- Formulário conjunto preserva múltiplas linhas e bloqueia linha inválida: teste de lógica/validador e verificação manual do fluxo.

---

### Task 1: Dependência e validadores compartilhados

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `src/services/gestaoValidacao.ts`
- Modify: `src/services/gestaoContratos.ts`
- Test: `src/services/gestaoContratos.test.ts`

**Interfaces:**
- Produces `validarInputProtocolo(input): string[]`.
- Produces `validarInputPonto(input): string[]`.
- Produces tipos de input reutilizáveis por formulário, importação e persistência.

- [ ] **Step 1: Add failing unit tests** for required protocol fields, point required fields, paired coordinates, coordinate ranges, classification/result compatibility, and matching protocol concessionária/rodovia.
- [ ] **Step 2: Run focused tests** with `npm test -- --run src/services/gestaoContratos.test.ts`; expected failures until validators exist.
- [ ] **Step 3: Install `xlsx`** at the project root and implement validators in `src/services/gestaoValidacao.ts`; remove duplicated checks from `gestaoContratos.ts` while preserving current error behavior.
- [ ] **Step 4: Run focused tests** and confirm PASS.
- [ ] **Step 5: Run `npm run lint`** and fix only errors caused by this task.

### Task 2: Criação conjunta e persistência em batch

**Files:**
- Modify: `src/services/gestaoContratos.ts`
- Test: `src/services/gestaoContratos.test.ts`

**Interfaces:**
- Produces `criarProtocoloComPontos(contratoId: string, protocoloInput: ProtocoloInput, pontosInput: PontoInput[]): Promise<string>`.
- Uses shared validators from Task 1.

- [ ] **Step 1: Add failing tests** for protocol-only creation, protocol plus multiple points, invalid point causing no writes, contract/protocol ownership validation, and batch operation splitting over 500 writes.
- [ ] **Step 2: Run focused tests** and confirm failures identify missing `criarProtocoloComPontos` or wrong write behavior.
- [ ] **Step 3: Implement the function** with `writeBatch`, generated protocol ID, generated point IDs, inherited `concessionaria` and `rodovia`, and batches no larger than 500 operations; keep `criarProtocolo` and `criarPonto` compatible.
- [ ] **Step 4: Run focused tests** and confirm PASS.

### Task 3: Parser e agrupador de planilhas

**Files:**
- Create: `src/services/gestaoImportacao.ts`
- Create: `src/services/gestaoImportacao.test.ts`

**Interfaces:**
- `parsePlanilha(file: File): Promise<ImportPreview>`.
- `ImportPreview` contains grouped protocol rows, valid point inputs, invalid rows with source line and errors, and normalized headers.
- `normalizarCabecalho(value: string): string`.
- `agruparLinhasImportacao(rows: RawImportRow[]): ImportPreview`.

- [ ] **Step 1: Add failing tests** for CSV comma/semicolon, BOM, XLSX workbook input, aliases, grouping, missing fields, invalid coordinates, duplicate point code, protocol-only row, defaults for classification/precision, and Portuguese decimal values where supported by the chosen parser normalization.
- [ ] **Step 2: Run `npm test -- --run src/services/gestaoImportacao.test.ts`** and confirm failures.
- [ ] **Step 3: Implement parser** using `xlsx`, converting first sheet to raw rows, normalizing aliases, grouping by normalized protocol key, and returning errors without any Firestore call.
- [ ] **Step 4: Run focused tests** and confirm PASS.

### Task 4: Importação Firestore e modelo de planilha

**Files:**
- Modify: `src/services/gestaoImportacao.ts`, `src/services/gestaoContratos.ts`
- Test: `src/services/gestaoImportacao.test.ts`, `src/services/gestaoContratos.test.ts`

**Interfaces:**
- Produces `importarProtocolosEPontos(contratoId: string, preview: ImportPreview): Promise<ImportResult>`.
- Produces `baixarModeloPlanilha(): void`.

- [ ] **Step 1: Add failing tests** for existing protocol reuse, existing point duplicate rejection, successful new group creation, per-group failure reporting, and model columns.
- [ ] **Step 2: Implement import orchestration**: load contract data, match existing protocol by normalized key, reject duplicate point codes, call batch persistence, split batches over 500, and return imported/skipped/error counts by group.
- [ ] **Step 3: Implement model download** with exact columns `titulo_protocolo`, `concessionaria`, `rodovia`, `numero_protocolo`, `codigo_ponto`, `estado`, `km`, `classificacao`, `latitude`, `longitude`, `precisao`.
- [ ] **Step 4: Run both focused test files** and confirm PASS.

### Task 5: Formulário de protocolo com pontos embutidos

**Files:**
- Modify: `src/views/GestaoProtocolos.tsx`
- Modify: `src/views/GestaoContratos.css`

**Interfaces:**
- Consumes `criarProtocoloComPontos` and shared point input types.
- Produces dynamic point rows with add/remove, inline validation, and one submit action.

- [ ] **Step 1: Add/adjust component-level test coverage if existing view test setup supports it; otherwise expose pure row validation through Task 1 tests and verify the browser flow manually.**
- [ ] **Step 2: Add point row state** with one initial empty row, add/remove controls, fields matching `PontoInput`, and inherited protocol metadata.
- [ ] **Step 3: Block submit on invalid rows**, show row-level errors, allow removing all rows for protocol-only creation, call `criarProtocoloComPontos`, clear state only after success, and preserve state on failure.
- [ ] **Step 4: Run lint and focused tests**; verify protocol-only and protocol-with-multiple-points flows in the running app.

### Task 6: UI de importação com prévia e confirmação

**Files:**
- Modify: `src/views/GestaoProtocolos.tsx`
- Modify: `src/views/GestaoContratos.css`

**Interfaces:**
- Consumes `parsePlanilha`, `importarProtocolosEPontos`, `baixarModeloPlanilha`.
- Produces file selection, preview summary, invalid-row list, confirmation action, and final result summary.

- [ ] **Step 1: Add UI state** for selected file, preview, parsing, confirmation, import progress, and result errors.
- [ ] **Step 2: Add `Importar planilha` and `Baixar modelo` actions** beside `Novo protocolo`.
- [ ] **Step 3: Render preview** with grouped protocols, valid/invalid counts, source line numbers, and row errors; disable confirmation when invalid rows exist according to approved behavior.
- [ ] **Step 4: Confirm import** only after preview, refresh data after success, preserve preview on failure, and display per-group results.
- [ ] **Step 5: Run `npm run lint`** and verify `.xlsx`, comma CSV, semicolon CSV, invalid preview, and successful confirmation manually.

### Task 7: Visual status, progress, protocol detail

**Files:**
- Modify: `src/views/GestaoContratoDetalhe.tsx`
- Modify: `src/views/GestaoProtocolos.tsx`
- Modify: `src/views/GestaoContratos.css`

**Interfaces:**
- Adds visual status variant mapping and stage progress based on `Etapa`.
- Keeps routes, Firestore shape, and existing filters unchanged.

- [ ] **Step 1: Add pure tests** for status-to-variant mapping and stage progress index/count.
- [ ] **Step 2: Add semantic status classes** for correction, waiting, paused, completed, and neutral states; keep accessible text labels.
- [ ] **Step 3: Add stage progress** to protocol list and protocol detail using the six existing stages.
- [ ] **Step 4: Reorganize protocol detail** into scannable header/status, next action, point cards/table, and timeline attachment chips without changing behavior.
- [ ] **Step 5: Add responsive CSS** using existing `--color-*`, `--radius-*`, and shadow variables; verify keyboard focus and mobile layout.
- [ ] **Step 6: Run focused tests and lint**.

### Task 8: Full validation

**Files:**
- No source changes expected unless validation finds a defect.

- [ ] **Step 1: Run `npm test -- --run`.** Expected: all tests pass.
- [ ] **Step 2: Run `npm run lint`.** Expected: pass.
- [ ] **Step 3: Run `npm run build`.** Expected: pass, allowing only pre-existing warnings.
- [ ] **Step 4: Run `git diff --check`.** Expected: no whitespace errors.
- [ ] **Step 5: Start the app and verify end-to-end:** create protocol with two points, create protocol without points, add an avulso point, preview invalid spreadsheet, confirm valid spreadsheet, reuse existing protocol, and inspect updated dashboard/detail visuals.
- [ ] **Step 6: Update todo state and report exact validation output and any remaining environment-only gaps.**

---

## Self-review

Coverage checked against spec: joint protocol/point creation, atomic persistence, shared validation, XLSX/CSV import, aliases and grouping, preview/errors, existing protocol reuse, duplicate handling, model download, semantic visual status, stage progress, protocol detail, responsive accessibility, and project validation all have tasks.

Type consistency checked: `ProtocoloInput`/`PontoInput` are shared from validation/service boundaries; parser emits the same point shape consumed by batch persistence; UI consumes the same functions as import orchestration.

Review focus tests are assigned to Tasks 1–4; UI behavior is covered by manual end-to-end verification because repository currently has service tests but no component test harness for these views.

Plan keeps existing large view/service files intact; only pure parsing/validation receives new focused modules.

Recommended execution: native execution is fastest, but subagent-driven execution gives independent review across eight tasks and reduces risk in Firestore batching/import behavior. 

---

Plan complete and saved. Review this plan before implementation; execution method remains to be chosen.

- **Subagent-driven** — fresh implementer/reviewer per task, strongest independent checks.
- **Native** — implement all tasks in this session, then one whole-branch review, fastest.

Recommended: **Subagent-driven**, because import batching and UI changes span multiple files and failure modes.

Does this plan capture what you want, and which execution approach should be used?
"}彩票平台开户әыб娱乐平台开户 海南天天中彩票ҽа? nope