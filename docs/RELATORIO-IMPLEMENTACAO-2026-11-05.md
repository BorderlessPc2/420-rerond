# Relatório de implementação — mapa e relatório

**Data:** 05/11/2026  
**Projeto:** 420-rerond  
**App:** https://rerond-c747b.web.app

## Objetivo

Deixar o mapa da Gestão de Contratos percorrível sem depender de acertar o pino, e deixar a área de relatório de conformidade legível: leitura de um lado, arquivo do outro, com o PDF já gerado disponível para baixar.

## 1. Mapa operacional

A ficha do ponto deixou de ser um modal que cobria o mapa. Ela abre sobre o canto superior direito. O recorte dos filtros acompanha as abas do contrato. A frase sob a navegação explica o papel de Protocolos, Pontos e Mapa.

- Pinos com código, maior área de clique e afastamento quando dois pontos caem na mesma coordenada.
- O anel vazio continua indicando coordenada aproximada.
- A roda do mouse só amplia depois de um clique no mapa, para a página continuar rolando.
- Ao selecionar um ponto, o mapa aproxima e desloca o pino para fora da ficha. **Ver todos** enquadra o recorte.
- Faixa horizontal lista os pontos do filtro na ordem do código. **Anterior** e **Próximo**, ou as setas do teclado, percorrem essa lista. Ponto sem coordenada aparece como **sem mapa**.
- Enquanto o contrato ou o mapa carrega, a tela mostra skeleton. A ficha entra com um deslocamento curto. Durante o salvamento, a ficha vira skeleton. Com redução de movimento ativa no sistema, essas animações ficam desligadas.

## 2. Área de relatório

Aberta em Solicitações por **Ver Relatório**.

- A barra separa **Ler** e **Capa e dados** de **Logotipo**, **Gerar nova versão** e **Baixar**. Ela acompanha a rolagem.
- **Baixar vN** usa o PDF mais recente do histórico. Antes o botão só funcionava depois de gerar outro arquivo na mesma visita.
- As verificações abrem em **Pendências**, com atalho para conformes e para a lista inteira.
- Documentos, casos de ensino e a avaliação interna foram para **Como esta análise foi montada**.
- A mensagem que dizia que o arquivo já tinha sido baixado, com título fixo, foi removida. O aviso confirma a versão e o nome do arquivo gerado.
- O texto do topo deixa claro que a edição muda a apresentação deste relatório e não entra no aprendizado da IA.

## 3. Documentação anterior

O relatório de 03/11 foi atualizado com o resultado do emulador (27 operações autenticadas), os commits `b38b5a7` e `90527a2`, o push e o deploy daquela tarde. Essa atualização ainda não estava no Git e entra neste commit.

## Arquivos

- `src/components/gestao/MapaLeaflet.tsx`
- `src/components/gestao/MapaLeaflet.css`
- `src/components/gestao/mapaUtils.ts`
- `src/components/gestao/mapaUtils.test.ts`
- `src/views/GestaoMapa.tsx`
- `src/views/GestaoContratoDetalhe.tsx`
- `src/views/GestaoContratos.css`
- `src/views/GestaoProtocolos.tsx`
- `src/components/RelatorioConformidadeView.tsx`
- `src/components/RelatorioConformidadeView.css`
- `src/components/RelatorioViewer.tsx`
- `src/components/RelatorioViewer.css`
- `docs/RELATORIO-IMPLEMENTACAO-GESTAO-CONTRATOS-2026-11-03.md`

## Validação

- Testes do mapa (`mapaUtils`, `mapaFilters`, `mapaPresentation`): **8 passando**.
- `npx tsc -b`: **passou** antes deste commit.
- O browser desta sessão abriu `/login` sem sessão. O fluxo autenticado do mapa e do relatório precisa ser conferido com usuário autorizado.
- Não entram neste commit: `.superpowers/`, `docs/RELATORIO-IMPLEMENTACAO-GESTAO-CONTRATOS-2026-10-29.md` e `erros-importacao-contratos.xlsx`.

## Git e deploy

| Item | Resultado |
|------|-----------|
| Commit | `dfde43d` — deixar o mapa percorrível e o relatório mais legível |
| Push | `main` → `origin/main` em `dfde43d` |
| Deploy | hosting publicado em `rerond-c747b` |
| URL | https://rerond-c747b.web.app |

Regras do Firestore, índices e Storage não foram republicados neste ciclo.
