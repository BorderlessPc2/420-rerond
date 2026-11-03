# Gestão de Contratos UI/UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Melhorar hierarquia, acessibilidade, responsividade e feedback do módulo Gestão de Contratos sem alterar outros módulos.

**Architecture:** Reutilizar `GestaoContratos.css`, `ModalGestao`, React Router e componentes existentes. Persistir filtro de estado com `useSearchParams`; manter gráficos nativos CSS/SVG e regras de negócio atuais.

**Tech Stack:** React, TypeScript, React Router, CSS nativo, Vitest, Vite.

**Spec:** `docs/superpowers/specs/2026-10-30-gestao-contratos-ui-ux.md`

## Global Constraints

- Alterar somente Gestão de Contratos, seus componentes, estilos e testes relacionados.
- Não adicionar dependências.
- Não alterar modelo de dados, regras de negócio, status internos ou importação.
- Não refazer mapa Leaflet.
- Manter confirmação antes de exclusão.
- Preservar `prefers-reduced-motion`.
- Usar menor diff possível.

## Review Focus

- Filtro por estado ausente, inválido ou presente na URL deve resultar em recorte estável e URL limpa ao remover.
- Dashboard sem protocolos/pontos deve mostrar estados vazios, não barras quebradas ou silêncio visual.
- Modal com formulário longo deve rolar internamente sem scroll chaining e manter foco utilizável.
- Nomes/status muito longos devem preservar leitura sem overflow horizontal.
- Erros e salvamentos concorrentes devem manter feedback correto e não liberar ações destrutivas durante request.

---

### Task 1: Helpers de texto e datas do módulo

**Files:**
- Create: `src/views/gestaoUi.ts`
- Test: `src/views/gestaoUi.test.ts`

**Interfaces:**
- Produces `nomeGestao(valor: string): string` e `formatarDataGestao(valor?: string): string`.
- `nomeGestao` troca `_` por espaço, capitaliza primeira letra e mantém string vazia segura.
- `formatarDataGestao` usa `Intl.DateTimeFormat('pt-BR')`; retorna `—` para vazio e o valor original para data inválida.

- [ ] **Step 1: Write failing tests**
  - `nomeGestao('em_correcao')` retorna `Em correcao`.
  - `nomeGestao('')` retorna `—`.
  - `formatarDataGestao('2026-10-30')` retorna data localizada.
  - data inválida não lança exceção.
- [ ] **Step 2: Run RED**
  - `npm test -- --run src/views/gestaoUi.test.ts`
  - Expected: FAIL because module/functions do not exist.
- [ ] **Step 3: Implement helpers**
- [ ] **Step 4: Run GREEN**
  - Same command; expected PASS.

### Task 2: Filtro persistente e visão geral acessível

**Files:**
- Modify: `src/views/GestaoContratoDetalhe.tsx`
- Test: `src/services/gestaoContratos.test.ts` only if pure filtering behavior needs coverage.

**Interfaces:**
- Use `useSearchParams` in `GestaoContratoDetalhe`.
- Query key: `estado`.
- Empty value removes key; invalid state is treated as empty selection.

- [ ] **Step 1: Add pure test for empty/unknown state behavior if needed**
- [ ] **Step 2: Implement URL-backed state**
  - Read `searchParams.get('estado') ?? ''`.
  - Update URL with `setSearchParams`, preserving other keys.
  - Add `Limpar filtro` only when active.
  - Add `aria-live="polite"` count announcement.
- [ ] **Step 3: Consolidate overview**
  - Remove duplicate “Resumo filtrado” section.
  - Keep order from spec.
  - Add empty states for status bars and donut.
  - Add accessible labels/text summaries for charts.
- [ ] **Step 4: Run targeted tests and build**
  - `npm test -- --run src/services/gestaoContratos.test.ts`
  - `npm run build`

### Task 3: Modal and form interaction polish

**Files:**
- Modify: `src/components/gestao/ModalGestao.tsx`
- Modify: `src/components/gestao/ModalGestao.css`
- Modify: `src/views/GestaoContratos.tsx`
- Modify: `src/views/GestaoPontos.tsx`
- Modify: `src/views/GestaoProtocolos.tsx`

**Interfaces:**
- Extend `ModalGestaoProps` with optional `describedBy?: string` and `initialFocus?: 'close' | 'content'` defaulting to `content`.
- Preserve existing callers without required changes.

- [ ] **Step 1: Add modal behavior tests only if existing component test harness supports it; otherwise verify through build and browser**
- [ ] **Step 2: Implement modal semantics**
  - Set `aria-describedby` when description exists.
  - Focus first focusable control when modal opens, fallback close button.
  - Keep Escape and backdrop close behavior.
  - Add `overscroll-behavior: contain` to body.
- [ ] **Step 3: Normalize forms**
  - Add consistent footer classes to create forms.
  - Preserve labels, names, validation and submit behavior.
  - Add `aria-live="polite"` to async success/loading messages within module.
- [ ] **Step 4: Verify**
  - `npm run build`
  - Browser check of create/edit/delete, new point, new protocol and movement modal.

### Task 4: Contract menu, lists and responsive CSS

**Files:**
- Modify: `src/views/GestaoContratos.tsx`
- Modify: `src/views/GestaoPontos.tsx`
- Modify: `src/views/GestaoContratos.css`

- [ ] **Step 1: Improve menu semantics**
  - Add `aria-controls` to trigger.
  - Close on Escape and outside pointer/focus without breaking card navigation.
  - Keep delete confirmation unchanged.
- [ ] **Step 2: Improve point list hierarchy**
  - Make unlinked state explicit.
  - Keep result update, link protocol and map navigation available on mobile.
  - Add save feedback without duplicate requests.
- [ ] **Step 3: CSS cleanup**
  - Fix donut pseudo-element positioning with `position: absolute` and parent isolation.
  - Consolidate duplicate reduced-motion blocks.
  - Add `text-wrap: balance`, `min-inline-size: 0`, controlled truncation and mobile wrapping.
  - Keep explicit transition properties only.
- [ ] **Step 4: Verify responsive behavior**
  - Browser at desktop and mobile viewport; no horizontal overflow.

### Task 5: Full validation, commit, push and Hosting deploy

**Files:**
- Modify only files from Tasks 1–4.
- Commit spec and plan files if they are part of this approved work; never include `.superpowers/`.

- [ ] **Step 1: Run full checks**
  - `npm test -- --run`
  - `npm run build`
  - `git diff --check`
- [ ] **Step 2: Inspect status**
  - `git status --short --branch`
  - Confirm no unrelated module changes.
- [ ] **Step 3: Commit**
  - `git add` only Gestão de Contratos files plus approved spec/plan.
  - `git commit -m "改善: polir UX da gestao de contratos"` (use ASCII/Portuguese conventional message accepted by repo).
- [ ] **Step 4: Push**
  - `git push origin main`
- [ ] **Step 5: Deploy Hosting**
  - `npx firebase deploy --only hosting --project rerond-c747b`
  - Confirm `https://rerond-c747b.web.app`.
- [ ] **Step 6: Final status**
  - `git status --short --branch`
  - Report tests, build, commit, push, deploy and any pre-existing warnings.
