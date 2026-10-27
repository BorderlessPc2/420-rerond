# Design — Gestão de contratos: pontos junto ao protocolo, importação de planilhas e visual

**Data:** 27/10/2026
**Projeto:** 420-rerond
**Área:** `src/views/Gestao*.tsx` + `src/services/gestaoContratos.ts`

## Intenção e porquê

A área de gestão de contratos (criada em 26/10, commit "feat area nova rerond") funciona, mas o fluxo real de uso não bate com a implementação: na prática, protocolo e pontos nascem juntos e raramente mudam depois. Hoje é preciso criar o protocolo, sair da tela, ir à aba Pontos e cadastrar ponto a ponto escolhendo o protocolo — trabalho triplo. Além disso, cadastros em massa chegam por planilha e hoje não há importação. Por fim, o interior do contrato precisa ser mais visual (dashboard/status e tela do protocolo) para leitura rápida.

## Decisões do usuário

1. **Criação conjunta:** ao criar um protocolo, deve ser possível cadastrar os pontos na mesma tela, salvos junto com o protocolo. Criar ponto solto depois continua existindo (caso raro), via aba Pontos como hoje.
2. **Conteúdo da planilha:** cada linha é um **ponto**; as colunas do protocolo (título, concessionária, rodovia, número) vêm repetidas nas linhas. O sistema agrupa as linhas por protocolo e cria protocolos + pontos de uma vez.
3. **Formato da planilha:** aceitar **Excel (.xlsx) e CSV**. Isso exige adicionar a biblioteca `xlsx` (SheetJS) ao projeto — não há nenhuma lib de planilha instalada hoje.
4. **Erros na importação:** fluxo de **prévia antes de salvar**. O sistema mostra as linhas com erro por linha (ex.: km vazio, coordenada inválida, campos obrigatórios faltando) e o usuário confirma para gravar; linhas inválidas não entram.
5. **Visual:** prioridades são (a) dashboard e status mais visuais dentro do contrato e (b) tela do protocolo mais organizada e escaneável. O mapa esquemático fica fora deste ciclo.

## Objetivos

- Criar protocolo com pontos embutidos em um único formulário/fluxo, persistindo tudo de uma vez.
- Importar planilha .xlsx/.csv com parse, agrupamento por protocolo, validação por linha, prévia e confirmação.
- Melhorar a hierarquia visual do contrato: cards de métricas com mais destaque, status/prazos com cores claras, barra de progresso por etapa do protocolo, timeline e pontos vinculados mais legíveis na tela do protocolo.
- Manter modularidade: regras de validação e agrupamento em funções puras testáveis no service, fora dos componentes.

## Não-objetivos

- Mapa real (georreferenciado) — fora deste ciclo.
- Mudanças de modelo no Firestore (coleções `gestaoContratos`, `gestaoProtocolos`, `gestaoPontos`, `gestaoMovimentos` permanecem).
- Alterações em regras de segurança, roles, ou na área "Ensinar a IA".
- Edição em massa ou remoção de protocolos/pontos.

## Anti-objetivos (seria falha mesmo "funcionando")

- Importação que grava dados parciais sem o usuário ter visto a prévia dos erros.
- Duplicar a lógica de validação de ponto (hoje em `criarPonto`) dentro do parser da planilha — a validação deve ser compartilhada.
- Criação de protocolo+pontos que salva o protocolo e perde os pontos em caso de erro no meio (usar `writeBatch` para atomicidade).
- Visual que quebra o design system existente (variáveis `--color-*`, `--radius-*` já usadas em `GestaoContratos.css`).

## Partes do "como" já decididas

### 1. Protocolo com pontos embutidos

- No formulário "Novo protocolo" (`src/views/GestaoProtocolos.tsx`), adicionar uma seção "Pontos do protocolo": lista dinâmica de linhas (adicionar/remover), cada linha com os campos de ponto existentes: código, estado, km, classificação (nova_implantacao/regularizacao), latitude, longitude, precisão.
- Concessionária e rodovia dos pontos **herdam do protocolo** (não se repetem por linha) — é o que `criarPonto` já exige.
- Nova função no service `criarProtocoloComPontos(contratoId, protocoloInput, pontosInput)` que:
  - reutiliza as mesmas validações de `criarProtocolo` e `criarPonto`;
  - grava protocolo + pontos em um `writeBatch` (tudo ou nada);
  - permite zero pontos (protocolo sem pontos continua válido).
- A aba Pontos permanece igual para o caso raro de ponto avulso.

### 2. Importação de planilhas

