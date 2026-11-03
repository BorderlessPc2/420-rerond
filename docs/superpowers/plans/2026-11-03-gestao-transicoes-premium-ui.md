# Gestão de Contratos — Transições guiadas e UI premium (tokens)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement scope-by-scope. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevar tramitação (etapa × situação) de “formulário com selects” para fluxo guiado e premium, alinhando motion/cor ao design system (`index.css`) em todo o módulo gestão — sem novas dependências e sem redesign fora do escopo.

**Architecture:** Expandir `gestaoTransicoes.ts` (API pura de opções + descrição de transição) antes da UI. Componentes novos em `src/components/gestao/`; estilos centralizados em `GestaoContratos.css` + `ModalGestao.css` com tokens `--gestao-*` derivados de `:root`.

**Tech Stack:** React 19, TypeScript, CSS tokens existentes, Vitest.

**Referências:** Spec §4 (etapas/situações), §9 (Transições); auditoria chat 03/11/2026; plano `2026-11-03-gestao-contratos-conclusao.md` (escopo 2 já entregue na base).

## Ordem recomendada entre escopos

```text
Escopo 1 (API transição)   → desbloqueia UI filtrada e composer
Escopo 2 (Composer modal)  → depende de 1; maior valor operacional
Escopo 3 (Stepper detalhe) → depende de 1; visual + orientação
Escopo 4 (Tokens motion)   → paralelo após 1; base para 5
Escopo 5 (Micro-interações) → depende de 4; polish premium
Escopo 6 (Qualidade)       → gates + doc matriz + roteiro manual
```

## Global Constraints

- Não alterar módulos fora de Gestão de Contratos (salvo tokens globais em `index.css` **somente se** alias reutilizável, preferir escopo `.gestao-page`).
- Não mudar regras de negócio de transição sem alinhar com spec §4/§9; UI reflete `validarTransicao`, não substitui.
- Sem bibliotecas de animação (Framer, etc.); CSS + tokens apenas.
- `prefers-reduced-motion: reduce` obrigatório em toda animação nova.
- Cada escopo termina com: testes focados (escopos 1–2) + `npm run build` + checklist manual curto.

## Review Focus (gates globais)

- Combinação inválida **não** chega ao submit (select filtrado ou disabled com motivo).
- `validarTransicao` continua sendo fonte da verdade no `registrarMovimento` (UI não enfraquece backend).
- Conclusão: operador vê contagem de pontos sem resultado **antes** de tentar submit.
- Nenhum hex hardcoded novo em CSS do módulo gestão (usar `--color-*` / `--gestao-*`).
- Animações desligadas ou reduzidas com `prefers-reduced-motion`.

---

## Escopo 1 — API de transição guiada

**Objetivo:** Expor matriz e opções permitidas para a UI, com descrição estruturada da transição (de → para, erros, observação obrigatória, bloqueios de conclusão).

**Critério de aceite:**

- Dado etapa/status atuais, listar etapas e situações **permitidas** sem duplicar lógica divergente de `validarTransicao`.
- `descreverTransicao(...)` retorna `{ valido, erro, de, para, requerObservacao, pontosSemResultado? }` coerente com `validarTransicao`.
- Testes cobrem combinações críticas já existentes + novos helpers.

**Files:**

- Modify: `src/services/gestaoTransicoes.ts`
- Modify: `src/services/gestaoContratos.ts` (re-export se necessário)
- Test: `src/services/gestaoTransicoes.test.ts`

**Tasks:**

- [x] **1.1 `listarEtapasPermitidas(etapaAtual, statusAtual)`** — respeita ordem `ETAPAS_ORDEM` e protocolo concluído.
- [x] **1.2 `listarSituacoesPermitidas(etapaAlvo, etapaAtual, statusAtual)`** — implementado como `listarSituacoesAlcancaveis` + motivo por opção.
- [x] **1.3 `descreverTransicao(...)`** — encapsula `validarTransicao` + metadados para UI.
- [x] **1.4 `motivoTransicaoIndisponivel(...)`** (opcional) — string curta para tooltip em opção disabled.
- [x] **1.5 Testes:** espelhar casos de correção sem obs, conclusão com pontos pendentes, retrocesso bloqueado.
- [x] **1.6 Verificação:** `npm test -- gestaoTransicoes` + build.

**Fora deste escopo:** matriz editável em Firestore; perfis admin para reabrir concluído.

---

## Escopo 2 — Composer de transição no modal de movimentação

**Objetivo:** Substituir experiência de dois selects livres por intenção + confirmação visual, mantendo campos atuais (tipo, data, anexos, observação).

