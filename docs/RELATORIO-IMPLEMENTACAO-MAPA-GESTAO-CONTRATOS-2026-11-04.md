# Relatório de implementação — Mapa da Gestão de Contratos

**Data:** 04/11/2026
**Projeto:** 420-rerond
**Módulo:** Gestão de Contratos / Mapa operacional

## Objetivo

Melhorar apresentação e operação dos pontos geolocalizados, permitindo filtrar, selecionar e atualizar pontos diretamente no mapa, sem interromper o fluxo de trabalho.

## Entregas

### 1. Marcadores interativos

- Marcadores Leaflet clicáveis.
- Seleção por teclado com `Enter` e `Space`.
- Foco visual acessível.
- Marcador selecionado recebe destaque e o mapa centraliza nele.
- Popup contextual com código, estado, rodovia, quilômetro e situação.
- Preview do mapa na visão geral passou a aceitar cliques.
- Clique no preview abre o mapa completo com o ponto selecionado.

### 2. Filtros do mapa

Filtros adicionados na rota `/gestao-contratos/:contratoId/mapa`:

- busca por código, rodovia, quilômetro, estado e concessionária;
- estado;
- tipo: regularização ou nova implantação;
- situação operacional;
- limpeza dos filtros ativos.

Filtros ficam na URL para preservar o recorte em recarregamentos e compartilhamento. Leaflet recebe apenas pontos filtrados.

### 3. Resumo visual

Mapa exibe:

- quantidade de pontos no recorte;
- pontos localizados;
- pontos pendentes de coordenadas.

Layout dos filtros e resumo adaptado para desktop, tablet e celular.

### 4. Modal operacional do ponto

Ao clicar em ponto localizado, abre modal com:

- código;
- local;
- classificação;
- protocolo vinculado;
- situação atual;
- link para abrir protocolo;
- edição de localização recolhida.

A situação pode ser atualizada sem sair do mapa:

- regularização: ainda não concluído / regularizado;
- nova implantação: ainda não concluído / aprovado para implantação.

A atualização usa `atualizarPonto`, grava no Firestore e refresca os dados do mapa. Ao concluir, `realizadoEm` é preenchido automaticamente; ao desfazer conclusão, resultado e data são removidos.

### 5. Melhorias gerais de UX

- Modal com restauração de foco e navegação cíclica por `Tab`.
- Formulário de novo ponto reseta campos ao abrir e após salvar.
- Controles de zoom Leaflet receberam acabamento visual.
- Popup criado com DOM seguro usando `textContent`.
- Limite de upload Storage alinhado com a UI para aceitar exatamente 20 MB.

## Arquivos principais

- `src/views/GestaoMapa.tsx`
- `src/views/gestaoMapaHelpers.ts`
- `src/views/gestaoMapaHelpers.test.ts`
- `src/components/gestao/MapaLeaflet.tsx`
- `src/components/gestao/MapaLeaflet.css`
- `src/components/gestao/mapaUtils.ts`
- `src/components/gestao/mapaFilters.test.ts`
- `src/components/gestao/mapaPresentation.test.ts`
- `src/views/GestaoContratoDetalhe.tsx`
- `src/views/GestaoContratos.css`
- `src/components/gestao/ModalGestao.tsx`
- `src/services/gestaoContratos.ts`
- `src/views/GestaoPontos.tsx`
- `storage.rules`

## Validação

- Suíte completa: **150 testes passando** na última execução completa.
- Testes específicos mapa/modal: **28 testes passando** antes da preparação deste deploy.
- Build de produção: **passou**.
- ESLint dos arquivos do mapa/modal: **passou sem erros**.
- `git diff --check`: **passou**.

Avisos conhecidos do build permanecem fora deste escopo: CSS pré-existente e bundle acima de 500 kB.

## Limitação de validação manual

O browser local abriu a tela de login sem sessão autenticada. Portanto, o fluxo Firebase autenticado — clique real no marcador, gravação no Firestore e refresh do mapa — precisa ser conferido com usuário autorizado após o deploy.

## Deploy previsto

- Projeto Firebase: `rerond-c747b`
- Hosting: Firebase Hosting
- URL esperada: `https://rerond-c747b.web.app`
