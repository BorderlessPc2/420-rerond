# Relatório de implementação — Gestão de Contratos

**Data:** 11/11/2026  
**Projeto:** 420-rerond  
**Branches:** `fix/avaliacao-ia-cliente`, `feat/dashboard-status-expand`  
**Aplicação:** https://rerond-c747b.web.app

## Resumo

No início do dia foram melhorados filtros operacionais, atualização em tempo real, responsividade da visão geral, carregamentos do módulo e a ficha de ponto no mapa. Na sequência, a faixa do mapa passou a manter o texto legível no hover/foco, e o gráfico **Status dos protocolos** passou a abrir os pontos de cada status, com navegação até o painel do ponto e contenção de overflow.

## Implementações da manhã (`fix/avaliacao-ia-cliente`)

### Filtros operacionais e atualização em tempo real

- Estado, concessionária e rodovia usam dados carregados do contrato.
- Concessionária e rodovia agora incluem valores existentes somente em protocolos, mesmo sem ponto vinculado.
- Contrato, protocolos e pontos usam listeners Firestore (`onSnapshot`). Alterações feitas por outra aba ou outro usuário atualizam a tela sem recarregamento manual.
- Dashboard, mapa, listas e exportação recebem os dados atualizados pelo mesmo estado do contrato.
- Campo de busca da visão geral usa debounce de 250 ms para evitar atualização da URL a cada tecla.

### Responsividade e navegação

- Filtros da visão geral passam para duas colunas antes de comprimirem; em telas pequenas usam uma coluna.
- Navegação entre abas ganhou rolagem horizontal contida, scrollbar discreta e fade nas bordas para indicar conteúdo adicional.
- Ajustes preservam controles acessíveis e evitam overflow visual em largura reduzida.

### Skeletons de carregamento

Criado componente reutilizável `GestaoLoadingSkeleton` com variantes para:

- Lista de contratos;
- Detalhe do contrato e visão geral;
- Lista de protocolos;
- Detalhe de protocolo;
- Lista de pontos;
- Planejamento;
- Mapa operacional.

Skeleton aparece durante carregamento inicial. Atualizações em tempo real mantêm conteúdo existente para evitar piscadas.

### Ficha de ponto no mapa

- Adicionado botão **Fechar** na ficha do ponto selecionado.
- Fechamento remove somente o parâmetro `ponto` da URL, preservando filtros ativos.
- Mapa retorna para enquadramento geral.
- Tecla `Escape` fecha a ficha quando foco não está em um campo ou botão.
- Adicionado teste de regressão para preservação dos filtros ao fechar.

## Implementações desta sessão (`feat/dashboard-status-expand`)

### Contraste da faixa de pontos no mapa

O hover global dos botões da gestão pintava o cartão da faixa (`DEMO-ECO-006`, etc.) de azul escuro. O endereço do ponto ficava ilegível.

- Hover, foco e seleção da faixa usam fundo claro e texto escuro.
- A seleção mantém o anel amarelo (`--color-accent-500`).
- O botão primário do restante do módulo não muda.

### Status dos protocolos expansível

No gráfico da visão geral, cada tag de status (ex.: **Em correção**) abre e fecha com chevron.

- Vários status podem ficar abertos ao mesmo tempo.
- A lista mostra código do ponto, rodovia e km.
- Clique no ponto abre a aba **Pontos** com `?ponto=` e o painel de edição.
- Listas longas entram 8 pontos por vez, com **Carregar mais**.
- Protocolos sem ponto vinculado mostram estado vazio, sem inventar linha.

### Contenção de eventos e overflow

- Clique, pointer e scroll da lista ficam no módulo; não vazam para o mapa abaixo.
- Painel fechado fica `inert` (sem tab nem clique em links escondidos).
- Lista aberta tem teto de 220px e rolagem interna (`overscroll-behavior: contain`).
- `Escape` fecha o status em foco.
- O `translateY` global do botão foi desligado nesse controle para o card não tremer nem cortar o conteúdo.

## Arquivos principais

### Manhã (já em `main` via PR)

- `src/components/gestao/GestaoLoadingSkeleton.tsx`
- `src/services/gestaoDashboard.ts`
- `src/views/GestaoContratoDetalhe.tsx`
- `src/views/GestaoContratos.tsx`
- `src/views/GestaoContratos.css`
- `src/views/GestaoMapa.tsx`
- `src/views/GestaoPlanejamento.tsx`
- `src/views/GestaoPontos.tsx`
- `src/views/GestaoProtocolos.tsx`
- `src/views/gestaoMapaHelpers.ts`
- `src/views/gestaoMapaHelpers.test.ts`

### Tarde (esta entrega)

- `src/components/gestao/GestaoDashboardCharts.tsx`
- `src/components/gestao/GestaoDashboardCharts.css`
- `src/services/gestaoDashboard.ts`
- `src/services/gestaoDashboard.test.ts`
- `src/views/GestaoContratos.css`
- `src/views/GestaoPontos.tsx`
- `docs/RELATORIO-IMPLEMENTACAO-2026-11-11.md`

## Validação

- Testes de `gestaoDashboard`: agrupamento de pontos por status do protocolo e fatiamento da lista (**Carregar mais**).
- Contraste da faixa conferido no browser (hover claro, texto `#14233d`).
- Accordion conferido no browser: abre no fluxo, empurra o bloco de baixo, **Carregar mais** visível, lista com teto.
- `npm run build` e deploy de Hosting desta sessão: ver tabela Git e deploy.

## Git e deploy

| Item | Resultado |
|------|-----------|
| PR paralelo da manhã | Merge em `main` (`a798f0e`, PR #4) |
| Contraste da faixa | `c6ee76f` — fix: manter texto visivel nos cartoes da faixa do mapa |
| Expandir status + contenção | (commit desta entrega) |
| Branch | `feat/dashboard-status-expand` |
| Firebase project | `rerond-c747b` |
| Hosting | A publicar nesta sessão |
| URL | https://rerond-c747b.web.app |

## Pendências

- Abrir PR de `feat/dashboard-status-expand` para `main` após o Hosting.
- Warnings preexistentes do build: CSS inválido em outro trecho e bundle principal acima de 500 kB.
- Validar no contrato demo autenticado: abrir **Em correção**, clicar num ponto e salvar no painel.
