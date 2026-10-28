# Gestão de contratos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar o fluxo operacional de contratos, protocolos, pontos, movimentações, importação e acompanhamento sem incluir funcionalidades de IA.

**Architecture:** Reutilizar `src/services/gestaoContratos.ts`, `gestaoImportacao.ts` e `gestaoValidacao.ts`, mantendo Firestore como fonte de dados e a UI existente. Evoluir primeiro serviços e regras de negócio; depois conectar telas existentes, evitando abstrações novas e redesign amplo.

**Tech Stack:** React, TypeScript, Firebase Firestore, Firebase Storage, Vitest existente, XLSX já instalado.

**Spec:** `docs/superpowers/specs/2026-10-28-gestao-contratos-spec.md`

## Global Constraints

- Não implementar análise, treinamento, RAG, embeddings ou feedback de IA.
- Preservar IDs e vínculos de contrato, protocolo e ponto durante edições.
- Usar `writeBatch` ou transação quando a operação exigir atomicidade.
- Validar contrato, protocolo e ponto no escopo correto; não confiar apenas na UI.
- Não fazer redesign amplo; alterar UI somente para suportar o fluxo funcional.
- Priorizar inspeção da lógica e validação por build; adicionar testes apenas em fluxos críticos.

## Review Focus

- Editar ponto com `contratoId` ou `protocoloId` incorreto deve falhar sem alterar dados; teste crítico no serviço.
- Transição inválida de etapa/status deve ser rejeitada e não criar movimentação; teste crítico na matriz de transições.
- Falha em um ponto de criação conjunta não pode deixar protocolo parcial; teste existente deve ser preservado e ampliado apenas se necessário.
- Reimportar a mesma planilha não pode duplicar pontos; teste crítico de idempotência da importação.
- Upload de anexo seguido de falha na gravação não deve produzir sucesso silencioso; validação de código e regra de erro devem ser revisadas.

---

### Task 1: Mapear telas e contratos atuais

**Files:**
- Read: `src/services/gestaoContratos.ts`
- Read: `src/services/gestaoImportacao.ts`
- Read: `src/services/gestaoValidacao.ts`
- Read: `src/views/GestaoProtocolos.tsx`
- Read: `src/views/GestaoContratos.css`
- Read: `firestore.rules`

**Interfaces:**
- Consumes: serviços e componentes atuais.
- Produces: lista confirmada de handlers, campos e gaps reais para as tarefas seguintes.

- [ ] **Step 1: Localizar todos os usos dos serviços de gestão**

Usar busca por `criarContrato`, `criarProtocolo`, `criarPonto`, `registrarMovimento`, `importarProtocolosEPontos`, filtros e indicadores. Registrar no plano de execução os arquivos e handlers encontrados.

- [ ] **Step 2: Confirmar comandos disponíveis no `package.json`**

Identificar build, lint, teste e build de functions. Não criar novo script.

- [ ] **Step 3: Definir sequência de edição sem alterar código**

Ordem: contrato/protocolo/ponto → transições/auditoria → importação → indicadores/UI → regras → validação final.

---

### Task 2: Completar edição de contrato, protocolo e ponto

**Files:**
- Modify: `src/services/gestaoContratos.ts`
- Modify: `src/services/gestaoValidacao.ts`
- Modify: `src/views/GestaoContratos.tsx` ou tela equivalente encontrada na Task 1
- Modify: `src/views/GestaoProtocolos.tsx`
- Modify: `src/views/GestaoContratos.css` somente quando necessário
- Test: arquivo de teste existente de gestão, apenas para vínculos e validações críticas

**Interfaces:**
- Consumes: `Contrato`, `Protocolo`, `Ponto`, `PontoInput`, `ProtocoloInput`.
- Produces: `atualizarContrato`, `atualizarProtocolo`, `atualizarPontoCompleto` ou nomes compatíveis com padrão existente; handlers de edição preservando IDs.

- [ ] **Step 1: Adicionar atualização segura de contrato**

Implementar atualização dos campos existentes, validando nome e mantendo `id`, `createdAt` e vínculos. Não adicionar campos contratuais novos nesta tarefa sem uso efetivo na tela.

- [ ] **Step 2: Adicionar atualização segura de protocolo**

Permitir editar título, concessionária, rodovia, número e planejamento. Rejeitar contrato inexistente e impedir mudança que deixe pontos incompatíveis sem uma operação explícita de migração.

- [ ] **Step 3: Expandir atualização de ponto**

