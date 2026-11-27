# Relatório de implementação — Gestão, análise IA e onboarding de contrato

**Data:** 27/11/2026  
**Projeto:** 420-rerond  
**Branch:** `main`  
**Aplicação:** https://rerond-c747b.web.app  
**Firebase project:** `rerond-c747b`

## Resumo

Sessão focada em persistir o estado do overlay de análise IA ao navegar, polir o chip flutuante, permitir criar contrato já com protocolos/pontos por planilha, melhorar busca em Pontos e redesenhar o modal **Personalizar indicadores e rótulos** (largura, checkboxes e chips). Vários deploys de hosting ao longo do dia.

## Análise IA (overlay global)

- Correção: ao minimizar/ocultar, voltar à tela **Solicitações** não reabria mais o modal cheio para o mesmo job (`attachActiveJob` só reseta UI em job diferente).
- Estado **minimizado** elevado ao `AnaliseJobProvider` (controlado, não só local no componente).
- Preferências de UI (oculto / minimizado / chip fechado) em `sessionStorage` por `solicitacaoId:jobId`.
- Chip colapsado (estrela): ícone centralizado na bolinha de 44px.
- Botão **X** no chip expandido para ocultar o indicador sem abrir o modal.

## Novo contrato com importação opcional

- Modal **Novo contrato** com três modos:
  1. Apenas cadastro (padrão)
  2. Planilha completa (protocolos + pontos), mesmo fluxo da aba Protocolos
  3. Um protocolo inicial + planilha só de pontos (exige dados do protocolo antes de aplicar a planilha)
- Após criar com importação, redirecionamento para `/gestao-contratos/:id/protocolos` com mensagem de sucesso.
- Componentes reutilizáveis: `GestaoImportacaoPontosPlanilha`, `GestaoPontosRascunhoLista` (também no modal **Novo protocolo**).

## Pontos e protocolos

- Aba **Pontos**: campo de busca/locate fixo no cabeçalho do recorte; filtro `q` na URL.
- `GestaoProtocolos`: modal de novo protocolo refatorado para usar os componentes de importação de rascunho.

## UI — Personalizar indicadores e rótulos

- Modal compacto (`gestao-modal--dashboard-pref`, ~520px).
- Correção de layout: labels de checkbox não empilhavam mais em coluna por regra genérica do `.gestao-form`.
- **Status no gráfico**: linha em duas colunas (checkbox + nome | rótulo opcional).
- **Previsto x Realizado**: seleção em chips/pills.
- Etapas e legenda do mapa em linhas split (padrão | rótulo).
- Radios das opções de importação no novo contrato sem outline quadrado indesejado.

## Validação

- `npm test`: 202 testes aprovados (Vitest).
- `npm run build`: concluído com sucesso.
- Hosting publicado em `rerond-c747b`.

## Arquivos principais

- `src/context/AnaliseJobProvider.tsx`
- `src/components/AnaliseProgressOverlay.tsx` / `.css`
- `src/views/GestaoContratos.tsx` / `.css`
- `src/views/GestaoPontos.tsx`
- `src/views/GestaoProtocolos.tsx`
- `src/components/gestao/GestaoImportacaoPontosPlanilha.tsx`
- `src/components/gestao/GestaoPontosRascunhoLista.tsx`
- `src/components/gestao/GestaoDashboardPersonalizarModal.tsx`
- `src/components/gestao/ModalGestao.tsx` / `.css`

## Fora deste commit

- `erros-importacao-contratos.xlsx` (artefato local de importação, não versionado).