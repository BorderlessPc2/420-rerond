# Gestão de Pontos Independentes e Gráficos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir pontos sem protocolo, vinculá-los posteriormente, tornar exclusão em cascata executável com regras Firestore compatíveis e adicionar gráficos visuais reais ao dashboard da visão geral do contrato.

**Architecture:** Manter Firebase Firestore como fonte de verdade e preservar rotas existentes. Tornar `protocoloId` nullable em pontos, centralizar criação/vínculo em `gestaoContratos.ts`, calcular séries do dashboard em função pura testável e renderizar gráficos com SVG/CSS nativo, sem dependência nova. A visão geral continuará usando o recorte atual do contrato; filtros por estado serão adicionados como controle inline e alimentarão os mesmos indicadores e gráficos.

**Tech Stack:** React 19, TypeScript 5.9, React Router 7, Firebase Firestore/Storage, Vitest, SVG/CSS.

**Spec:** Documento de alinhamento fornecido pelo cliente na conversa; requisitos confirmados: pontos independentes, vínculo posterior, histórico/planejamento preservados, dashboard visual e filtro por estado. Status definitivos da planilha permanecem fora deste plano.

## Global Constraints

- Não adicionar dependências; gráficos devem usar SVG/CSS nativo.
- Preservar rotas existentes e comportamento atual de protocolos, histórico, mapa e planejamento.
- Não migrar nomenclatura de status antes da planilha oficial; usar `Situacao` atual e labels existentes.
- `protocoloId` sem vínculo deve ser armazenado como `null`, não como string vazia.
- Não inserir dados reais do cliente durante desenvolvimento.
- Toda operação que altera múltiplos documentos deve validar contrato e vínculos antes do commit.
- Toda alteração deve ter teste Vitest relevante antes da implementação e passar build completo.
- Exclusão em cascata exige confirmação explícita na interface e regras Firestore publicadas junto da mudança.

---

### Task 1: Modelar ponto sem protocolo

**Files:**
- Modify: `src/services/gestaoContratos.ts:14-19, 26-29, 79-118`
- Modify: `src/services/gestaoValidacao.ts:9-15`
- Test: `src/services/gestaoContratos.test.ts`
- Modify: `firestore.rules:44-59, 134-148`

**Interfaces:**
- Produces `Ponto.protocoloId: string | null`.
- Produces `criarPonto(contratoId: string, protocoloId: string | null, input: PontoInput): Promise<string>`.
- Produces `atualizarPontoCompleto` capaz de preservar ou alterar `protocoloId` somente via operação de vínculo dedicada.
- Produces `validarPontoInput(input, protocolo?: Pick<Protocolo, 'concessionaria' | 'rodovia'>): string | null`.

- [ ] **Step 1: Write failing tests**

Adicionar em `src/services/gestaoContratos.test.ts` casos para:

```ts
it('aceita ponto sem protocolo quando concessionária e rodovia são informadas', () => {
  expect(validarPontoInput({
    codigo: 'P-001', estado: 'GO', km: '10', tipo: 'nova_implantacao',
    concessionaria: 'Eco', rodovia: 'BR-153',
  }, undefined)).toBeNull()
})

it('mantém ponto sem protocolo como vínculo nulo', () => {
  expect(getPontoProtocolLink(null)).toBeNull()
})
```