Permitir editar código, estado, km, tipo, coordenadas, precisão, resultado e planejamento. Revalidar o ponto completo contra o protocolo antes de gravar. Preservar `contratoId` e `protocoloId`.

- [ ] **Step 4: Conectar edição às telas existentes**

Adicionar modo editar ou modal usando componentes já existentes. Exibir erro e sucesso explícitos; não criar nova rota se a tela atual comportar o fluxo.

- [ ] **Step 5: Adicionar apenas teste crítico de vínculo**

Cobrir tentativa de atualização com contrato/protocolo incorreto e confirmar falha sem alteração. Reutilizar o padrão de mocks existente.

- [ ] **Step 6: Rodar verificação rápida**

Executar build e teste do arquivo crítico. Corrigir tipos antes de seguir.

---

### Task 3: Formalizar transições, histórico e conclusão

**Files:**
- Modify: `src/services/gestaoContratos.ts`
- Create or modify: arquivo de domínio de transições somente se o código atual não tiver local adequado
- Modify: `src/views/GestaoProtocolos.tsx`
- Modify: `firestore.rules`
- Test: teste existente de gestão, somente matriz crítica de transições

**Interfaces:**
- Consumes: `Etapa`, `Situacao`, `Movimento`, `registrarMovimento`.
- Produces: `validarTransicao(etapaAtual, statusAtual, etapaNova, statusNovo)`, histórico consistente e fluxo de conclusão.

- [ ] **Step 1: Definir matriz mínima de transições permitidas**

Permitir avanço normal de `planejamento` até `concluido`; permitir correção, análise, aguardando terceiros e paralisação como situações operacionais; rejeitar combinações impossíveis. Registrar regra em código, não espalhar condicionais pela UI.

- [ ] **Step 2: Aplicar validação antes do upload**

`registrarMovimento` deve validar protocolo, data, transição e observação obrigatória para correção/paralisação antes de enviar anexos.

- [ ] **Step 3: Exigir condições de conclusão**

Definir no código a condição mínima disponível: protocolo só conclui quando não houver regra de negócio pendente indicada pelos dados atuais. Se não houver fonte confiável para pendências, não inventar bloqueio; exigir apenas transição válida e observação.

- [ ] **Step 4: Persistir histórico operacional**

Usar `gestaoMovimentos` como histórico imutável. Atualização do protocolo e criação da movimentação continuam na mesma transação.

- [ ] **Step 5: Ajustar regras Firestore**

Garantir vínculo contrato/protocolo, campos obrigatórios, anexos e transições conforme os dados disponíveis nas regras.

- [ ] **Step 6: Adicionar teste crítico de transição inválida**

Confirmar que transição inválida falha antes de persistir movimentação.

- [ ] **Step 7: Validar build e diff**

Executar build, teste crítico e `git diff --check`.

---

### Task 4: Fortalecer importação e idempotência

**Files:**
- Modify: `src/services/gestaoImportacao.ts`
- Modify: `src/views/GestaoProtocolos.tsx` ou tela de importação encontrada na Task 1
- Modify: `src/services/gestaoValidacao.ts` somente para regras compartilhadas
- Test: `src/services/gestaoImportacao.test.ts`

**Interfaces:**
- Consumes: `parsePlanilha`, `agruparLinhasImportacao`, `ImportPreview`, `importarProtocolosEPontos`.
- Produces: validação de arquivo/cabeçalho, prévia completa, importação idempotente e resumo acionável.

- [ ] **Step 1: Validar entrada da planilha antes do parse**

Rejeitar arquivo vazio, sem primeira aba, sem cabeçalhos mínimos ou sem linhas úteis. Manter XLSX/CSV.

- [ ] **Step 2: Melhorar prévia**

Exibir total de linhas, grupos, pontos válidos, linhas inválidas, duplicados e indicação de protocolo existente. Não gravar durante a prévia.

- [ ] **Step 3: Tornar repetição segura**

Antes de criar cada ponto, consultar códigos existentes no protocolo e códigos repetidos no próprio arquivo. Manter erro por grupo sem comprometer grupos independentes.

- [ ] **Step 4: Tratar limites de batch sem falsa confirmação**

Preservar limites de 499 pontos para protocolo novo e 500 adicionais para existente. Exibir grupo rejeitado com motivo claro.

- [ ] **Step 5: Conectar confirmação e resumo na UI**

Exigir confirmação explícita e mostrar importados, ignorados, inválidos e erros por protocolo.

