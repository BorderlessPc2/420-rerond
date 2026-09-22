# Robustez e Assertividade da IA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aumentar a assertividade da IA com base em golden cases validados pelo cliente, recuperação documental mais precisa, verificação de evidências e métricas objetivas de evolução.

**Architecture:** Preservar o fluxo atual de Cloud Functions + Firestore + Storage. Evoluir o pipeline em camadas: primeiro medir baseline, depois recuperar contexto relevante de PDFs/projetos, depois exigir evidência verificável, e por fim alimentar métricas de aceitação/correção humana sem depender de validação imediata do cliente para cada mudança técnica.

**Tech Stack:** React + Vite, Firebase Auth/Firestore/Storage, Cloud Functions TypeScript, OpenAI, Vitest, pipeline existente em `functions/src/services/pipeline/`.

**Spec:** `docs-ia/escopo.md`, `docs-ia/checklist_sprints.md`, `docs-ia/relatorio_implementacao_2026-09-21.md`

## Global Constraints

- Prioridade: assertividade da IA antes de UI, redesign ou novas features periféricas.
- Golden cases continuam sendo validados pelo cliente; o sistema apenas melhora recuperação, comparação, medição e uso desses casos.
- Não afirmar 100% de assertividade; medir evolução e expor incerteza.
- Não misturar tipo de análise: contexto, checklist, normas, golden cases e feedbacks devem respeitar `tipoAnaliseId`.
- Prompt customizado complementa regras permanentes; não pode ignorar normas, checklist ou golden cases aprovados.
- Toda entrega deve rodar `npm run build` ou ao menos `tsc -b`; mudanças em Functions devem rodar build/testes de `functions`.
- Não implementar fine-tuning nesta leva; priorizar RAG, scoring, evidência e observabilidade.

---

## File Structure

- Modify: `functions/src/services/analiseJobProcessor.ts`
  - Orquestra seleção de contexto, golden cases, feedbacks, normas, batch analysis e consolidação.
- Modify/Create: `functions/src/services/pipeline/chunkText.ts`
  - Já existe helper de chunking; será estabilizado para chunks com metadados de documento, página aproximada e tipo documental.
- Create: `functions/src/services/pipeline/documentRetrieval.ts`
  - Seleciona chunks relevantes por tipo de análise, checklist, descrição da solicitação e golden cases aprovados.
- Create: `functions/src/services/pipeline/evidenceVerifier.ts`
  - Valida se apontamentos da IA possuem evidência, localização, norma e justificativa coerente.
- Modify: `functions/src/services/embeddingService.ts`
  - Reusar embeddings leves existentes para golden/feedback e ampliar para chunks documentais.
- Modify: `functions/src/services/goldenCaseService.ts`
  - Melhorar ranking por similaridade, tipo, organização e regra relacionada.
- Modify: `functions/src/services/feedbackAprendizadoService.ts`
  - Melhorar ranking de feedback aprovado e limitar ruído.
- Create: `functions/src/services/assertividade/assertividadeMetrics.ts`
  - Calcular baseline, deltas, aceitação humana e estimativas de falsos positivos/negativos quando houver correção.
- Create: `functions/src/services/assertividade/assertividadeMetrics.test.ts`
  - Testes unitários das métricas.
- Modify: `src/views/MetricasIA.tsx`
  - Exibir evolução por período, tipo de análise, golden coverage e taxa de correções humanas.
- Modify: `src/views/MetricasIA.css`
  - Ajustes pequenos para novas métricas, sem redesign.
- Modify: `docs-ia/checklist_sprints.md`
  - Registrar Sprint 14 como robustez/assertividade contínua.
- Create: `docs-ia/plano_robustez_assertividade_ia_2026-09-22.md`
  - Versão executiva para alinhamento com cliente/time.

---

### Task 1: Baseline de Assertividade Reprodutível

**Files:**
- Create: `functions/src/services/assertividade/assertividadeMetrics.ts`
- Create: `functions/src/services/assertividade/assertividadeMetrics.test.ts`
- Modify: `src/config/evalAssertividadeCliente.ts`
- Modify: `docs-ia/plano_robustez_assertividade_ia_2026-09-22.md`

**Interfaces:**
- Produces: `calcularMetricasAssertividade(casos: CasoAvaliado[]): MetricasAssertividade`
- Produces: `CasoAvaliado`, `MetricasAssertividade`
- Consumes: fixtures existentes em `src/config/evalAssertividadeCliente.ts`