Expor helper puro `getPontoProtocolLink(protocoloId: string | null)` apenas se necessário para manter o teste sem Firebase; caso contrário, testar a validação diretamente e remover o segundo caso.

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm test -- --run src/services/gestaoContratos.test.ts
```

Expected: FAIL porque a validação exige protocolo e `Ponto.protocoloId` ainda é `string` obrigatório.

- [ ] **Step 3: Implement minimal model change**

Alterar `Ponto` para `protocoloId: string | null`. Alterar `validarInputPonto` para aceitar protocolo opcional:

```ts
export const validarInputPonto = (
  input: PontoInput,
  protocolo?: Pick<Protocolo, 'concessionaria' | 'rodovia'>,
) => {
  const errors: string[] = []
  if (!input.codigo.trim() || !input.estado.trim() || !input.km.trim()) errors.push('Informe código, estado e quilômetro.')
  if (protocolo && (input.concessionaria.trim() !== protocolo.concessionaria.trim() || input.rodovia.trim() !== protocolo.rodovia.trim())) {
    errors.push('Ponto deve pertencer à mesma concessionária e rodovia do protocolo.')
  }
  // manter validação existente de coordenadas e resultado
  return errors
}
```

Atualizar `criarPonto` para validar contrato, aceitar `null` e gravar `protocoloId: null`. Quando `protocoloId` não for nulo, manter validações atuais de contrato, concessionária e rodovia.

Atualizar `criarProtocoloComPontos` para continuar gravando pontos vinculados ao protocolo recém-criado.

Atualizar `validPonto` nas regras para aceitar `protocoloId == null`; quando não nulo, manter `exists`, contrato, concessionária e rodovia. A regra de update deve permitir `protocoloId` apenas para operação de vínculo dedicada, não para edição genérica.

- [ ] **Step 4: Run focused tests**

Run:

```bash
npm test -- --run src/services/gestaoContratos.test.ts
```

Expected: all existing tests plus new point-without-protocol tests pass.

- [ ] **Step 5: Run build**

Run:

```bash
npm run build
```

Expected: TypeScript and Vite build pass.

- [ ] **Step 6: Commit**

```bash
git add src/services/gestaoContratos.ts src/services/gestaoValidacao.ts src/services/gestaoContratos.test.ts firestore.rules
git commit -m "feat(gestao): allow points without protocol"
```

---

### Task 2: Criar ponto independente e vincular pontos existentes

**Files:**
- Modify: `src/services/gestaoContratos.ts:85-118`
- Modify: `src/views/GestaoPontos.tsx`
- Modify: `src/views/GestaoProtocolos.tsx`
- Modify: `src/views/GestaoContratos.css`
- Test: `src/services/gestaoContratos.test.ts`

**Interfaces:**
- Produces `vincularPontosAoProtocolo(contratoId: string, protocoloId: string, pontoIds: string[]): Promise<void>`.
- Produces `listPontosSemProtocolo(contratoId: string): Promise<Ponto[]>`.
- `GestaoPontos` creates points with nullable protocol and renders `Sem protocolo`.
- `GestaoProtocolos` offers multi-select of unlinked points when creating a protocol.

- [ ] **Step 1: Write failing service tests**

Adicionar testes de contrato de API sem Firebase para validações puras, e testes de vínculo usando mocks somente onde Firestore for inevitável:

```ts
it('rejeita vínculo de ponto de outro contrato', async () => {
  await expect(vincularPontosAoProtocolo('contrato-a', 'protocolo-a', ['ponto-de-outro-contrato']))
    .rejects.toThrow('Ponto não encontrado neste contrato.')
})
```

Se o setup atual não mocka Firestore, extrair primeiro helper puro `validarVinculoPonto(protocolo, ponto)` e testar incompatibilidade de contrato, concessionária, rodovia e ponto já vinculado.

- [ ] **Step 2: Run focused test and verify RED**

Run:

```bash
npm test -- --run src/services/gestaoContratos.test.ts
```

Expected: FAIL porque `vincularPontosAoProtocolo` não existe.

- [ ] **Step 3: Implement service operations**

Implementar `listPontosSemProtocolo` com query por `contratoId` e filtro local `protocoloId == null` se o índice/query Firestore não aceitar comparação nula no ambiente atual.

Implementar `vincularPontosAoProtocolo`:

1. Buscar contrato e protocolo.
2. Buscar pontos pelos IDs e confirmar `contratoId`.
3. Confirmar que cada ponto tem `protocoloId == null`.
4. Confirmar concessionária e rodovia iguais às do protocolo.
5. Usar `writeBatch` para atualizar `protocoloId`.
6. Rejeitar lista vazia e IDs duplicados.

Não permitir mover ponto já vinculado sem uma operação explícita futura.

- [ ] **Step 4: Implement independent point form**

Em `GestaoPontos.tsx`:

- remover obrigação de selecionar protocolo;
- manter concessionária e rodovia como campos do ponto;
- permitir protocolo opcional;
- ao salvar sem protocolo, passar `null`;
- listar `Sem protocolo` quando `protocoloId == null`;
- esconder link “Ver protocolo” para pontos sem vínculo;
- manter link “Ver no mapa”.

- [ ] **Step 5: Implement protocol point selection**

Em `GestaoProtocolos.tsx`:

- carregar pontos sem protocolo via `listPontosSemProtocolo`;
- mostrar seleção múltipla no formulário de novo protocolo;
- ao salvar, criar protocolo e chamar `vincularPontosAoProtocolo` para pontos selecionados;
- manter cadastro inline de novos pontos existente;
- evitar duplicação: ponto selecionado não deve também ser criado como novo ponto.

- [ ] **Step 6: Run tests and build**

Run:

```bash
npm test -- --run src/services/gestaoContratos.test.ts
npm run build
```

Expected: focused tests and build pass.

- [ ] **Step 7: Commit**

```bash
git add src/services/gestaoContratos.ts src/services/gestaoContratos.test.ts src/views/GestaoPontos.tsx src/views/GestaoProtocolos.tsx src/views/GestaoContratos.css
git commit -m "feat(gestao): link existing points to protocols"
```

---

### Task 3: Corrigir exclusão em cascata no Firestore

**Files:**
- Modify: `firestore.rules:113-158`
- Modify: `src/services/gestaoContratos.ts:65-78`
- Test: `src/services/gestaoContratos.test.ts`

**Interfaces:**
- `excluirContrato(id: string): Promise<void>` permanece API pública.
- Delete authorization requires an authenticated user and valid ownership scope currently used by this app; no public unauthenticated delete.

- [ ] **Step 1: Write failing rules/service verification**

Adicionar teste de contrato para a política esperada:

```ts
it('exclusão em cascata cobre todas as coleções operacionais', () => {
  expect(getContratoCascadeCollections()).toEqual([
    'gestaoContratos', 'gestaoProtocolos', 'gestaoPontos', 'gestaoMovimentos',
  ])
})
```

Adicionar regra de validação local/documentação de que delete exige autenticação. Se o repositório não possui Firebase Rules Unit Testing, não criar infraestrutura nova; validar sintaxe via Firebase CLI no passo de verificação.

- [ ] **Step 2: Run focused test**

Run:

```bash
npm test -- --run src/services/gestaoContratos.test.ts
```

Expected: existing test passes; rules authorization remains unverified until emulator/CLI check.

- [ ] **Step 3: Update Firestore authorization**

Trocar os quatro `allow delete: if false` das coleções de gestão por condição autenticada e restrita ao escopo do contrato. Para documentos filhos, validar `resource.data.contratoId`; para contrato, validar o usuário autenticado conforme padrão atual do projeto.

Não permitir deletes anônimos. Não usar `allow write` amplo.

- [ ] **Step 4: Verify rules syntax and deployable rules**

Run:

```bash
npx firebase deploy --only firestore:rules --project rerond-c747b --dry-run
```

Se a CLI não suportar `--dry-run`, usar validação oficial disponível no projeto sem publicar até a revisão do diff. Publicar regras somente junto do deploy final aprovado.

- [ ] **Step 5: Run full tests and commit**

Run:

```bash
npm test -- --run
npm run build
```

Then:

```bash
git add firestore.rules src/services/gestaoContratos.ts src/services/gestaoContratos.test.ts
git commit -m "fix(gestao): authorize contract cascade deletion"
```

---

### Task 4: Criar métricas e séries do dashboard

**Files:**
- Create: `src/services/gestaoDashboard.ts`
- Create: `src/services/gestaoDashboard.test.ts`
- Modify: `src/services/gestaoContratos.ts` only if shared types need export

**Interfaces:**
- Produces:

```ts
type DashboardFiltro = { estado?: string }
type GestaoDashboardData = {
  protocolos: number
  pontos: number
  pontosSemProtocolo: number
  dentroPrazo: number
  atrasados: number
  paralisados: number
  emAndamento: number
  aprovados: number
  emCorrecao: number
  aguardandoTerceiros: number
  previstos: number
  realizados: number
  percentualDentroPrazo: number
  status: { label: string; value: string; total: number; color: string }[]
  previstoRealizado: { label: string; previsto: number; realizado: number }[]
}