- Dependência nova: `xlsx` (SheetJS) — decisão técnica registrada aqui; alternativa seria CSV-only, mas o usuário pediu .xlsx.
- Entrada: botão "Importar planilha" na aba Protocolos (ou Pontos — ver "chamadas do builder" abaixo).
- Fluxo: selecionar arquivo → parse → prévia → confirmar → gravação em batches → resumo do que entrou/ficou de fora.
- **Template de colunas** (chamada minha, o usuário não especificou): cabeçalhos em português, aceitos com aliases razoáveis:
  - `titulo_protocolo` (obrigatório), `concessionaria` (obrigatório), `rodovia` (obrigatório), `numero_protocolo` (opcional);
  - `codigo_ponto` (obrigatório), `estado` (obrigatório), `km` (obrigatório);
  - `classificacao` (`nova_implantacao` | `regularizacao`; default `nova_implantacao` se vazio);
  - `latitude`, `longitude` (opcionais, sempre juntas), `precisao` (`confirmada` | `aproximada`; default `confirmada` quando há coordenadas).
- Parser puro e testável no service (ex.: `src/services/gestaoImportacao.ts`): recebe linhas brutas, devolve `{ protocolos: [{ input, pontos: [{ input, erros: [] }] }], linhasInvalidas: [{ linha, erros }] }`. Sem Firestore no parser.
- Agrupamento por protocolo: chave normalizada `(titulo, concessionaria, rodovia)` (trim + case-insensitive). Linhas com mesma chave viram um protocolo com vários pontos.
- Validação por linha reutiliza as mesmas regras de `criarPonto`/`criarProtocolo` (extrair validadores puros compartilhados para não duplicar).
- Gravação: um `writeBatch` por protocolo (protocolo + seus pontos), respeitando o limite de 500 operações por batch; protocolos que falharem não impedem os demais, com resumo final.
- Oferecer download de um modelo de planilha (botão "Baixar modelo") gerado via `xlsx`.
- Testes unitários do parser (linhas válidas, campos faltando, coordenadas inválidas, agrupamento, aliases de coluna) seguindo o padrão de `src/services/gestaoContratos.test.ts`.

### 3. Visual dentro do contrato

- **Dashboard (Visão geral / cabeçalho do contrato):**
  - Cards de métricas com destaque maior (ícone, cor por sentido: neutro, sucesso para realizados, alerta para vencidos).
  - Badges de status com cores semânticas por situação (ex.: `em_correcao` → warning, `concluido` → success, `paralisado` → danger) em vez do chip único azul atual — componente/variante de `.gestao-status` com mapa de cores.
  - Barra de progresso por etapa nos protocolos (planejamento → elaboração → fase 1 → fase 2 → homologação → concluído), visível na lista de protocolos e na tela do protocolo.
- **Tela do protocolo (`GestaoProtocoloDetalhe`):**
  - Reorganizar em seções claras: cabeçalho com status e barra de etapa; "próximo passo" em destaque; pontos vinculados em tabela/cards com código, km, classificação, resultado; timeline do histórico mais legível (datas, status com cor, anexos como chips).
- Tudo usando as variáveis de cor/radius existentes em `GestaoContratos.css`; novos estilos entram nesse arquivo seguindo a nomenclatura `.gestao-*`.

### Decisões fechadas após revisão do design

- **Protocolo já existente na importação (decisão do usuário):** se a planilha trouxer `(título, concessionária, rodovia)` igual a um protocolo existente no contrato, os pontos novos entram no protocolo existente — nenhum protocolo duplicado é criado. Pontos cujo `codigo_ponto` já exista naquele protocolo viram erro de linha na prévia.
- **Limite de 500 operações por batch:** se um protocolo tiver pontos demais para um `writeBatch`, dividir em múltiplos batches; a atomicidade é por protocolo, não por batch.
- **Falha na gravação de um grupo:** o resumo final informa erro por grupo; o usuário corrige e reimporta a planilha. Sem retry granular na prévia.
- **Pontos duplicados dentro da mesma planilha** (mesmo protocolo + mesmo `codigo_ponto`): a segunda ocorrência em diante aparece como erro de linha na prévia.
- **Campos opcionais:** ponto sem coordenadas não grava `precisao`; `precisao` informada sem coordenadas é ignorada; `resultado` não entra na criação (nem no formulário conjunto nem na planilha).
- **Formulário conjunto com linha inválida:** a validação por linha na UI bloqueia o envio até o usuário corrigir ou remover a linha — nunca salva parcialmente.
- **CSV:** aceitar UTF-8 com ou sem BOM e separador `;` ou `,` (padrão do Excel brasileiro).

## Chamadas do builder (decididas por mim, não pelo usuário)

- Template de colunas da planilha (acima).
- `xlsx` como lib de parse/geração de planilha.
- Local do botão de importação: aba Protocolos, ao lado de "Novo protocolo".
- Permitir protocolo sem pontos no fluxo combinado e na planilha (linha com dados de protocolo e `codigo_ponto` vazio cria só o protocolo).
- `classificacao` vazia na planilha assume `nova_implantacao`.

## Constraints

- Sem libs novas além de `xlsx`.
- Validar com: `npm test -- --run`, `npm run lint`, `npm run build` (padrão do projeto).
- Regras Firestore/storage não mudam; se a gravação em batch falhar por permissão, o erro existente já é explícito.