- [ ] **Step 1: Criar teste de métricas**

```ts
import { describe, expect, it } from 'vitest'
import { calcularMetricasAssertividade, type CasoAvaliado } from './assertividadeMetrics'

describe('calcularMetricasAssertividade', () => {
  it('calcula score medio, criticos ok e taxa de correcao humana', () => {
    const casos: CasoAvaliado[] = [
      { id: 'poc-001', tipoAnaliseId: 'poc', score: 0.92, criticosOk: true, teveCorrecaoHumana: false },
      { id: 'poc-002', tipoAnaliseId: 'poc', score: 0.74, criticosOk: false, teveCorrecaoHumana: true },
      { id: 'ppu-001', tipoAnaliseId: 'ppu', score: 0.88, criticosOk: true, teveCorrecaoHumana: true },
    ]

    const result = calcularMetricasAssertividade(casos)

    expect(result.totalCasos).toBe(3)
    expect(result.scoreMedio).toBeCloseTo(0.846, 3)
    expect(result.percentualCriticosOk).toBeCloseTo(0.666, 3)
    expect(result.percentualComCorrecaoHumana).toBeCloseTo(0.666, 3)
    expect(result.porTipo.poc.scoreMedio).toBeCloseTo(0.83, 2)
    expect(result.porTipo.ppu.totalCasos).toBe(1)
  })
})
```

- [ ] **Step 2: Rodar teste e confirmar falha**

Run: `cd functions && npm test -- assertividadeMetrics.test.ts`

Expected: FAIL porque `assertividadeMetrics.ts` ainda não existe.

- [ ] **Step 3: Implementar métricas mínimas**

```ts
export interface CasoAvaliado {
  id: string
  tipoAnaliseId: string
  score: number
  criticosOk: boolean
  teveCorrecaoHumana: boolean
}

export interface GrupoMetricas {
  totalCasos: number
  scoreMedio: number
  percentualCriticosOk: number
  percentualComCorrecaoHumana: number
}

export interface MetricasAssertividade extends GrupoMetricas {
  porTipo: Record<string, GrupoMetricas>
}

function media(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function calcularGrupo(casos: CasoAvaliado[]): GrupoMetricas {
  return {
    totalCasos: casos.length,
    scoreMedio: media(casos.map((caso) => caso.score)),
    percentualCriticosOk: media(casos.map((caso) => (caso.criticosOk ? 1 : 0))),
    percentualComCorrecaoHumana: media(casos.map((caso) => (caso.teveCorrecaoHumana ? 1 : 0))),
  }
}

export function calcularMetricasAssertividade(casos: CasoAvaliado[]): MetricasAssertividade {
  const porTipo: Record<string, GrupoMetricas> = {}

  for (const caso of casos) {
    const grupo = casos.filter((item) => item.tipoAnaliseId === caso.tipoAnaliseId)
    porTipo[caso.tipoAnaliseId] = calcularGrupo(grupo)
  }

  return {
    ...calcularGrupo(casos),
    porTipo,
  }
}
```

- [ ] **Step 4: Rodar teste**

Run: `cd functions && npm test -- assertividadeMetrics.test.ts`

Expected: PASS.

- [ ] **Step 5: Documentar baseline operacional**

Add to `docs-ia/plano_robustez_assertividade_ia_2026-09-22.md`:

```md
# Plano de Robustez e Assertividade da IA

## Baseline

A assertividade passa a ser medida por tipo de análise, com três sinais:

- score médio produzido pelo avaliador interno;
- percentual de itens críticos considerados corretos;
- percentual de análises que exigiram correção humana.

O cliente continua validando golden cases. A equipe técnica usa esses sinais para comparar versões do pipeline antes e depois de cada mudança.
```

- [ ] **Step 6: Commit**

```bash
git add functions/src/services/assertividade src/config/evalAssertividadeCliente.ts docs-ia/plano_robustez_assertividade_ia_2026-09-22.md
git commit -m "feat: add assertividade baseline metrics"
```

---

### Task 2: RAG Documental dos PDFs de Projeto

**Files:**
- Modify: `functions/src/services/pipeline/chunkText.ts`
- Create: `functions/src/services/pipeline/documentRetrieval.ts`
- Create: `functions/src/services/pipeline/documentRetrieval.test.ts`
- Modify: `functions/src/services/embeddingService.ts`
- Modify: `functions/src/services/analiseJobProcessor.ts`

