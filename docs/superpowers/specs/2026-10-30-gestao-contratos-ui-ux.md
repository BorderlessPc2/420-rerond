# Spec — Auditoria e evolução UI/UX da Gestão de Contratos

## Escopo

Melhorar somente o módulo Gestão de Contratos: lista de contratos, visão geral, protocolos, pontos, planejamento, mapa, detalhes de protocolo e modais `ModalGestao`. Não alterar Dashboard global, autenticação, solicitações, IA ou outros módulos.

## Problemas encontrados

1. **Visão geral com excesso de blocos concorrentes** — introdução, gráficos, resumo filtrado, saúde, atenção, mapa e quick links repetem contexto e empurram decisões para baixo.
2. **Filtro de estado não é profundo-linkável** — estado vive apenas em `useState`; recarregar ou compartilhar URL perde o recorte.
3. **Gráficos sem estado vazio ou leitura assistiva** — barras e donut dependem só de cor/forma; ausência de dados gera área silenciosa.
4. **Status exibido em chave técnica** — `em_correcao` e similares aparecem com underscore e sem hierarquia de nomenclatura amigável.
5. **Dashboard usa dois resumos de contagem** — o bloco “Resumo filtrado” repete informação já presente no cabeçalho e cards.
6. **Erros e sucessos têm feedback inconsistente** — erros usam `role=alert`, mas carregamento/sucesso em várias telas não usa `aria-live`; ações individuais não mostram estado de salvamento.
7. **Modais têm proteção incompleta para conteúdo longo** — falta declarar contenção de overscroll; foco inicial vai sempre para fechar, não para primeira ação/campo.
8. **Formulários densos** — novo ponto e novo protocolo concentram muitos campos sem agrupamento visual, ajuda contextual ou footer fixo de ação.
9. **Lista de pontos mistura dado, edição e navegação** — selects e links competem na mesma linha; em telas pequenas a leitura fica fragmentada.
10. **Lista de contratos não fecha menu aberto por interação externa** — menu pode permanecer aberto ao navegar foco/clicar fora; falta `aria-controls` e fechamento por Escape/foco externo.
11. **Datas são formatadas manualmente** — detalhes exibem `split('-').reverse()`, frágil para locale e consistência.
12. **CSS tem regras duplicadas e donut com posicionamento frágil** — duas media queries de reduced-motion repetidas; pseudo-elemento do donut não possui posicionamento explícito.
13. **Títulos longos podem competir com ações** — cabeçalhos/listas usam flex/grid, mas não definem truncamento controlado para nomes longos.
14. **Acessibilidade de controles** — alguns inputs de ponto usam labels visuais adequados, mas campos de formulários e gráficos precisam nomes/descrições mais explícitos; links externos/ícones devem manter texto acessível.

## Objetivo

Fazer Gestão de Contratos parecer um painel operacional premium, calmo e rápido: usuário entende situação em poucos segundos, encontra próxima ação sem rolar excessivamente, mantém recortes ao navegar e recebe confirmação clara após qualquer operação.

## Mudanças aprovadas para implementação

### 1. Visão geral

- Consolidar cabeçalho + filtro de estado em uma barra única.
- Remover bloco redundante “Resumo filtrado”.
- Manter sequência: cabeçalho/filtro → saúde operacional → indicadores visuais → atenção → mapa compacto → quick links/pendências.
- Adicionar estados vazios explícitos para gráficos e mapa.
- Usar `text-wrap: balance` em títulos principais e `min-inline-size: 0` nos blocos flexíveis.

### 2. Filtro

- Sincronizar estado selecionado com query param `?estado=` usando APIs atuais do React Router.
- Preservar filtro ao recarregar e compartilhar URL.
- Botão “Limpar filtro” aparece somente quando filtro ativo.
- Atualizar `aria-live="polite"` com quantidade filtrada.

### 3. Gráficos

- Manter SVG/CSS nativo, sem dependência nova.
- Barras com `role="img"`, `aria-label` descritivo e tabela/resumo textual acessível.
- Donut com `aria-label`, texto percentual e estado vazio.
- Cores não podem ser único sinal; manter labels, números e status.
- Animar apenas `transform`, `opacity` e tamanho controlado; preservar `prefers-reduced-motion`.

### 4. Linguagem e estados

- Criar helper local de nome amigável para status/etapa dentro do módulo.
- Nunca mostrar underscore em textos de usuário.
- Padronizar loading, sucesso e erro com `aria-live`.
- Mensagens de erro incluem próxima ação quando possível.

### 5. Modais e formulários

- `ModalGestao` ganha `overscroll-behavior: contain`, foco inicial no primeiro campo/foco configurável e `aria-describedby` quando descrição existir.
- Footer de formulário consistente, com ação primária e cancelar.
- Agrupar campos de novo ponto/protocolo em seções visuais sem alterar regras de negócio.
- Não bloquear colagem, manter labels e names existentes.

### 6. Listas e interação

- Menu de contrato fecha em Escape e ao clicar fora; adicionar `aria-controls`.
- Separar visualmente metadados, status e ações de pontos.
- Garantir layout mobile sem overflow horizontal.
- Adicionar feedback de salvamento para atualização de resultado/vínculo.
- Manter confirmação antes de exclusão.

### 7. Datas e CSS

- Usar `Intl.DateTimeFormat('pt-BR')` para datas apresentadas.
- Remover duplicidade de reduced-motion.
- Corrigir posicionamento do pseudo-elemento do donut.
- Adicionar truncamento/line clamp apenas onde necessário, sem esconder dados essenciais.

## Não fazer

- Não mexer em módulos fora de Gestão de Contratos.
- Não alterar modelo de dados, regras de negócio, status internos ou importação da planilha.
- Não adicionar biblioteca de gráficos.
- Não criar dados fictícios.
- Não refazer mapa Leaflet.
- Não transformar planejamento em módulo de atividades nesta etapa.

## Critérios de aceitação

- Desktop e viewport mobile sem overflow horizontal.
- Filtro `estado` sobrevive a reload por query param.
- Gráficos continuam corretos com todos os estados, um estado, nenhum ponto e nenhum protocolo.
- Modal longo mantém rolagem interna e foco acessível.
- Exclusão continua exigindo confirmação.
- Todos os textos exibidos ao usuário usam nomenclatura amigável.
- Apenas arquivos do módulo Gestão de Contratos são alterados, além desta spec.
- Testes, build e deploy Hosting passam.

## Decisões do implementador

- Usar `useSearchParams`, já presente no projeto, em vez de nova biblioteca.
- Preferir `aria-describedby` e foco nativo a abstração de focus-trap; `<dialog>` nativo já mantém modalidade.
- Manter componentes existentes e fazer menor diff possível.
- Usar `Intl.DateTimeFormat` com fallback de texto original quando data inválida.

## Verificação

```bash
npm test -- --run
npm run build
git diff --check
npx firebase deploy --only hosting --project rerond-c747b
```

Revisão visual: abrir `https://rerond-c747b.web.app`, entrar em Gestão de Contratos, testar visão geral, filtro, lista de pontos, novo protocolo, novo ponto, detalhe de protocolo, planejamento e confirmação de exclusão em desktop/mobile.

## Aprovação

A implementação começa somente após aprovação explícita desta spec.