**Critério de aceite (spec §9 Transições):**

- Operador não seleciona combinação impossível sem ver motivo (opções filtradas ou disabled + `title`/`aria-describedby`).
- Preview mostra **De → Para** (etapa e situação) com badges semânticos.
- Chips de intenção: manter etapa / mudar situação / correção / paralisação / avançar etapa / concluir — pré-preenchem valores permitidos.
- Correção e paralisação focam observação quando obrigatória.
- Submit permanece desabilitado se `descreverTransicao` reportar erro.

**Files:**

- Create: `src/components/gestao/GestaoTransicaoComposer.tsx`
- Modify: `src/views/GestaoProtocolos.tsx` (`GestaoProtocoloDetalhe` — modal movimentação)
- Modify: `src/views/GestaoContratos.css` (composer, chips, diff panel)
- Test: `src/services/gestaoTransicoes.test.ts` (lógica); teste leve de helper UI se extrair pure fn

**Tasks:**

- [x] **2.1 Componente composer** — props: estado atual, draft etapa/status, pontos vinculados, callbacks.
- [x] **2.2 Integrar no modal** — wire com `validarTransicao` / `descreverTransicao`; remover preview texto plano atual.
- [x] **2.3 Bloco conclusão** — se pontos sem resultado, listar contagem + link para lista/mapa filtrado.
- [x] **2.4 Acessibilidade** — `aria-live` em erro/sucesso de transição; labels etapa vs situação explícitos (spec §4).
- [ ] **2.5 Verificação manual:** correção sem obs → bloqueio; transição válida → histórico; inválida → sem write.

**Fora deste escopo:** presets automáticos por texto do campo “tipo” de movimentação (v2).

---

## Escopo 3 — Stepper premium no detalhe do protocolo

**Objetivo:** Barra de etapas alinhada ao ciclo operacional, com situação atual legível e feedback após movimentação.

**Critério de aceite:**

- Stepper segmentado (6 etapas) usa tokens primários/semânticos; etapa atual e concluídas distinguíveis.
- Anel ou badge de **situação** no passo atual (warning/danger/success).
- Após registrar movimentação bem-sucedida, animação curta na barra (progresso) respeitando reduced-motion.
- Mobile: stepper scroll horizontal ou labels abreviados sem overflow.

**Files:**

- Create: `src/components/gestao/GestaoEtapaStepper.tsx` (ou evoluir markup em detalhe)
- Modify: `src/views/GestaoProtocolos.tsx` (detalhe)
- Modify: `src/views/GestaoContratos.css`

**Tasks:**

- [x] **3.1 Componente stepper** — consome `progressoEtapa` + etapa/status atuais.
- [x] **3.2 Substituir/enriquecer** `.gestao-stage-progress` no detalhe.
- [x] **3.3 Pulse pós-save** — classe temporária após `registrarMovimento` ok (timeout/remover).
- [ ] **3.4 Verificação:** avançar etapa na UI reflete stepper + resumo lateral.

**Fora deste escopo:** stepper clicável para navegar etapas (somente leitura v1).

---

## Escopo 4 — Fundação tokens e motion no módulo

**Objetivo:** Unificar duração/easing e eliminar inconsistências de cor no CSS gestão.

**Critério de aceite:**

- Variáveis `--gestao-duration-fast|moderate`, `--gestao-ease-out|emphasis` em `.gestao-page` (ou `:root` se reutilização futura).
- Substituir fallbacks `#176b3a`, `#5c6470`, `--color-accent500` por tokens oficiais.
- Legenda mapa usa aliases semânticos (`--color-success`, `--color-danger`, etc.), não hex soltos.
- Backdrop modal usa `color-mix` + `--color-primary-900`.

**Files:**

- Modify: `src/views/GestaoContratos.css`
- Modify: `src/components/gestao/ModalGestao.css`
- Optional: `src/index.css` (somente aliases mapa se compartilhados)

**Tasks:**

- [x] **4.1 Definir bloco `--gestao-*`** e migrar transições `.18s ease` / dashboard cubic-bezier para tokens.
- [x] **4.2 Normalizar success/warning/muted** — remover fallbacks hardcoded no módulo.
- [x] **4.3 Mapa + status** — tokenizar cores da legenda Leaflet/CSS.
- [x] **4.4 Modal backdrop/sombra** — alinhar a `--shadow-lg` + primary alpha.
- [x] **4.5 Verificação:** inspeção visual dashboard + detalhe protocolo + modal; build.

**Fora deste escopo:** dark mode; tema por concessionária.

---

## Escopo 5 — Micro-interações premium (superfícies)

