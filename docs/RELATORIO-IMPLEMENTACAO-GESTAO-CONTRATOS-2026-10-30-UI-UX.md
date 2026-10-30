# Relatório de Implementação — Gestão de Contratos UI/UX

**Data:** 30/10/2026  
**Projeto:** Gestão de Contratos e Protocolos  
**Escopo:** somente módulo Gestão de Contratos

## 1. Objetivo

Melhorar a experiência visual e operacional da Gestão de Contratos, com foco em leitura rápida do dashboard, navegação casual, acessibilidade, modais, responsividade e feedback das ações.

## 2. Melhorias implementadas

### Dashboard da visão geral

- Filtro por estado sincronizado com a URL usando `?estado=`.
- Filtro preservado ao recarregar ou compartilhar a URL.
- Botão para limpar filtro ativo.
- Contagem filtrada anunciada com `aria-live`.
- Remoção do bloco redundante de resumo filtrado.
- Estados vazios para gráficos sem protocolos ou pontos.
- Labels acessíveis para distribuição de status e conclusão operacional.
- Donut corrigido para manter o centro visual em diferentes tamanhos.
- Hierarquia visual simplificada entre saúde operacional, gráficos, atenção e mapa.

### Modais

- Foco inicial no primeiro controle útil do formulário.
- Foco configurável para botão de fechar quando necessário.
- `aria-describedby` para descrições dos modais.
- Rolagem interna com `overscroll-behavior: contain`.
- Mantido fechamento por Escape e clique no backdrop.
- Mantida confirmação antes de excluir contrato.

### Listas e menus

- Menu de ações do contrato fecha com Escape.
- Menu fecha ao clicar fora.
- Adicionado `aria-controls` ao botão do menu.
- Loading de contratos anunciado para tecnologias assistivas.
- Títulos longos limitados sem causar overflow horizontal.
- Melhor separação visual dos conteúdos em telas menores.

### Texto e datas

- Criados helpers locais para textos de status e etapas.
- Removida exibição direta de underscores em status.
- Datas exibidas com `Intl.DateTimeFormat('pt-BR')`.
- Tratamento seguro para datas vazias ou inválidas.

### CSS e motion

- Consolidado comportamento de `prefers-reduced-motion`.
- Mantidas transições explícitas, sem `transition: all`.
- Melhorias de responsividade para dashboard e listas.
- Ajustes de overflow e wrapping para títulos e conteúdo extenso.

## 3. Arquivos alterados

- `src/components/gestao/ModalGestao.tsx`
- `src/components/gestao/ModalGestao.css`
- `src/views/GestaoContratoDetalhe.tsx`
- `src/views/GestaoContratos.tsx`
- `src/views/GestaoContratos.css`
- `src/views/GestaoProtocolos.tsx`
- `src/views/gestaoUi.ts`
- `src/views/gestaoUi.test.ts`

Nenhum outro módulo funcional do projeto foi alterado nesta etapa.

## 4. Verificação

- Suíte completa: **31 arquivos de teste aprovados**.
- Total: **124 testes aprovados**.
- Build Vite/TypeScript: **aprovado**.
- `git diff --check`: **aprovado**.
- Regras Firestore: compiladas e publicadas.
- Índices Firestore: publicados para o banco `(default)`.
- Firebase Hosting: publicado com sucesso.

## 5. Deploy

**Projeto Firebase:** `rerond-c747b`  
**Banco:** `(default)`  
**Edição:** Firestore Standard  
**Localização:** `southamerica-east1`

**Hosting:** https://rerond-c747b.web.app

Deploy executado com:

```bash
npx firebase deploy --only hosting,firestore:rules,firestore:indexes --project rerond-c747b
```

Resultado:

- Hosting liberado.
- Rules liberadas.
- Indexes publicados.

## 6. Avisos existentes

O build continua emitindo dois avisos de CSS legado e aviso de bundle JavaScript acima de 500 kB. Esses avisos não impediram build ou deploy e não pertencem ao escopo visual de Gestão de Contratos.

## 7. Commit

```text
ccc3992 feat: aprimorar UX da gestao de contratos
```

Push realizado para `origin/main`.