**Interfaces:**
- Produces: `selecionarChunksRelevantes(params: SelecionarChunksParams): Promise<RetrievedChunk[]>`
- Consumes: chunks extraídos de documentos atuais, `tipoAnaliseId`, checklist e descrição da solicitação.

- [ ] **Step 1: Criar teste de seleção por tipo e relevância**

```ts
import { describe, expect, it } from 'vitest'
import { selecionarChunksRelevantesSync, type DocumentChunk } from './documentRetrieval'

describe('selecionarChunksRelevantesSync', () => {
  it('prioriza chunks do tipo correto e com termos do checklist', () => {
    const chunks: DocumentChunk[] = [
      { id: '1', documentName: 'memorial.pdf', tipoDocumento: 'memorial', text: 'acesso com faixa de aceleracao e drenagem', pageStart: 1, pageEnd: 2 },
      { id: '2', documentName: 'anexo.pdf', tipoDocumento: 'outro', text: 'contrato social da empresa', pageStart: 1, pageEnd: 1 },
      { id: '3', documentName: 'planta.pdf', tipoDocumento: 'planta', text: 'ocupacao longitudinal em faixa de dominio', pageStart: 3, pageEnd: 4 },
    ]

    const result = selecionarChunksRelevantesSync({
      chunks,
      query: 'avaliar acesso rodoviario com drenagem',
      checklistTerms: ['acesso', 'drenagem'],
      maxChunks: 2,
    })

    expect(result.map((chunk) => chunk.id)).toEqual(['1', '3'])
  })
})
```

- [ ] **Step 2: Rodar teste e confirmar falha**

Run: `cd functions && npm test -- documentRetrieval.test.ts`

Expected: FAIL porque o módulo ainda não existe.

- [ ] **Step 3: Implementar ranking inicial determinístico**

```ts
export interface DocumentChunk {
  id: string
  documentName: string
  tipoDocumento: string
  text: string
  pageStart?: number
  pageEnd?: number
}

export interface SelecionarChunksSyncParams {
  chunks: DocumentChunk[]
  query: string
  checklistTerms: string[]
  maxChunks: number
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function scoreChunk(chunk: DocumentChunk, query: string, checklistTerms: string[]): number {
  const haystack = normalize(`${chunk.tipoDocumento} ${chunk.documentName} ${chunk.text}`)
  const queryTerms = normalize(query).split(/\s+/).filter((term) => term.length > 3)
  const checklistScore = checklistTerms.filter((term) => haystack.includes(normalize(term))).length * 3
  const queryScore = queryTerms.filter((term) => haystack.includes(term)).length
  const technicalBoost = ['memorial', 'planta', 'perfil', 'art'].includes(normalize(chunk.tipoDocumento)) ? 2 : 0
  return checklistScore + queryScore + technicalBoost
}

export function selecionarChunksRelevantesSync(params: SelecionarChunksSyncParams): DocumentChunk[] {
  return [...params.chunks]
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, params.query, params.checklistTerms) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.chunk.documentName.localeCompare(b.chunk.documentName))
    .slice(0, params.maxChunks)
    .map((item) => item.chunk)
}
```

- [ ] **Step 4: Integrar embeddings sem bloquear fallback**

In `documentRetrieval.ts`, add async wrapper:

```ts
export async function selecionarChunksRelevantes(params: SelecionarChunksSyncParams): Promise<DocumentChunk[]> {
  return selecionarChunksRelevantesSync(params)
}
```

Use this wrapper from `analiseJobProcessor.ts` before building the prompt. Keep deterministic fallback if embedding provider is unavailable.

- [ ] **Step 5: Rodar testes do pipeline**

Run: `cd functions && npm test -- documentRetrieval.test.ts pipeline.test.ts manyFiles.stability.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add functions/src/services/pipeline/documentRetrieval.ts functions/src/services/pipeline/documentRetrieval.test.ts functions/src/services/pipeline/chunkText.ts functions/src/services/embeddingService.ts functions/src/services/analiseJobProcessor.ts
git commit -m "feat: add document retrieval for project PDFs"
```

---

### Task 3: Verificador de Evidência e Justificativa

**Files:**
- Create: `functions/src/services/pipeline/evidenceVerifier.ts`
- Create: `functions/src/services/pipeline/evidenceVerifier.test.ts`
- Modify: `functions/src/services/analiseJobProcessor.ts`
- Modify: `src/components/ChecklistReportView.tsx`

