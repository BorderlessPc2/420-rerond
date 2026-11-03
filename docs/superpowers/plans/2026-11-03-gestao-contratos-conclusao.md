# Gestão de Contratos — Plano de conclusão

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement scope-by-scope. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar os gaps entre a spec `2026-10-28-gestao-contratos-spec.md` e o código publicado, sem IA, sem redesign amplo e sem novas dependências.

**Architecture:** Serviços primeiro (`gestaoContratos`, `gestaoImportacao`, `gestaoValidacao`), depois telas existentes (`GestaoProtocolos`, `GestaoPontos`, `GestaoContratos`, `GestaoContratoDetalhe`). Reutilizar `ModalGestao`, `GestaoContratos.css` e padrões de feedback já usados no módulo.

**Tech Stack:** React 19, TypeScript, Firestore, Storage, Vitest, `xlsx`.

**Referências:** Spec §8–9; plano `2026-10-28-gestao-contratos.md`; relatórios `docs/RELATORIO-IMPLEMENTACAO-GESTAO-CONTRATOS-*.md`.

## Ordem recomendada entre escopos

```text
Escopo 1 (Edição UI)     → desbloqueia operação diária
Escopo 2 (Transições)    → depende de edição estável nos detalhes de protocolo
Escopo 3 (Importação)    → paralelo após Escopo 1, se equipe dividida
Escopo 4 (Consulta)      → pode começar após filtros/indicadores atuais
Escopo 5 (Contrato)      → pode ser paralelo; menor urgência operacional
Escopo 6 (Qualidade)     → contínuo; gate final antes de deploy
```

## Global Constraints

- Não alterar módulos fora de Gestão de Contratos, salvo `firestore.rules` / `storage.rules`.
- Preservar IDs e vínculos em toda edição; proibir “editar” recriando documentos.
- Testes novos apenas em riscos críticos: vínculo, transição, idempotência de importação, exclusão em cascata (mock).
- Não adicionar bibliotecas; exportação usa `xlsx` já instalado.
- Cada escopo termina com: testes focados + `npm run build` + checklist manual curto.

## Review Focus (gates globais)

- `atualizarProtocolo` / `atualizarPontoCompleto` com vínculo inválido → falha sem write.
- Transição inválida → falha antes de upload de anexo e antes de `writeBatch`.
- Segunda importação idêntica → zero pontos novos duplicados.
- Indicadores e gráficos do dashboard → mesma população que `filtrarGestao` do recorte ativo.
- Anexo com falha na transação → erro visível; protocolo não atualizado.

---

## Escopo 1 — Edição operacional (protocolo e ponto)

**Objetivo:** Operador corrige dados sem excluir/recriar registros. Backend já expõe `atualizarProtocolo` e `atualizarPontoCompleto`; falta UI e feedback.

**Critério de aceite (spec §9 Edição):**

- Editar protocolo mantém `id`, `contratoId` e compatibilidade com pontos vinculados.
- Editar ponto mantém `id` e `contratoId`; mudança de `protocoloId` só via `vincularPontoProtocolo`.
- Erros de validação aparecem no modal; sucesso dispara refresh do `Outlet`.

**Files:**

- Modify: `src/views/GestaoProtocolos.tsx` (lista + detalhe)
- Modify: `src/views/GestaoPontos.tsx`
- Modify: `src/services/gestaoContratos.ts` (somente se faltar validação na borda)
- Test: `src/services/gestaoContratos.test.ts` (vínculo incorreto em update)

**Tasks:**

- [x] **1.1 Modal “Editar protocolo”** no detalhe (ou menu na lista): título, concessionária, rodovia, número; bloquear save se pontos existentes ficarem incompatíveis (mensagem clara; não migrar pontos automaticamente).
- [x] **1.2 Modal “Editar ponto”** na lista de pontos: código, estado, km, tipo, coordenadas, precisão, planejamento; usar `atualizarPontoCompleto` + `validarEdicaoPonto`.
- [x] **1.3 Manter fluxos atuais** de resultado inline e vínculo posterior sem regressão.
- [x] **1.4 Teste:** mock Firestore ou teste puro de validação antes de write para contrato/protocolo errado.
- [ ] **1.5 Verificação:** build + fluxo manual criar → editar protocolo → editar ponto → conferir listas e mapa.

**Fora deste escopo:** alterar rodovia/concessionária do protocolo com pontos attached via migração em massa (futuro explícito).

---

## Escopo 2 — Transições, conclusão e histórico operacional

**Objetivo:** Matriz de transições explícita, conclusão com regras mínimas e histórico confiável via `gestaoMovimentos` (não auditoria de campo a campo).

**Critério de aceite (spec §9 Transições):**

