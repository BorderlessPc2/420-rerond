# Relatório de Implementação — Gestão de Contratos (massa demo + correções de apresentação)

**Data:** 06/11/2026
**Projeto:** 420-rerond — módulo Gestão de Contratos

## 1. Objetivo

Permitir a validação visual e funcional do fluxo completo do módulo (todas as etapas × situações) em produção, e corrigir os desvios de apresentação encontrados na sessão de debug dirigida.

## 2. Massa de demonstração (seed)

Novo script `scripts/seedGestaoContratos.ts` (npm `seed:gestao-demo`), no padrão do `seedConcessionarias` (firebase-admin):

- **1 contrato demo** (`demo-matriz-fases`, "CONTRATO TESTE — Matriz de Fases (DEMO)") — tudo fica contido nele; nenhum dado real é tocado.
- **12 protocolos** cobrindo as 6 etapas e as 8 situações, nas 3 concessionárias reais (Ecovias, Motiva, Arteris).
- **16 pontos:** com/sem coordenadas, regularização × nova implantação, com/sem resultado operacional, 2 avulsos sem protocolo, previsões passadas (alimentam "em atraso") e futuras.
- **19 movimentações** encadeadas com datas e autor `seed-demo`, populando timeline e stepper.
- **Idempotente:** reexecutar limpa e recria apenas o demo; `--cleanup` remove sem recriar. Tipos de movimentação gravados como texto legível ("Avanço de etapa", "Paralisação", …), pois a timeline exibe o campo livre.

Requer `firebase-service-account.json` na raiz (ou `GOOGLE_APPLICATION_CREDENTIALS`).

## 3. Sessão de debug dirigida (produção)

Percorridos com a massa demo: lista de contratos, visão geral/dashboard, lista de protocolos, detalhe (stepper, mapa vinculado, timeline), composer de movimentação (chips de intenção, De/Para, conclusão permitida e bloqueada), lista de pontos, mapa completo (faixa, filtros, ficha, popup) e planejamento.

**Funcionando conforme esperado:** matriz completa visível, contagens do dashboard consistentes (38% = 6/16), stepper e De/Para corretos, bloqueio de conclusão com ponto sem resultado, filtros do mapa (situação=regularizado → exatamente os 4 corretos), 13 localizados / 3 pendentes, URL preservando `?ponto=`.

**Desvios encontrados e corrigidos** (seção 4).

## 4. Correções aplicadas

| # | Problema | Correção |
|---|----------|----------|
| 1 | Stepper com nós empacotados à esquerda e barra desalinhada dos marcadores | Nós com `flex: 1` (distribuição uniforme); preenchimento da barra aponta ao centro do marcador da etapa atual (`(índice + 0.5) / total`) — `GestaoEtapaStepper.tsx`, `GestaoContratos.css` |
| 2 | Rótulos sem acento em todo o módulo ("Em correcao", "Homologacao", "Aprovado implantacao") | Mapa explícito de rótulos pt-BR em `nomeGestao` (`gestaoUi.ts`), com fallback ao comportamento anterior; teste `gestaoUi.test.ts` atualizado (codificava o erro) |
| 3 | Bloqueio de conclusão exibia mensagem duplicada | Composer mostra mensagem única com link "Ver pontos vinculados" (`GestaoTransicaoComposer.tsx`) |
| 4 | "1 pontos" / "1 paralisados" | Pluralização em `GestaoProtocolos.tsx` e `GestaoContratoDetalhe.tsx` |
| 5 | Timeline repetia etapa após o diff ("Transição Fase 1 → Fase 2 Fase 2") | Linha de autor omite a etapa quando ela já está no diff |
| 6 | Popup do Leaflet concatenando campos ("DEMO-ECO-006SP · km 55,3Regularizado") | `display: grid` no wrapper interno do popup (`MapaLeaflet.css`) |
| 7 | Objeto do contrato duplicado no cabeçalho do detalhe | `resumoContratoGestao` ganhou opção `incluirObjeto`; detalhe passa `false` |
| 8 | Status minúsculo sem capitalizar na lista "Para acompanhar" | Uso de `nomeGestao` em `GestaoContratoDetalhe.tsx` |
| 9 | "· protocolo" exibido em pontos avulsos (sem protocolo) | Sufixo só quando há protocolo vinculado (`GestaoPontos.tsx`) |
| 10 | Card "Próxima entrega" com data duplicada quando o rótulo já é a data | Data secundária só aparece em rótulos relativos ("Em 4 dias", "em atraso") |

## 5. Gates

| Comando | Resultado |
|---------|-----------|
| `npm test -- --run` | **155 testes**, 37 arquivos — OK |
| `npm run build` | OK (avisos pré-existentes: CSS e chunk > 500 kB) |
| ESLint arquivos do ciclo | 0 erros (2 warnings pré-existentes de `exhaustive-deps`) |

Verificação visual pós-deploy em produção: stepper alinhado e acentuado, cabeçalho sem duplicação. Validação em localhost não foi possível (sessão Firebase é por origem e exigiria novo login).

## 6. Deploys

| Entrega | Destino |
|---------|---------|
| Correções de apresentação (itens 1–9) | Firebase Hosting `rerond-c747b` |
| Ajuste do card "Próxima entrega" (item 10) | Firebase Hosting `rerond-c747b` |

App: https://rerond-c747b.web.app — contrato demo em `/gestao-contratos` (buscar "DEMO").

## 7. Pendências conscientes

- **Re-rodar `npm run seed:gestao-demo`** para substituir os tipos antigos ("avanco") da timeline pelos rótulos legíveis.
- Lint global do repositório segue como dívida anterior ao módulo gestão.
