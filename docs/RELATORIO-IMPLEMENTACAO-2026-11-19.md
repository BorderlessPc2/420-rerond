# Relatório de implementação — Gestão de Contratos

**Data:** 19/11/2026  
**Projeto:** 420-rerond  
**Branch:** `fix/avaliacao-ia-cliente`  
**Aplicação:** https://rerond-c747b.web.app  
**Firebase project:** `rerond-c747b`

## Resumo

Um protocolo passa a reunir vários pontos, inclusive de rodovias e concessionárias diferentes. Dá para vincular vários pontos de uma vez, excluir protocolo e excluir movimentação. O mapa da visão geral abre pelos protocolos e só mostra os pontos depois do clique. As regras do Firestore e do Storage e o aplicativo foram publicados em produção.

## Vínculo entre rodovias diferentes

O salvamento falhava com “Ponto deve pertencer à mesma concessionária e rodovia do protocolo” e, depois da retirada dessa checagem no cliente, com “Missing or insufficient permissions”.

- A validação do ponto não compara mais concessionária nem rodovia com o protocolo.
- A regra `protocoloReferenciaPontoOk` no Firestore só exige que o protocolo exista e pertença ao mesmo contrato.
- O ponto guarda a própria concessionária e a própria rodovia. Salvar os dados do ponto não copia esses campos do protocolo.
- A edição do protocolo continua livre para título, concessionária e rodovia, mesmo com pontos vinculados.

## Vários pontos no mesmo protocolo

A importação agrupava cada linha por título, concessionária e rodovia. Um ponto em outra rodovia virava outro protocolo.

- A chave de importação passou a ser título, concessionária e número do protocolo.
- Pontos da mesma chave entram no mesmo protocolo e conservam a rodovia de cada linha.
- Números de protocolo diferentes continuam separados.
- Protocolos que já tinham sido gravados um por ponto não são fundidos sozinhos. O caminho é selecionar os pontos, vincular ao protocolo certo e excluir os protocolos que ficarem vazios.

## Vínculo em lote

Na lista de Pontos:

- Cada linha tem seleção, e há “Selecionar pontos visíveis”.
- A barra pede o protocolo e executa **Vincular selecionados**.
- Códigos repetidos na seleção, ou já existentes no protocolo de destino, interrompem a gravação.
- A gravação usa lotes, para listas grandes.

## Exclusão

**Excluir protocolo**, na lista e no detalhe, apaga o protocolo e as movimentações dele. Os pontos permanecem no contrato, sem vínculo.

**Excluir** em cada movimentação apaga o evento. Se ela for a mais recente pela data, a etapa e a situação do protocolo voltam para a movimentação anterior. Se não houver nenhuma, o protocolo volta a planejamento / não iniciado.

## Mapa da visão geral

O mapa deixou de desenhar todos os pontos ao abrir.

- Cada protocolo com ponto geolocalizado aparece como um marcador, no centro dos seus pontos, com a quantidade.
- O clique troca o mapa para os pontos daquele protocolo.
- **Voltar aos protocolos** restaura a camada anterior.
- O link **Abrir protocolo** leva ao detalhe.

## Publicação

| Item | Resultado |
|------|-----------|
| Regras Firestore | Release `cloud.firestore`, ruleset `8452e64c-bc2c-4eb7-941f-edfae894f582`, 19/11/2026 10:45 (UTC−3). Sem a comparação antiga de rodovia e concessionária. |
| Regras Storage | Release `firebase.storage/rerond-c747b.firebasestorage.app`, ruleset `808aa230-66fd-49e0-ae17-a4c0d6a59bfc`, 19/11/2026 10:49 (UTC−3). Exclusão de anexo de movimentação liberada para usuário autenticado, com o protocolo ainda existente. |
| Hosting | https://rerond-c747b.web.app servindo `assets/index-DykpbieW.js` |
| Conferência do pacote publicado | Contém “Vincular selecionados”, “Voltar aos protocolos”, “Excluir protocolo” e “Excluir movimentação”. Não contém a mensagem antiga da mesma concessionária. |

A conta `borderlesspc12@gmail.com` não tinha permissão para o `firebase deploy` das regras. A publicação das regras usou a conta de serviço do projeto na API Firebase Rules. O Hosting subiu com a mesma conta de serviço.

## Validação

- `gestaoContratos`, `gestaoImportacao` e `mapaUtils`: 36 testes aprovados.
- `npx tsc -p tsconfig.app.json --noEmit`: passou.
- `npm run build`: passou. Permanece o warning antigo de CSS inválido em outro trecho e o aviso de bundle acima de 500 kB.
- O fluxo autenticado no navegador não foi exercido nesta sessão: a tela local parou no login.

## Arquivos principais

- `src/services/gestaoValidacao.ts`
- `src/services/gestaoContratos.ts`
- `src/services/gestaoContratos.test.ts`
- `src/services/gestaoImportacao.ts`
- `src/services/gestaoImportacao.test.ts`
- `src/views/GestaoProtocolos.tsx`
- `src/views/GestaoPontos.tsx`
- `src/views/GestaoContratoDetalhe.tsx`
- `src/views/GestaoContratos.css`
- `src/components/gestao/PontoPainelModal.tsx`
- `src/components/gestao/MapaLeaflet.tsx`
- `src/components/gestao/MapaLeaflet.css`
- `src/components/gestao/mapaUtils.ts`
- `src/components/gestao/mapaUtils.test.ts`
- `firestore.rules`
- `storage.rules`

## O que também estava sem commit e entrou no mesmo pacote

Estas alterações já estavam na cópia local, foram para o Hosting neste deploy e entram no mesmo commit:

- Gráfico **Status dos protocolos** abre os pontos de cada status, com paginação de 8 em 8.
- Contraste da faixa de pontos no mapa.
- Foco do dropdown sem rolar a página (`preventScroll`).
- Atualização do relatório de 11/11/2026 para registrar essa entrega anterior.

## Fora deste commit

Não entram no Git: `.superpowers/`, PDF de avaliação da IA, relatórios soltos de outras datas, `erros-importacao-contratos.xlsx` e `public/proposta-gestao-pontos.html`.