export function calcularDashboardGestao(
  protocolos: Protocolo[],
  pontos: Ponto[],
  filtro?: DashboardFiltro,
): GestaoDashboardData
```

- [ ] **Step 1: Write failing tests**

Create `src/services/gestaoDashboard.test.ts` with data covering linked/unlinked points and all requested statuses:

```ts
it('calcula indicadores por estado sem remover pontos sem protocolo', () => {
  const data = calcularDashboardGestao(protocolos, pontos, { estado: 'GO' })
  expect(data.pontos).toBe(2)
  expect(data.pontosSemProtocolo).toBe(1)
  expect(data.protocolos).toBe(1)
})

it('calcula percentuais e distribuicao de status', () => {
  const data = calcularDashboardGestao(protocolos, pontos)
  expect(data.percentualDentroPrazo).toBe(50)
  expect(data.status).toEqual(expect.arrayContaining([
    expect.objectContaining({ value: 'em_correcao', total: 1 }),
  ]))
})

it('compara previsto e realizado', () => {
  const data = calcularDashboardGestao(protocolos, pontos)
  expect(data.previstoRealizado).toEqual(expect.objectContaining({
    previstos: expect.anything(),
  }))
})
```

Ajustar os exemplos aos tipos reais; o teste deve assertar comportamento, não implementação.

- [ ] **Step 2: Run test and verify RED**

Run:

```bash
npm test -- --run src/services/gestaoDashboard.test.ts
```

Expected: FAIL porque o módulo e a função ainda não existem.

- [ ] **Step 3: Implement pure calculations**

Implementar filtro por estado com estas regras:

- ponto com estado igual ao filtro permanece;
- ponto sem protocolo continua contado em pontos;
- protocolo entra no total somente se tiver ao menos um ponto filtrado ou se não houver filtro de estado;
- protocolo sem pontos continua contado quando não houver filtro de ponto;
- `pontosSemProtocolo` conta pontos cujo `protocoloId == null`;
- aprovado mapeia `aprovado_concessionaria` e `concluido` conforme regra visual documentada;
- dentro do prazo é protocolo não atrasado e não concluído negativamente;
- percentuais retornam 0 para denominador zero;
- séries usam apenas dados reais recebidos.

Manter cores em uma constante local da camada de dashboard, não espalhar valores pelos componentes.

- [ ] **Step 4: Run focused tests**

Run:

```bash
npm test -- --run src/services/gestaoDashboard.test.ts
```

Expected: all dashboard calculation tests pass.

- [ ] **Step 5: Run full suite**

Run:

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/services/gestaoDashboard.ts src/services/gestaoDashboard.test.ts
 git commit -m "feat(gestao): add dashboard metrics"
```

