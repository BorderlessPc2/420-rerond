# Relatório de implementação — Gestão de contratos e UX

**Data:** 26/11/2026  
**Projeto:** 420-rerond  
**Branch:** `main`  
**Aplicação:** https://rerond-c747b.web.app  
**Firebase project:** `rerond-c747b`

## Resumo

Sessão focada em alinhar o deploy com o `main` (pós-merge do dashboard e status personalizados), permitir edição livre de rótulos de etapas e legenda do mapa, corrigir fluxo de anexos e movimentações, e eliminar quebras de layout no recorte operacional, no modal de personalização e no chip de análise IA em segundo plano. Regras Firestore/Storage e hosting foram republicados.

## Personalização de indicadores e rótulos

- `dashboardConfig` estendido com `rotulosEtapa` e `rotulosMapa`, sanitização e helpers `rotuloEtapaDashboard` / `rotuloLegendaMapaDashboard`.
- Modal **Personalizar indicadores e rótulos**: seções para renomear fases do fluxo e itens da legenda do mapa; rótulos de status no gráfico mantidos.
- Stepper de etapas, compositor de transição, filtros da visão geral, lista e detalhe de protocolos e mapa passam a respeitar os nomes salvos por contrato.
- Catálogo `mapaLegendaCatalog.ts` (cores alinhadas a `getPontoColor`, incluindo **Em análise** em roxo `#7656a8`).
- Componente `GestaoMapLegenda` reutilizado no mapa completo e no mapa do protocolo.

## Protocolos e movimentações

- `atualizarMovimento`: editar tipo, data, observação e anexar novos arquivos sem alterar etapa/situação (compatível com regras Firestore).
- Timeline do protocolo: ações **Editar** e **Excluir** movimentação.
- `gestaoAnexos.ts`: MIME correto no upload (`contentType`) e validação de extensões; `registrarMovimento` usa o mesmo utilitário.

## UI e design system (gestão)

- Filtros da visão geral: datas sem sobreposição (`min-width: 0`, grid do bloco Prazo e busca).
- Modal de personalização: checkboxes no padrão `gestao-checkbox-icon` (excluídos do estilo “campo de texto” do modal).
- Modal com scroll único (removido `overflow` interno do formulário de preferências).
- Aba **Visão geral**: removido `mask-image` da barra de navegação que gerava blur na borda esquerda da aba ativa.
- Chip **Análise em andamento** (modo ocultar): colapsado só com ícone; expansão para a esquerda no hover/foco.

## Infraestrutura

- `firestore.rules`: update de movimentação (campos permitidos) alinhado ao app.
- `storage.rules`: anexos de gestão (leitura/criação/exclusão conforme vínculo do protocolo).
- Hosting e regras publicados em `rerond-c747b` ao longo da sessão.

## Validação

- `npm test`: 202 testes aprovados (Vitest).
- `npm run build`: concluído com sucesso.

## Arquivos principais

- `src/services/gestaoDashboardConfig.ts`
- `src/components/gestao/GestaoDashboardPersonalizarModal.tsx`
- `src/views/GestaoProtocolos.tsx`
- `src/services/gestaoContratos.ts`
- `src/services/gestaoAnexos.ts`
- `src/components/gestao/GestaoMapLegenda.tsx`
- `src/components/gestao/mapaLegendaCatalog.ts`
- `src/views/GestaoContratos.css`
- `src/components/gestao/ModalGestao.css`
- `src/components/AnaliseProgressOverlay.tsx` / `.css`
- `firestore.rules`, `storage.rules`

## Fora deste commit

- `erros-importacao-contratos.xlsx` (artefato local de importação, não versionado).