- [ ] **Step 6: Adicionar teste crítico de reimportação**

Executar duas importações equivalentes com mock de Firestore e confirmar que a segunda não cria pontos duplicados. Manter testes parser existentes; não criar cobertura para cada alias novo.

- [ ] **Step 7: Rodar teste focal e build**

Executar `npm test -- --run src/services/gestaoImportacao.test.ts` conforme sintaxe suportada pelo projeto e `npm run build`.

---

### Task 5: Fechar acompanhamento operacional

**Files:**
- Modify: `src/services/gestaoContratos.ts`
- Modify: `src/views/GestaoProtocolos.tsx`
- Modify: tela de contratos encontrada na Task 1
- Modify: `src/views/GestaoContratos.css` somente para layout funcional

**Interfaces:**
- Consumes: `filtrarGestao`, `indicadoresGestao`, `listMovimentos`, `pontoStatus`.
- Produces: filtros combinados, indicadores coerentes, detalhe operacional e exportação mínima se já houver padrão de export no projeto.

- [ ] **Step 1: Corrigir consulta do detalhe**

Mostrar contrato, protocolo, pontos, planejamento, etapa, situação, movimentações e anexos em uma única visão operacional.

- [ ] **Step 2: Aplicar filtros aos indicadores**

Calcular indicadores sobre o conjunto filtrado, não sobre todos os dados carregados. Preservar comportamento de protocolos sem pontos.

- [ ] **Step 3: Adicionar estados atrasado/paralisado/pêndencia somente com dados existentes**

Não inventar SLA. Atraso deve ser calculado apenas quando houver previsão vencida e ausência de `realizadoEm`.

- [ ] **Step 4: Melhorar busca e ordenação se a tela já suportar lista**

Adicionar busca textual e ordenação com lógica simples, sem nova biblioteca.

- [ ] **Step 5: Exportar somente se houver padrão instalado**

Reutilizar `xlsx` para exportação; não adicionar dependência. Se exportação não couber sem aumentar risco, deixar explicitamente para etapa posterior.

- [ ] **Step 6: Validar lógica por inspeção e build**

Não adicionar testes de UI nesta etapa. Conferir handlers, estados vazios, erros e acessibilidade básica durante revisão do código.

---

### Task 6: Revisar regras e validar fluxo real

**Files:**
- Modify: `firestore.rules`
- Modify: `storage.rules` se existir e for usado pelos anexos
- Modify: documentação da spec apenas se comportamento aprovado mudar

**Interfaces:**
- Consumes: contratos, protocolos, pontos, movimentações e anexos implementados nas tarefas anteriores.
- Produces: regras publicáveis e roteiro de validação autenticada.

- [ ] **Step 1: Revisar autorização por coleção**

Confirmar autenticação, vínculos entre IDs, campos obrigatórios, limites de anexos e impossibilidade de gravação cruzada entre contratos.

- [ ] **Step 2: Validar atomicidade e falhas**

Usar Emulator se disponível; caso contrário, revisar chamadas reais e registrar bloqueio de ambiente sem afirmar validação completa.

- [ ] **Step 3: Executar fluxo manual prioritário**

```text
criar contrato
→ criar protocolo
→ criar protocolo com pontos
→ editar ponto
→ registrar movimentação com anexo
→ alterar etapa/status
→ importar planilha
→ repetir importação
→ consultar filtros e indicadores
```

- [ ] **Step 4: Rodar gates mínimos**

```bash
npm test -- --run
npm run build
npm run lint
npm run functions:build
git diff --check
```

Se lint falhar somente por problemas preexistentes fora do escopo, registrar arquivos e não misturar correções não solicitadas.

- [ ] **Step 5: Revisar diff final**

Confirmar que nenhum código de IA foi alterado e que testes novos ficaram restritos aos riscos críticos.

---

## Self-review

- **Cobertura da spec:** cadastro/edição está na Task 2; transições/movimentações/auditoria na Task 3; importação na Task 4; acompanhamento na Task 5; segurança e validação na Task 6.
- **Testes:** mantidos somente para vínculo, transição, atomicidade existente e idempotência da importação, conforme pedido.
- **Dependências:** nenhuma dependência nova prevista; `xlsx` já existe.
- **Risco controlado:** funções novas devem seguir os tipos já usados e preservar IDs/vínculos.
- **Fora do escopo:** IA, redesign amplo e migração de infraestrutura não aparecem como tarefas.
