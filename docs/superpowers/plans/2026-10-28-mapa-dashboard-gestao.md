# Mapa e dashboard de gestão Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar dashboard unificado do contrato com mapa real gratuito, filtros, seleção de pontos e detalhes operacionais, mantendo o mapa esquemático existente como fallback.

**Architecture:** Usar Leaflet com tiles OpenStreetMap em componente reutilizável. O dashboard do contrato concentra filtros, indicadores, mapa e painel inferior; as telas de protocolo e ponto reutilizam o mesmo componente com escopo reduzido e seleção inicial via URL. Pontos sem coordenadas continuam visíveis em lista de pendências.

**Tech Stack:** React, TypeScript, Vite, React Router, Firebase/Firestore, Leaflet, OpenStreetMap.

**Spec:** `docs/superpowers/specs/2026-10-28-gestao-contratos-spec.md` e requisitos desta conversa.

## Global Constraints

- A entrega final deve incluir fluxo completo, não só componente isolado.
- Mapa gratuito na fase inicial: Leaflet + OpenStreetMap, com atribuição visível.
- Não usar Google Maps, chave paga, geocodificação ou rotas nesta fase.
- Não alterar IA.
- Preservar criação de protocolo com pontos juntos e criação posterior de pontos.
- Pontos sem coordenadas não podem desaparecer; devem aparecer como pendências.
- Filtros devem refletir mapa, lista, seleção e indicadores do mesmo recorte.
- Manter `GestaoMapa` existente como fallback ou adaptar sua rota sem quebrar acesso atual.
- Testes somente para lógica crítica; validar UI por build e fluxo manual.

## Review Focus

- Ponto sem latitude/longitude deve ficar fora do mapa, mas permanecer na lista de pendências.
- Seleção por URL com ponto/protocolo inexistente deve degradar sem crash e limpar seleção inválida.
- Filtros combinados não podem exibir marcador fora do recorte.
- Dois pontos próximos precisam continuar selecionáveis; usar agrupamento apenas se necessário, sem esconder seleção.
- Falha no carregamento de tiles ou ausência de coordenadas não pode impedir consulta dos dados e do andamento.

---

