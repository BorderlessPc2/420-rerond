# Relatório de implementação — Gestão de Contratos

**Data:** 11/11/2026  
**Projeto:** 420-rerond  
**Branch:** `fix/avaliacao-ia-cliente`  
**Aplicação:** https://rerond-c747b.web.app

## Resumo

Foram melhorados filtros operacionais, atualização em tempo real, responsividade da visão geral, carregamentos do módulo e interação da ficha de ponto no mapa.

## Implementações

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

## Arquivos principais

- `src/components/gestao/GestaoLoadingSkeleton.tsx`
- `src/services/gestaoDashboard.ts`
- `src/services/gestaoDashboard.test.ts`
- `src/views/GestaoContratoDetalhe.tsx`
- `src/views/GestaoContratos.tsx`
- `src/views/GestaoContratos.css`
- `src/views/GestaoMapa.tsx`
- `src/views/GestaoPlanejamento.tsx`
- `src/views/GestaoPontos.tsx`
- `src/views/GestaoProtocolos.tsx`
- `src/views/gestaoMapaHelpers.ts`
- `src/views/gestaoMapaHelpers.test.ts`

## Validação

- `npm test`: 38 arquivos e 164 testes aprovados.
- `npm run build`: passou.
- Fluxo real validado no navegador: seleção de ponto adiciona `?ponto=...`; botão **Fechar** remove o parâmetro e fecha a ficha.
- Build mantém warnings preexistentes: regra CSS inválida em outro trecho e bundle principal acima de 500 kB.
- Lint específico não teve erros; permanece um warning preexistente de dependência em `GestaoProtocolos.tsx`.

## Git e deploy

| Item | Resultado |
|---|---|
| Commit filtros e realtime | `9e1820e` |
| Push | Concluído para `origin/fix/avaliacao-ia-cliente` |
| Firebase project | `rerond-c747b` |
| Hosting | Publicado antes desta última melhoria |
| URL | https://rerond-c747b.web.app |

## Pendência

Novo deploy do Firebase Hosting depende de solicitação explícita. O último Hosting publicado permanece em https://rerond-c747b.web.app.