**Objetivo:** Mesmo nível de polish do bloco `gestao-health` nas listas, timeline, importação e modais.

**Critério de aceite:**

- Modal: animação de saída (ou fade) + reduced-motion off.
- Timeline: entrada suave de novo item; badge **Etapa/Status alterados** quando differ do movimento anterior.
- Lista de protocolos: hover coerente com cards (sombra/borda token).
- Painel detecção planilha (novo protocolo): stagger nos chips de colunas (padrão quicklinks).
- Erro de transição: feedback visual no composer (shake leve 1×, opcional).

**Files:**

- Modify: `src/views/GestaoProtocolos.tsx`, `GestaoContratoDetalhe.tsx`, `GestaoContratos.tsx`
- Modify: `src/views/GestaoContratos.css`, `ModalGestao.css`
- Modify: `src/components/gestao/ModalGestao.tsx` (classe exit se necessário)

**Tasks:**

- [x] **5.1 Modal enter/exit** — CSS + estado `closing` mínimo se needed.
- [x] **5.2 Timeline diff** — comparar etapa/status com movimento anterior no render.
- [x] **5.3 Listas e cards** — unificar hover/active com `--gestao-duration-*`.
- [x] **5.4 Import planilha modal** — stagger `.gestao-sheet-fields li`.
- [x] **5.5 Nav contrato** — indicador deslizante aba ativa (opcional se baixo risco).
- [ ] **5.6 Verificação manual:** reduced-motion no SO; fluxos lista → detalhe → movimentação.

**Fora deste escopo:** page transitions View Transitions API global no app.

---

## Escopo 6 — Qualidade, documentação e validação

**Objetivo:** Fechar ciclo com gates, matriz documentada e roteiro manual de transições + percepção visual.

**Critério de aceite:**

- Gates locais passam; gestão eslint sem erros novos nos arquivos tocados.
- Spec §4 ou apêndice no plano com matriz resumida etapa × situação (link para código).
- Entrada no relatório `docs/RELATORIO-IMPLEMENTACAO-GESTAO-CONTRATOS-2026-11-XX.md` (transições + UI).

**Files:**

- Create/update: relatório de implementação
- Modify: `docs/superpowers/specs/2026-10-28-gestao-contratos-spec.md` (§8 pendente premium UX, opcional)
- Modify: checkboxes deste plano

**Tasks:**

- [ ] **6.1 Roteiro manual transições:**

```text
abrir protocolo → composer: correção sem obs (bloqueio)
→ correção com obs → histórico
→ tentar conclusão com ponto sem resultado (bloqueio + link)
→ concluir válido → stepper concluído irreversível
→ reduced-motion: sem animações invasivas
```

- [x] **6.2 Gates:**

```bash
npm test -- --run
npm run build
npx eslint "src/services/gestaoTransicoes.ts" "src/components/gestao/GestaoTransicao*.tsx" "src/components/gestao/GestaoEtapaStepper.tsx"
```

- [x] **6.3 Atualizar spec §8** — transição guiada + tokens motion como implementado/pendente.
- [ ] **6.4 Deploy** — somente se solicitado (hosting; rules inalteradas salvo mudança de modelo).

**Fora deste escopo:** deploy automático; lint repo-wide.

---

## Estimativa de esforço (referência)

| Escopo | Complexidade | Dependências |
|--------|--------------|--------------|
| 1 API transição | Média | — |
| 2 Composer modal | Média–alta | 1 |
| 3 Stepper detalhe | Média | 1 |
| 4 Tokens motion | Baixa–média | — (paralelo 2–3) |
| 5 Micro-interações | Média | 4 |
| 6 Qualidade | Baixa contínua | 1–5 |

## Entregáveis por escopo

Cada escopo fechado deve produzir:

1. PR ou commit focado em gestão (+ `index.css` só se escopo 4 exigir alias global).
2. Testes Vitest nos riscos do escopo 1–2.
3. Entrada curta no relatório de implementação (o que mudou, como validar).
4. Checkboxes deste plano atualizados.

## Self-review

- **Cobertura:** escopos 1–2 atendem spec §9 Transições na UX; escopo 3 §4 (etapa vs situação visível); 4–5 premium DS; 6 §11 parcial.
- **Sem scope creep:** reabrir concluído, matriz em Firestore, animações libs, redesign app inteiro — fora.
- **Paralelismo:** dev A (1→2→3), dev B (4→5) após 1 mergeado; 6 no fechamento.

## Workflow sugerido (como ciclo anterior)

Após cada escopo: implementar → test/build → resumir → perguntar **“está ok?”** → preview do próximo escopo.