---

### Task 5: Renderizar gráficos visuais e filtro por estado

**Files:**
- Modify: `src/views/GestaoContratoDetalhe.tsx`
- Modify: `src/views/GestaoContratos.css`
- Create: `src/components/gestao/GestaoDashboardCharts.tsx`
- Create: `src/components/gestao/GestaoDashboardCharts.css`
- Test: `src/services/gestaoDashboard.test.ts` for any chart input transformation

**Interfaces:**
- `GestaoDashboardCharts` consumes `GestaoDashboardData` and renders SVG/CSS only.
- Props:

```ts
type GestaoDashboardChartsProps = {
  data: GestaoDashboardData
}
```

- [ ] **Step 1: Add failing UI-data test if transformation is introduced**

If chart component receives data directly, no DOM test framework is required. Add a pure test for any `toDonutSegments`/`toBarRows` helper before implementation. Do not create snapshot tests for styling.

- [ ] **Step 2: Implement chart component**

Use native SVG:

- donut chart via `circle` stroke-dasharray for status distribution;
- horizontal bars for previsto x realizado;
- accessible hidden/table text or `aria-label` with totals;
- empty state when no protocolos exist;
- no new chart dependency.

Keep one visual anchor: status donut plus compact bar comparison. Avoid duplicating every metric as a card.

- [ ] **Step 3: Add inline state filter**

In `GestaoContratoDetalhe.tsx`:

- derive unique states from `pontos`;
- add `<select aria-label="Filtrar dashboard por estado">` with `Todos os estados`;
- keep state in local React state;
- pass `{ estado }` to `calcularDashboardGestao`;
- pass filtered dashboard data to `GestaoDashboardCharts`;
- retain module navigation and map preview.

Do not use `ModalGestao` for this filter.

- [ ] **Step 4: Replace duplicated overview metrics**