**Interfaces:**
- Produces: `verificarEvidencias(relatorio: AnaliseEstruturada): EvidenceVerificationResult`
- Consumes: relatório estruturado/checklist produzido pela IA.

- [ ] **Step 1: Criar teste do verificador**

```ts
import { describe, expect, it } from 'vitest'
import { verificarEvidencias } from './evidenceVerifier'

describe('verificarEvidencias', () => {
  it('marca item fragil quando falta localizacao ou justificativa', () => {
    const result = verificarEvidencias({
      itens: [
        { id: 'A', status: 'NAO_CONFORME', evidencia: 'Memorial cita largura de 4m', localizacao: 'memorial.pdf p. 4', justificativa: 'Norma exige 5m', norma: 'Norma X' },
        { id: 'B', status: 'INFORMACAO_AUSENTE', evidencia: '', localizacao: '', justificativa: 'Nao encontrado', norma: 'Norma Y' },
      ],
    })

    expect(result.itensFrageis).toEqual(['B'])
    expect(result.percentualComEvidenciaCompleta).toBe(0.5)
  })
})
```

- [ ] **Step 2: Rodar teste e confirmar falha**

Run: `cd functions && npm test -- evidenceVerifier.test.ts`

Expected: FAIL porque `evidenceVerifier.ts` ainda não existe.

- [ ] **Step 3: Implementar verificador**

```ts
export interface EvidenceChecklistItem {
  id: string
  status: string
  evidencia?: string
  localizacao?: string
  justificativa?: string
  norma?: string
}

export interface AnaliseEstruturada {
  itens: EvidenceChecklistItem[]
}

export interface EvidenceVerificationResult {
  totalItens: number
  itensFrageis: string[]
  percentualComEvidenciaCompleta: number
}

function hasContent(value: string | undefined): boolean {
  return Boolean(value && value.trim().length >= 8)
}

export function verificarEvidencias(relatorio: AnaliseEstruturada): EvidenceVerificationResult {
  const itensFrageis = relatorio.itens
    .filter((item) => {
      if (item.status === 'CONFORME') return false
      return !hasContent(item.evidencia) || !hasContent(item.localizacao) || !hasContent(item.justificativa) || !hasContent(item.norma)
    })
    .map((item) => item.id)

  const totalItens = relatorio.itens.length
  const completos = totalItens - itensFrageis.length

  return {
    totalItens,
    itensFrageis,
    percentualComEvidenciaCompleta: totalItens === 0 ? 0 : completos / totalItens,
  }
}
```

- [ ] **Step 4: Integrar resultado na análise**

In `analiseJobProcessor.ts`, after structured checklist parse, persist:

```ts
const evidenceVerification = verificarEvidencias({ itens: checklistItens })
```

Store under analysis/job telemetry:

```ts
evidenceVerification: {
  totalItens: evidenceVerification.totalItens,
  itensFrageis: evidenceVerification.itensFrageis,
  percentualComEvidenciaCompleta: evidenceVerification.percentualComEvidenciaCompleta,
}
```

- [ ] **Step 5: Mostrar aviso discreto no relatório**

In `ChecklistReportView.tsx`, when `percentualComEvidenciaCompleta < 0.85`, show a compact warning:

```tsx
<div className="checklist-evidence-warning">
  Há apontamentos que precisam de revisão humana por falta de evidência completa.
</div>
```

- [ ] **Step 6: Rodar testes e build**

Run: `cd functions && npm test -- evidenceVerifier.test.ts`

Run: `npm run build`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add functions/src/services/pipeline/evidenceVerifier.ts functions/src/services/pipeline/evidenceVerifier.test.ts functions/src/services/analiseJobProcessor.ts src/components/ChecklistReportView.tsx
git commit -m "feat: verify checklist evidence quality"
```

---

### Task 4: Ranking Melhorado de Golden Cases e Feedbacks

**Files:**
- Modify: `functions/src/services/goldenCaseService.ts`
- Modify: `functions/src/services/feedbackAprendizadoService.ts`
- Create: `functions/src/services/contextSelection/contextSelection.test.ts`
- Modify: `functions/src/services/analiseJobProcessor.ts`

**Interfaces:**
- Produces: `selecionarGoldenCasesRelevantes(params): Promise<GoldenCase[]>`
- Produces: `selecionarFeedbacksRelevantes(params): Promise<FeedbackAprendizado[]>`
- Consumes: `tipoAnaliseId`, `concessionariaId`, `organizacaoId`, descrição da solicitação, documentos classificados.

- [ ] **Step 1: Criar testes de isolamento**

```ts
import { describe, expect, it } from 'vitest'
import { rankByContext } from './rankByContext'