### Task 1: Preparar dependência e modelo visual do mapa

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/components/gestao/MapaLeaflet.tsx`
- Create: `src/components/gestao/MapaLeaflet.css`
- Create: `src/components/gestao/mapaUtils.ts`
- Test: `src/components/gestao/mapaUtils.test.ts` apenas para cores, coordenadas e bounds

**Interfaces:**
- Consumes: `Ponto`, `Protocolo`, `pontoStatus`.
- Produces: `MapaLeafletProps`, `getPontoColor(ponto, protocolo)`, `getMapPoints(pontos)`, `getMapBounds(points)`.

- [ ] **Step 1: Confirmar dependência disponível e instalar Leaflet**

Adicionar `leaflet` e `@types/leaflet` apenas se não existirem no lockfile. Não adicionar outra biblioteca de mapa.

- [ ] **Step 2: Definir tipos de mapa**

`MapaLeafletProps` deve aceitar pontos, protocolos, ponto selecionado, callback de seleção, altura opcional e `fitBoundsOnChange`. Ponto selecionado usa `Ponto | null`.

- [ ] **Step 3: Escrever teste de classificação visual**

Cobrir cores distintas para `paralisado`, `em_correcao`, `concluido`, `regularizado`, `aprovado_implantacao` e estado herdado do protocolo.

- [ ] **Step 4: Implementar utilitários**

`getMapPoints` filtra somente pontos com latitude e longitude finitas. `getMapBounds` retorna `null` para lista vazia e bounds para pontos válidos. `getPontoColor` aplica cores semânticas do módulo.

- [ ] **Step 5: Implementar mapa Leaflet**

Criar mapa, tile layer OpenStreetMap com atribuição, marcadores clicáveis, popup mínimo e ajuste automático de bounds. Não duplicar lógica de seleção no mapa.

- [ ] **Step 6: Verificar teste focal e build**

Executar teste de `mapaUtils` e `npm run build`. Corrigir imports, CSS de ícones e dimensionamento do container.

---

### Task 2: Dashboard unificado do contrato

**Files:**
- Modify: `src/views/GestaoContratoDetalhe.tsx`
- Modify: `src/views/GestaoContratos.css`
- Modify: `src/views/GestaoMapa.tsx` somente para extrair/reutilizar detalhes

**Interfaces:**
- Consumes: `MapaLeaflet`, `filtrarGestao`, `indicadoresGestao`, `GestaoContext`.
- Produces: visão geral com filtros, mapa principal, legenda, lista de atenção e painel inferior do ponto selecionado.

- [ ] **Step 1: Definir estado de seleção e filtros**

Adicionar estado `selectedPointId` na visão do contrato. O recorte filtrado deve alimentar mapa, indicadores, lista e painel.

- [ ] **Step 2: Inserir mapa na visão geral**

A visão geral do contrato deve mostrar mapa real antes/ao lado dos quick links, com todos os pontos geolocalizados do recorte.

- [ ] **Step 3: Implementar legenda e estados visuais**

Exibir cores para não iniciado, andamento, atenção/correção, paralisado, concluído, regularizado, aprovado e coordenada pendente.

- [ ] **Step 4: Implementar painel inferior selecionado**

Ao clicar marcador, mostrar código, contrato, protocolo, concessionária, rodovia, estado, km, tipo, resultado, etapa, status, previsão, realizado e links para protocolo/ponto. Se não houver ponto selecionado, mostrar orientação curta.

- [ ] **Step 5: Preservar pendências sem coordenadas**

Exibir lista abaixo do mapa com pontos sem coordenadas e ação existente para abrir/registrar localização.

- [ ] **Step 6: Aplicar acabamento premium sem redesign global**

Usar hierarquia visual existente, painel de mapa, cards compactos, espaçamento, contraste e responsividade. Não introduzir gradientes ou nova linguagem visual fora do módulo.

- [ ] **Step 7: Validar build e revisar acessibilidade**

Garantir botões de marcador com `aria-label`, foco visível, legenda textual e comportamento mobile.

---

### Task 3: Mapa filtrado por protocolo

**Files:**
- Modify: `src/views/GestaoProtocolos.tsx`
- Modify: `src/views/GestaoContratoDetalhe.tsx` apenas para links/contexto
- Modify: `src/views/GestaoContratos.css`

**Interfaces:**
- Consumes: `MapaLeaflet`, `GestaoContext`, `protocoloId` da rota.
- Produces: detalhe do protocolo com mapa contendo apenas seus pontos e seleção de ponto.

- [ ] **Step 1: Renderizar mapa no detalhe do protocolo**

Mostrar mapa real abaixo do resumo do protocolo, limitado aos pontos vinculados ao protocolo.

- [ ] **Step 2: Ajustar enquadramento aos pontos do protocolo**

Mapa usa bounds próprios do subconjunto; protocolo sem coordenadas mostra estado vazio e pontos pendentes.

- [ ] **Step 3: Conectar seleção ao painel existente**

Clicar ponto abre detalhes abaixo do mapa e mantém link para dados do protocolo/movimentações. Não duplicar histórico completo se já estiver na mesma tela; usar resumo e links.

- [ ] **Step 4: Verificar criação antes/depois**

Confirmar por inspeção de fluxo que pontos criados junto e pontos adicionados depois aparecem após `refresh` no mapa do protocolo.

- [ ] **Step 5: Rodar build**

Executar `npm run build`.

---

### Task 4: Mapa focado no ponto e navegação contextual

**Files:**
- Modify: `src/views/GestaoMapa.tsx`
- Modify: `src/views/GestaoPontos.tsx`
- Modify: `src/views/GestaoContratoDetalhe.tsx`
- Modify: rotas em `src/App.tsx` ou arquivo de rotas encontrado

**Interfaces:**
- Consumes: `contratoId`, `protocoloId`, `pontoId` via rota/query; `MapaLeaflet`.
- Produces: abertura de mapa focada no contrato/protocolo/ponto sem seleção inválida quebrar a tela.

- [ ] **Step 1: Definir URL de seleção**

Usar query `?ponto=:pontoId` para seleção inicial sem criar nova entidade de rota, mantendo `/gestao-contratos/:contratoId/mapa` e detalhe de protocolo.

- [ ] **Step 2: Ler ponto inicial e validar escopo**

Selecionar apenas ponto pertencente ao contrato e, quando aplicável, ao protocolo. ID ausente/inválido resulta em mapa sem seleção e mensagem neutra.

- [ ] **Step 3: Implementar foco de ponto**

Mapa recebe `selectedPointId`, centraliza/ajusta zoom no ponto e painel inferior mostra dados completos e andamento.

- [ ] **Step 4: Conectar links de ponto e protocolo**

Links em listas e painéis devem abrir mapa contextual: contrato abre mapa geral; protocolo abre mapa filtrado; ponto abre mapa com foco.

- [ ] **Step 5: Manter fallback esquemático**

Se Leaflet não carregar ou não houver coordenadas, preservar representação/lista atual e edição de coordenadas.

- [ ] **Step 6: Validar fluxo manual**

Executar: contrato → visão geral/mapa → filtro → ponto → protocolo → mapa filtrado → ponto → painel.

---

### Task 5: Filtros por concessionária, protocolo e ponto

**Files:**
- Modify: `src/views/GestaoContratoDetalhe.tsx`
- Modify: `src/views/GestaoProtocolos.tsx`
- Modify: `src/views/GestaoMapa.tsx`
- Modify: `src/services/gestaoContratos.ts` somente se filtro puro precisar extensão
- Test: teste existente de gestão apenas para recorte combinado crítico

**Interfaces:**
- Consumes: listas de contratos/protocolos/pontos e mapa selecionável.
- Produces: filtros sincronizados entre mapa, lista, contadores e painel.

- [ ] **Step 1: Adicionar filtro de protocolo**

Select de protocolo no dashboard do contrato, limitado aos protocolos do contrato.

- [ ] **Step 2: Adicionar filtro de ponto**

Busca por código do ponto, com seleção única e reset claro.

- [ ] **Step 3: Adicionar filtro de concessionária**

Select derivado dos dados atuais do contrato, sem catálogo paralelo.

- [ ] **Step 4: Recalcular mapa e indicadores**

Aplicar filtros antes de passar dados ao mapa e aos indicadores; marcador fora do recorte não permanece selecionado.

- [ ] **Step 5: Adicionar teste puro do recorte combinado**

Cobrir concessionária + protocolo + código de ponto e confirmar que somente ponto/protocolo esperados retornam.

- [ ] **Step 6: Validar build e teste focal**

Executar teste de gestão e `npm run build`.

---

### Task 6: Verificação visual e fechamento

**Files:**
- Modify: somente arquivos necessários após inspeção visual
- Read: `firestore.rules`, `src/services/gestaoContratos.ts`

**Interfaces:**
- Consumes: fluxo completo implementado.
- Produces: validação do usuário no navegador e registro de limitações.

- [ ] **Step 1: Rodar suíte e build**

```bash
npm test -- --run
npm run build
npm run lint
git diff --check
```

- [ ] **Step 2: Iniciar app local**

Usar `npm run dev` e validar com browser integrado, sem usar navegador externo.

- [ ] **Step 3: Executar fluxo real de UI**

Validar login/ambiente disponível, seleção de contrato, mapa geral, marcadores, filtros, painel, mapa de protocolo, foco de ponto, pendências sem coordenadas e responsividade.

- [ ] **Step 4: Confirmar tiles e atribuição**

Verificar carregamento de OpenStreetMap e atribuição visível. Se rede bloquear tiles, confirmar fallback e mensagem sem quebrar dados.

- [ ] **Step 5: Revisar diff final**

Confirmar que entrega inclui mapa em dashboard, protocolo e ponto; nenhum código de IA foi alterado; dependências ficaram limitadas ao mapa gratuito.