- Transição inválida rejeitada com mensagem acionável.
- Correção e paralisação exigem observação (já parcialmente em `validarTransicao`).
- Conclusão só quando regras definidas forem atendidas (documentar regra mínima no código).
- Movimentação + update de protocolo permanecem atômicos.

**Files:**

- Modify: `src/services/gestaoContratos.ts` (`validarTransicao`, `registrarMovimento`)
- Create or modify: `src/services/gestaoTransicoes.ts` (matriz pura, se arquivo atual ficar grande)
- Modify: `src/views/GestaoProtocolos.tsx` (form de movimentação: mensagens, disable inválido)
- Modify: `firestore.rules` (alinhamento com combinações permitidas)
- Test: `src/services/gestaoContratos.test.ts` ou `gestaoTransicoes.test.ts`

**Tasks:**

- [x] **2.1 Documentar matriz** etapa × situação permitida (tabela no código + testes por combinação crítica).
- [x] **2.2 Expandir `validarTransicao`** para situações impossíveis (ex.: `concluido` + etapa anterior).
- [x] **2.3 Condições de conclusão:** ex. todos os pontos com `resultado` OU protocolo sem pontos; sem inventar SLA.
- [x] **2.4 UI:** preview da transição antes de salvar; listar histórico de movimentações com anexos clicáveis (já parcial — completar empty/error states).
- [x] **2.5 Revisar upload:** falha pós-upload não mostra sucesso; considerar ordem upload-after-commit ou rollback documentado.
- [x] **2.6 Teste:** transição inválida não chama `writeBatch` (mock).
- [ ] **2.7 Verificação:** registrar movimentação com anexo → histórico → tentar transição inválida.

**Fora deste escopo:** log de auditoria por campo alterado (Escopo futuro / outro domínio).

---

## Escopo 3 — Importação fortalecida

**Objetivo:** Completar evoluções da spec §3.7 sem Cloud Function (lotes grandes continuam limitados ao batch Firestore).

**Critério de aceite (spec §9 Importação):**

- Arquivo inválido falha antes da gravação (já parcial — completar mensagens e UI).
- Prévia mostra totais, duplicados, protocolos existentes vs novos.
- Reimportação não duplica pontos (teste automatizado).
- Grupo com erro não corrompe outros grupos (já parcial).

**Files:**

- Modify: `src/services/gestaoImportacao.ts`
- Modify: `src/views/GestaoProtocolos.tsx` (prévia e ações)
- Test: `src/services/gestaoImportacao.test.ts`

**Tasks:**

- [x] **3.1 Modo “Validar apenas”** — parse + prévia sem `importarProtocolosEPontos`; botão separado na UI.
- [x] **3.2 Enriquecer prévia:** contagem de duplicados no arquivo, pontos ignorados por código existente, badge “protocolo existente”.
- [x] **3.3 Exportar relatório de erros** — gerar XLSX/CSV com linha + erros (`xlsx`).
- [x] **3.4 Teste de reimportação** — duas execuções equivalentes; segunda importação 0 pontos novos (mock de pontos existentes).
- [x] **3.5 Documentar limite 499/500** na UI quando grupo exceder batch.
- [ ] **3.6 Verificação:** planilha com linhas inválidas + válidas; validar só; importar; reimportar.

**Fora deste escopo:** importação idempotente acima de 500 writes via Cloud Function; desfazer importação.

---

## Escopo 4 — Consulta, filtros, listagem e exportação

**Objetivo:** Alinhar UI ao que `filtrarGestao` já suporta; export operacional para planilhas.

**Critério de aceite (spec §3.8 / §9 Acompanhamento):**

- Filtros combinados coerentes entre dashboard, outlet e indicadores.
- Busca textual simples (título protocolo, código ponto).
- Export CSV/XLSX do recorte atual (protocolos + pontos ou abas separadas).

**Files:**

- Modify: `src/views/GestaoContratoDetalhe.tsx` (controles de filtro)
- Modify: `src/views/GestaoProtocolos.tsx`, `GestaoPontos.tsx` (busca/ordenação local)
- Modify: `src/services/gestaoContratos.ts` (`filtrarGestao` se faltar campo)
- Create: `src/services/gestaoExportacao.ts` (funções puras + download)
- Test: `src/services/gestaoExportacao.test.ts` (shape dos dados exportados)

**Tasks:**

- [x] **4.1 Filtros dashboard:** tipo de ponto, etapa, período (`inicio`/`fim` em previsão ou `realizadoEm` — definir uma regra e documentar).
- [x] **4.2 Sincronizar URL** — estender query params além de estado/concessionária/rodovia/status (preservar compatibilidade).
- [x] **4.3 Busca textual** — input nas listas de protocolos e pontos (filtro client-side sobre outlet).
- [x] **4.4 Ordenação** — por prazo, título, código (toggle simples, sem paginação server-side na v1).
- [x] **4.5 Exportar recorte** — botão na visão geral ou protocolos; usar `xlsx`.
- [x] **4.6 Teste:** `filtrarGestao` + export com mesmo filtro produz mesma contagem.
- [ ] **4.7 Verificação:** aplicar filtros → conferir gráficos/contagens → exportar → abrir planilha.