describe('rankByContext', () => {
  it('nunca retorna item de outro tipo quando existem itens do tipo correto', () => {
    const result = rankByContext({
      items: [
        { id: 'acesso-1', tipoAnaliseId: 'acesso', text: 'acesso drenagem faixa aceleracao' },
        { id: 'ocup-1', tipoAnaliseId: 'ocupacao-faixa', text: 'ocupacao longitudinal' },
      ],
      tipoAnaliseId: 'acesso',
      query: 'analise de acesso com drenagem',
      maxItems: 3,
    })

    expect(result.map((item) => item.id)).toEqual(['acesso-1'])
  })
})
```

- [ ] **Step 2: Implementar helper puro de ranking**

Create `functions/src/services/contextSelection/rankByContext.ts`:

```ts
export interface RankableContextItem {
  id: string
  tipoAnaliseId?: string
  organizacaoId?: string
  concessionariaId?: string
  text: string
}

export interface RankByContextParams<T extends RankableContextItem> {
  items: T[]
  tipoAnaliseId: string
  organizacaoId?: string
  concessionariaId?: string
  query: string
  maxItems: number
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function rankByContext<T extends RankableContextItem>(params: RankByContextParams<T>): T[] {
  const sameType = params.items.filter((item) => item.tipoAnaliseId === params.tipoAnaliseId)
  const pool = sameType.length > 0 ? sameType : params.items.filter((item) => !item.tipoAnaliseId)
  const terms = normalize(params.query).split(/\s+/).filter((term) => term.length > 3)

  return pool
    .map((item) => {
      const text = normalize(item.text)
      const textScore = terms.filter((term) => text.includes(term)).length
      const orgScore = item.organizacaoId && item.organizacaoId === params.organizacaoId ? 4 : 0
      const concessionariaScore = item.concessionariaId && item.concessionariaId === params.concessionariaId ? 3 : 0
      return { item, score: textScore + orgScore + concessionariaScore }
    })
    .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
    .slice(0, params.maxItems)
    .map((entry) => entry.item)
}
```

- [ ] **Step 3: Conectar golden cases ao ranking**

In `goldenCaseService.ts`, normalize each golden case into `RankableContextItem` using fields:

```ts
{
  id: golden.id,
  tipoAnaliseId: golden.tipoAnaliseId,
  organizacaoId: golden.organizacaoId,
  concessionariaId: golden.concessionariaId,
  text: `${golden.titulo} ${golden.observacoes} ${golden.analiseCorreta} ${golden.errosComuns}`,
}
```

- [ ] **Step 4: Conectar feedbacks ao ranking**

In `feedbackAprendizadoService.ts`, normalize:

```ts
{
  id: feedback.id,
  tipoAnaliseId: feedback.tipoAnaliseId,
  organizacaoId: feedback.organizacaoId,
  concessionariaId: feedback.concessionariaId,
  text: `${feedback.regraRelacionada} ${feedback.respostaOriginal} ${feedback.correcaoHumana} ${feedback.justificativa}`,
}
```

- [ ] **Step 5: Rodar testes**

Run: `cd functions && npm test -- contextSelection`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add functions/src/services/contextSelection functions/src/services/goldenCaseService.ts functions/src/services/feedbackAprendizadoService.ts functions/src/services/analiseJobProcessor.ts
git commit -m "feat: rank golden cases and feedback by context"
```

---

### Task 5: Métricas Finas na Tela `/metricas-ia`

**Files:**
- Modify: `src/views/MetricasIA.tsx`
- Modify: `src/views/MetricasIA.css`
- Modify: `src/services/analiseVersao/analiseVersaoService.ts`
- Modify: `src/models/AnaliseVersao.ts`

**Interfaces:**
- Consumes: `assertividadeScore`, `evidenceVerification`, status de aprovação/rejeição, edição humana e tipo de análise.
- Produces UI metrics: evolução por tipo, cobertura por golden case, itens frágeis por análise, correções humanas.

- [ ] **Step 1: Adicionar campos no model**

In `src/models/AnaliseVersao.ts`:

```ts
export interface EvidenceVerification {
  totalItens: number
  itensFrageis: string[]
  percentualComEvidenciaCompleta: number
}
```

Add optional field to analysis version:

```ts
evidenceVerification?: EvidenceVerification
teveCorrecaoHumana?: boolean
goldenCasesUsados?: string[]
feedbacksUsados?: string[]
```

- [ ] **Step 2: Agregar métricas no service**

In `analiseVersaoService.ts`, map missing values safely:

```ts
const evidenceCoverage = versoes
  .map((versao) => versao.evidenceVerification?.percentualComEvidenciaCompleta)
  .filter((value): value is number => typeof value === 'number')
```

Calculate:

```ts
mediaEvidenciaCompleta
totalComCorrecaoHumana
totalGoldenCasesUsados
```

- [ ] **Step 3: Renderizar cards compactos**

In `MetricasIA.tsx`, add cards:

```tsx
<div className="metric-card">
  <span className="metric-label">Evidência completa</span>
  <strong>{formatPercent(metricas.mediaEvidenciaCompleta)}</strong>
</div>
<div className="metric-card">
  <span className="metric-label">Com correção humana</span>
  <strong>{metricas.totalComCorrecaoHumana}</strong>
</div>
<div className="metric-card">
  <span className="metric-label">Golden cases usados</span>
  <strong>{metricas.totalGoldenCasesUsados}</strong>
</div>
```

- [ ] **Step 4: Rodar build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/MetricasIA.tsx src/views/MetricasIA.css src/services/analiseVersao/analiseVersaoService.ts src/models/AnaliseVersao.ts
git commit -m "feat: show fine grained IA quality metrics"
```

---

### Task 6: Documentar Sprint 14 e Critérios de Continuidade

**Files:**
- Modify: `docs-ia/checklist_sprints.md`
- Modify: `docs-ia/escopo.md`
- Modify: `docs-ia/plano_robustez_assertividade_ia_2026-09-22.md`

**Interfaces:**
- Produces: Sprint 14 documented with acceptance criteria.

- [ ] **Step 1: Adicionar Sprint 14**

Add to `docs-ia/checklist_sprints.md`:

```md
### Sprint 14 — Robustez e assertividade contínua da IA

**Objetivo:** aumentar assertividade sem depender de fine-tune, usando golden cases validados pelo cliente, RAG documental, verificação de evidência e métricas finas.

- [ ] Baseline reprodutível por tipo de análise
- [ ] RAG documental dos PDFs de projeto
- [ ] Verificador de evidência/localização/justificativa/norma
- [ ] Ranking contextual de golden cases e feedbacks aprovados
- [ ] Métricas finas: correções humanas, evidência completa, golden cases usados

**Critérios de aceite**

1. A análise usa golden cases e feedbacks somente do tipo de análise correto.
2. Itens não conformes ou ausentes vêm com evidência, localização, justificativa e norma.
3. O painel mostra evolução de assertividade e sinais de revisão humana.
4. O pipeline continua funcionando com muitos PDFs e PDFs grandes.
```

- [ ] **Step 2: Atualizar escopo**

Add under “Planejado” in `docs-ia/escopo.md`:

```md
- Sprint 14: robustez de assertividade com RAG documental, verificação de evidência e métricas finas.
```

- [ ] **Step 3: Rodar verificação**

Run: `npm run build`

Run: `cd functions && npm test`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add docs-ia/checklist_sprints.md docs-ia/escopo.md docs-ia/plano_robustez_assertividade_ia_2026-09-22.md
git commit -m "docs: plan sprint 14 IA assertividade"
```

---

## Recommended Execution Order

1. Task 1: cria régua de medição antes de alterar comportamento.
2. Task 4: melhora golden/feedback com baixo risco e alto impacto.
3. Task 3: aumenta qualidade dos apontamentos e reduz justificativa fraca.
4. Task 2: adiciona RAG documental, a parte mais sensível do pipeline.
5. Task 5: expõe evolução no produto.
6. Task 6: fecha documentação e critérios.

## Self-Review

- Spec coverage: cobre assertividade, golden cases, feedback, memória indireta via versões, escala documental, métricas e não mistura tipos.
- Placeholder scan: não há uso de “TBD”, “TODO” ou “implementar depois”.
- Type consistency: interfaces de métricas, retrieval, ranking e evidência foram definidas antes de uso.