Use `GestaoDashboardData` for health indicators and charts. Keep existing overview copy and cards where useful, but remove conflicting calculations so cards, charts, attention summary and map preview use the same filtered data.

Show `pontosSemProtocolo` explicitly as a neutral operational metric.

- [ ] **Step 5: Style responsive charts**

Add CSS for:

- two-column desktop chart region;
- one-column mobile layout;
- focus-visible state filter;
- sufficient contrast for chart legend;
- `prefers-reduced-motion` without animated chart transitions.

- [ ] **Step 6: Run build and full tests**

Run:

```bash
npm test -- --run
npm run build
git diff --check
```

Expected: all tests pass and production build succeeds. Existing unrelated CSS and bundle warnings may remain; record them without hiding them.

- [ ] **Step 7: Commit**

```bash
git add src/views/GestaoContratoDetalhe.tsx src/views/GestaoContratos.css src/components/gestao/GestaoDashboardCharts.tsx src/components/gestao/GestaoDashboardCharts.css src/services/gestaoDashboard.test.ts
git commit -m "feat(gestao): add visual contract dashboard"
```

---

### Task 6: Integração, validação visual e deploy

**Files:**
- Modify: `docs/RELATORIO-IMPLEMENTACAO-GESTAO-CONTRATOS-2026-10-30.md`
- Modify: `docs/RELATORIO-IMPLEMENTACAO-GESTAO-CONTRATOS-2026-10-29.md` only if a correction is required; otherwise do not rewrite history.

**Interfaces:**
- Public URL remains `https://rerond-c747b.web.app`.
- Netlify receives the same frontend through push to `origin/main`.

- [ ] **Step 1: Run final verification**

Run:

```bash
npm test -- --run
npm run build
git diff --check
git status --short --branch
```

Expected: 30 test files or updated count pass, build exits 0, no diff whitespace errors, and only intentionally untracked `.superpowers/` remains.

- [ ] **Step 2: Validate Hosting bundle**

Run:

```bash
curl -L -sS https://rerond-c747b.web.app/ | grep -E 'script type|stylesheet'
```

Expected: HTML references the bundle produced by the final build.

- [ ] **Step 3: Deploy Firestore rules and Hosting**

Run:

```bash
npx firebase deploy --only firestore:rules,hosting --project rerond-c747b
```

Expected: rules and Hosting release complete.

- [ ] **Step 4: Browser smoke test**

Using built-in Kimi browser:

1. Open `https://rerond-c747b.web.app/gestao-contratos`.
2. Open a contract.
3. Confirm overview shows state filter, metric cards, status donut and previsto/realizado chart.
4. Select a state and confirm displayed counts change.
5. Open Pontos and create a point without protocol in an authenticated session.
6. Open Protocolos and confirm unlinked point is selectable.
7. Open a protocol and confirm existing movement history remains available.
8. Do not delete a real client contract; use a test contract only.

- [ ] **Step 5: Commit report and deployment record**

```bash
git add docs/RELATORIO-IMPLEMENTACAO-GESTAO-CONTRATOS-2026-10-30.md
git commit -m "docs(gestao): record operational foundation and dashboard"
```

- [ ] **Step 6: Push final branch**

```bash
git push origin main
```

- [ ] **Step 7: Final report**

Report exact:

- implemented features;
- tests and build counts;
- rules deployment result;
- Hosting URL;
- commit IDs;
- remaining planilha/status decisions;
- any smoke-test limitation caused by authentication.

---

## Self-review

- Point independence: covered by Tasks 1–2 and Firestore rules.
- Later point-to-protocol linking: covered by Task 2.
- Historical movements: preserved; Task 5 does not replace existing history. Full activities remain a separate follow-up because client fields are not yet confirmed.
- Planning: current date planning remains intact; activity entity is deliberately not invented in this scope.
- Visual dashboard: covered by Tasks 4–5 with real data.
- State filtering: covered by Tasks 4–5.
- Spreadsheet status migration: explicitly excluded until official file review.
- Cascade deletion: covered by Task 3, including authorization rules.
- No new dependencies: enforced globally.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation step remains in the plan.
- Type consistency: `GestaoDashboardData` is produced by `calcularDashboardGestao` and consumed by `GestaoDashboardCharts`; nullable `Ponto.protocoloId` is used consistently by service, UI, rules, and calculations.
