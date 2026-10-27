# Relatório de implementação — Gestão de contratos

**Data:** 27/10/2026  
**Projeto:** 420-rerond  
**Área:** Gestão de contratos, protocolos, pontos e importação

## Resumo

A área de contratos foi ampliada para refletir o fluxo operacional real: protocolo e pontos podem nascer juntos, sem exigir cadastro e vínculo em etapas separadas. Também foi adicionada importação de planilhas Excel/CSV com prévia, validação por linha, agrupamento por protocolo e prevenção de duplicidades.

A interface recebeu melhorias de hierarquia visual, status semânticos, progresso por etapa, formulário de pontos mais claro e prévia de importação mais informativa.

## Implementações

### 1. Criação conjunta de protocolo e pontos

- Novo serviço `criarProtocoloComPontos`.
- Cadastro de protocolo e pontos em um único fluxo.
- Pontos herdam concessionária e rodovia do protocolo.
- Suporte a protocolo sem pontos.
- Validação antes da gravação.
- Persistência atômica em um único `writeBatch`.
- Limite preventivo de 499 pontos para protocolo novo, respeitando o limite de 500 operações do Firestore.
- Criação avulsa de ponto continua disponível na aba Pontos.

### 2. Validação compartilhada

Criado `src/services/gestaoValidacao.ts` com regras reutilizadas por:

- criação de protocolo;
- criação de ponto;
- criação conjunta;
- importação de planilhas.

Validações cobertas:

- campos obrigatórios;
- concessionária e rodovia compatíveis;
- latitude e longitude informadas em conjunto;
- limites geográficos válidos;
- compatibilidade entre classificação e resultado;
- códigos duplicados durante importação.

### 3. Importação de planilhas

Adicionada dependência `xlsx` para leitura e geração de planilhas.

Formatos aceitos:

- `.xlsx`;
- `.csv`.

Fluxo implementado:

1. selecionar arquivo;
2. interpretar primeira aba;
3. normalizar cabeçalhos e aliases;
4. agrupar linhas pelo protocolo;
5. validar cada linha;
6. exibir prévia;
7. importar somente dados válidos após confirmação;
8. mostrar resumo da operação.

Cabeçalhos principais:

- `titulo_protocolo`;
- `concessionaria`;
- `rodovia`;
- `numero_protocolo`;
- `codigo_ponto`;
- `estado`;
- `km`;
- `classificacao`;
- `latitude`;
- `longitude`;
- `precisao`.

Também foi adicionado botão para baixar modelo de planilha.

### 4. Reutilização e duplicidade

- Protocolo existente é localizado por título, concessionária e rodovia normalizados.
- Importação não cria protocolo duplicado.
- Código de ponto já existente é rejeitado.
- Comparação de códigos remove diferenças de espaços e caixa.
- Linhas inválidas não bloqueiam importação das linhas válidas.
- Cada grupo de protocolo possui resultado e erro individual.
- Protocolos novos com mais de 499 pontos são rejeitados antes da gravação para manter atomicidade.
- Protocolos existentes aceitam até 500 pontos adicionais em um único batch.

### 5. Melhorias de interface

- Status com cores semânticas para:
  - correção;
  - análise;
  - aguardando terceiros;
  - paralisação;
  - aprovação;
  - conclusão.
- Barra de progresso por etapa:
  - planejamento;
  - elaboração;
  - fase 1;
  - fase 2;
  - homologação;
  - concluído.
- Formulário de pontos com:
  - contador de pontos;
  - numeração visual das linhas;
  - campos de coordenadas;
  - blocos individuais;
  - melhor adaptação mobile;
  - ações mais claras.
- Tela de detalhe do protocolo com:
  - progresso operacional;
  - pontos vinculados mais legíveis;
  - classificação e resultado exibidos;
  - status contextual.
- Prévia da importação com:
  - quantidade de protocolos;
  - quantidade de pontos;
  - grupos por protocolo;
  - erros por linha;
  - confirmação explícita.
- Respeito a `prefers-reduced-motion`.

### 6. Regras Firestore

As regras da área de gestão foram endurecidas para:

- validar anexos e seus limites;
- validar movimentações vinculadas ao protocolo correto;
- conferir contrato, protocolo e transição de etapa durante gravação.

## Testes adicionados ou ajustados

- validação de protocolo;
- validação de ponto;
- coordenadas incompletas;
- limites de latitude/longitude;
- classificação e resultado;
- progresso de etapa;
- parser de planilhas;
- aliases de cabeçalhos;
- agrupamento por protocolo;
- pontos duplicados;
- linhas inválidas;
- limite atômico de 499 pontos.

## Validação executada

```text
npm test -- --run
107 testes passando em 29 arquivos

npm run build
passou

git diff --check
passou
```

## Pendências conhecidas

- `npm run lint` ainda apresenta erros preexistentes em arquivos fora do escopo desta implementação.
- Build mantém warning de CSS inválido em trecho preexistente.
- Bundle principal continua acima de 500 kB.
- Firebase Emulator não está configurado neste ambiente; fluxo real com Firestore precisa ser validado em ambiente autenticado.
- Importações acima do limite atômico devem ser divididas pelo usuário em planilhas menores ou tratadas em futura Cloud Function com estratégia transacional/compensatória.

## Arquivos principais

- `src/services/gestaoValidacao.ts`
- `src/services/gestaoImportacao.ts`
- `src/services/gestaoImportacao.test.ts`
- `src/services/gestaoContratos.ts`
- `src/services/gestaoContratos.test.ts`
- `src/views/GestaoProtocolos.tsx`
- `src/views/GestaoContratos.css`
- `firestore.rules`
- `package.json`
- `package-lock.json`

## Observação

Não foi executado deploy. O commit e o push serão feitos somente após a validação final do diff e dos comandos acima.