**Fora deste escopo:** paginação Firestore server-side; busca full-text indexada.

---

## Escopo 5 — Cadastro contratual completo (evolução do contrato)

**Objetivo:** Campos previstos na spec §2.1 além de `nome` e `clienteId` opcional.

**Critério de aceite:**

- Formulário criar/editar com campos acordados com negócio (subset mínimo primeiro).
- Listagem/detalhe exibem identificação útil (número + nome).
- Inativação ou situação impede novos protocolos (opcional v1: só campo `situacao` informativo).

**Files:**

- Modify: `src/services/gestaoContratos.ts` (tipo `Contrato`, create/update)
- Modify: `src/views/GestaoContratos.tsx`
- Modify: `src/views/GestaoContratoDetalhe.tsx` (cabeçalho)
- Modify: `firestore.rules` (campos opcionais novos)

**Tasks:**

- [x] **5.1 Definir subset v1 com produto** — sugerido: `numero`, `objeto`, `vigenciaInicio`, `vigenciaFim`, `situacao`, `observacoes`.
- [x] **5.2 Migrar documentos existentes** — defaults vazios; sem script obrigatório se campos opcionais.
- [x] **5.3 UI criar/editar contrato** — expandir modais; selector de cliente se já existir entidade no app.
- [ ] **5.4 Anexos contratuais (v2 dentro do escopo)** — Storage path `gestaoContratos/{id}/anexos/` + rules; lista no modal de edição.
- [ ] **5.5 Verificação:** criar contrato completo → abrir visão geral → editar.

**Fora deste escopo:** portal externo para cliente; assinatura digital.

---

## Escopo 6 — Qualidade, regras e validação autenticada

**Objetivo:** Fechar risco de produção e dívidas documentadas nos relatórios 27–30/10.

**Critério de aceite:**

- Gates CI locais passam.
- Roteiro manual autenticado executado e registrado (checklist markdown curto no relatório final).
- Regras Firestore publicadas junto de mudanças de modelo.

**Files:**

- Modify: `firestore.rules`, `storage.rules` (conforme escopos 2 e 5)
- Create: `docs/RELATORIO-IMPLEMENTACAO-GESTAO-CONTRATOS-2026-11-XX.md` (após entrega)

**Tasks:**

- [ ] **6.1 Roteiro manual (spec §11):**

```text
criar contrato → protocolo → protocolo com pontos → editar ponto → editar protocolo
→ movimentação com anexo → transição inválida (esperar erro) → importar → reimportar
→ filtros + export → excluir contrato de teste
```

- [ ] **6.2 Emulator ou staging autenticado** — validar cascade delete e rules de anexo; registrar bloqueio se ambiente indisponível.
- [x] **6.3 Gates:**

```bash
npm test -- --run
npm run build
npm run lint
git diff --check
```

(test/build OK; lint repo-wide com dívida pré-existente — ver relatório 03/11)

- [ ] **6.4 Deploy** — somente quando solicitado: `hosting` + `firestore:rules` (+ indexes se novos filtros exigirem).
- [x] **6.5 Atualizar spec §8** — marcar implementado vs pendente após conclusão dos escopos.

---

## Estimativa de esforço (referência)

| Escopo | Complexidade | Dependências |
|--------|--------------|--------------|
| 1 Edição UI | Média | — |
| 2 Transições | Média–alta | 1 (recomendado) |
| 3 Importação | Média | — |
| 4 Consulta/export | Média | — |
| 5 Contrato completo | Média | decisão de campos |
| 6 Qualidade | Baixa contínua | todos |

## Entregáveis por escopo

Cada escopo fechado deve produzir:

1. PR ou commit focado no módulo gestão + rules se aplicável.
2. Testes Vitest dos riscos listados no escopo.
3. Entrada curta no relatório de implementação (o que mudou, como validar).
4. Checkboxes deste plano atualizados.

## Self-review

- **Cobertura da spec:** escopos 1–2 fecham edição e transições (§8 items 1–3); 3 fecha importação (item 5); 4 fecha acompanhamento (items 6–7 parcial export/mapa já feito); 5 fecha contrato (item 2); 6 fecha validação §11.
- **Sem scope creep:** IA, redesign global e Cloud Function de import massiva ficam explícitos como fora.
- **Paralelismo:** equipe de 2 pode fazer (1+2) sequencial e (3+4) em paralelo; 5 quando produto definir campos.
