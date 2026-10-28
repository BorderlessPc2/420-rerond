# Spec — Gestão de contratos, protocolos e pontos

**Data:** 28/10/2026  
**Status:** proposta para implementação  
**Escopo:** operação interna de contratos, protocolos, pontos, movimentações, importação e acompanhamento  
**Fora do escopo:** análise ou melhoria da IA, portal externo, edição automática de projetos, redesign amplo

## 1. Objetivo

Transformar o módulo de Gestão de Contratos em fluxo operacional completo para cadastrar, organizar, executar e acompanhar contratos, protocolos e pontos vinculados.

O sistema deve permitir que o operador:

- crie e consulte contratos;
- gere protocolos dentro de contratos;
- gere pontos dentro de protocolos;
- acompanhe etapa, situação, previsão e realização;
- registre movimentações com observações e anexos;
- importe protocolos e pontos por XLSX/CSV;
- consulte indicadores, filtros e histórico;
- corrija dados sem criar registros duplicados.

## 2. Modelo de domínio

```text
Contrato
└── Protocolos
    └── Pontos
        └── Movimentações
            └── Anexos
```

### 2.1 Contrato

Representa o vínculo operacional principal.

Campos mínimos atuais:

- `id`;
- `nome`;
- `clienteId` opcional;
- `createdAt`.

Campos previstos para completar o cadastro contratual:

- número do contrato;
- objeto;
- contratante;
- contratada;
- responsável;
- vigência inicial e final;
- situação;
- observações;
- anexos contratuais.

### 2.2 Protocolo

Representa uma demanda ou conjunto operacional dentro de um contrato.

Campos:

- `id`;
- `contratoId` obrigatório;
- `titulo` obrigatório;
- `concessionaria` obrigatória;
- `rodovia` obrigatória;
- `numero` opcional;
- `etapa`;
- `status`;
- `previsao` opcional;
- `realizadoEm` opcional;
- `processoAnaliseId` opcional, somente para vínculo legado quando necessário;
- `createdAt`.

### 2.3 Ponto

Representa uma ocorrência ou local operacional vinculado a um protocolo.

Campos:

- `id`;
- `contratoId` obrigatório;
- `protocoloId` obrigatório;
- `codigo` obrigatório;
- `estado` obrigatório;
- `rodovia` obrigatória;
- `concessionaria` obrigatória;
- `km` obrigatório;
- `tipo` (`regularizacao` ou `nova_implantacao`);
- `resultado` opcional (`regularizado` ou `aprovado_implantacao`);
- `latitude` e `longitude`, opcionais, mas sempre em conjunto;
- `precisao` opcional (`confirmada` ou `aproximada`);
- `previsao` opcional;
- `realizadoEm` opcional.

### 2.4 Movimentação

Registra mudança operacional no protocolo.

Campos:

- `id`;
- `contratoId`;
- `protocoloId`;
- `tipo`;
- `em`;
- `autor`;
- `observacao`;
- `etapa`;
- `status`;
- `anexos` com nome e URL.

## 3. Fluxos funcionais

## 3.1 Criar contrato

```text
Abrir Gestão de Contratos
→ Selecionar criar contrato
→ Informar dados obrigatórios
→ Vincular cliente opcional
→ Validar
→ Salvar contrato
→ Abrir detalhe do contrato
```

Regras:

- nome não pode ser vazio;
- cliente pode ser nulo;
- criação gera ID único;
- contrato criado aparece na listagem;
- falha deve ser exibida ao operador.

Evolução prevista: formulário completo de contrato, edição, inativação e anexos.

## 3.2 Criar protocolo sem pontos

```text
Contrato
→ Novo protocolo
→ Informar título, concessionária e rodovia
→ Informar número opcional
→ Validar
→ Salvar protocolo
→ Iniciar em planejamento / não iniciado
```

Regras:

- protocolo deve pertencer a contrato existente;
- título, concessionária e rodovia são obrigatórios;
- protocolo pode ser criado sem pontos;
- etapa inicial: `planejamento`;
- situação inicial: `nao_iniciado`.

## 3.3 Criar protocolo com pontos

```text
Contrato
→ Novo protocolo
→ Informar dados do protocolo
→ Adicionar pontos
→ Validar protocolo e todos os pontos
→ Gravar protocolo + pontos atomicamente
→ Abrir detalhe
```

Regras:

- pontos herdam concessionária e rodovia do protocolo;
- qualquer erro impede toda a gravação;
- protocolo novo aceita até 499 pontos no batch;
- protocolo pode ser salvo mesmo sem pontos;
- pontos recebem o mesmo `contratoId` e novo `protocoloId`.

## 3.4 Criar ponto avulso

```text
Contrato
→ Selecionar protocolo
→ Adicionar ponto
→ Preencher dados
→ Validar vínculo
→ Salvar ponto
```

Regras:

- protocolo deve pertencer ao contrato selecionado;
- concessionária e rodovia do ponto devem coincidir com protocolo;
- latitude e longitude devem ser informadas juntas;
- coordenadas devem respeitar limites geográficos;
- resultado deve ser compatível com tipo do ponto.

## 3.5 Planejar execução

O operador pode definir previsão e data de realização para protocolo ou ponto.

```text
Selecionar protocolo/ponto
→ Informar previsão
→ Informar realizadoEm, quando concluído
→ Salvar
→ Atualizar indicadores
```

Evolução prevista:

- validação de datas;
- identificação de atraso;
- responsável;
- prazo planejado;
- alertas de vencimento.

## 3.6 Registrar movimentação

```text
Protocolo
→ Nova movimentação
→ Informar tipo, data e observação
→ Selecionar etapa e status
→ Adicionar anexos opcionais
→ Validar
→ Fazer upload dos anexos
→ Gravar movimentação
→ Atualizar protocolo
→ Exibir histórico
```

Regras:

- tipo e data são obrigatórios;
- data deve ser válida;
- cada anexo pode ter até 20 MB;
- movimentação deve referenciar protocolo do mesmo contrato;
- movimentação e atualização do protocolo devem ocorrer em transação;
- autor deve ser obtido do usuário autenticado;
- falha deve mostrar mensagem acionável.

Evolução prevista:

- tabela explícita de transições permitidas;
- exigir observação em correção ou paralisação;
- impedir conclusão com pendências;
- manter auditoria de cada alteração;
- tratar anexos órfãos após falha de transação.

## 3.7 Importar protocolos e pontos

```text
Selecionar XLSX/CSV
→ Ler primeira aba
→ Normalizar cabeçalhos
→ Aplicar aliases
→ Agrupar por protocolo
→ Validar linhas
→ Exibir prévia
→ Confirmar
→ Reutilizar protocolo existente ou criar novo
→ Criar pontos em batch
→ Exibir resumo por protocolo
```

Cabeçalhos suportados:

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

Regras:

- XLSX e CSV são aceitos;
- primeira aba é usada;
- cabeçalhos ignoram acentos, caixa e espaços equivalentes;
- linhas inválidas são exibidas por número;
- linhas válidas continuam importáveis;
- protocolo existente é localizado por título, concessionária e rodovia normalizados;
- ponto duplicado é rejeitado;
- protocolo novo aceita até 499 pontos;
- protocolo existente aceita até 500 pontos adicionais;
- cada grupo possui resultado próprio;
- confirmação explícita é obrigatória.

Evolução prevista:

- bloquear arquivo vazio ou cabeçalho obrigatório ausente;
- opção de validar sem importar;
- prévia de alterações em protocolos existentes;
- exportar relatório de sucesso e erros;
- importação segura em lotes acima do limite;
- reprocessamento idempotente;
- mecanismo de desfazer quando viável.

## 3.8 Consultar e acompanhar

A tela deve permitir:

- listar contratos;
- abrir contrato;
- listar protocolos do contrato;
- listar pontos;
- abrir detalhe de protocolo;
- visualizar movimentações;
- visualizar anexos;
- filtrar resultados;
- consultar indicadores.

Filtros atuais:

- estado;
- concessionária;
- rodovia;
- status;
- tipo de ponto;
- etapa;
- período inicial;
- período final.

Indicadores atuais:

- total de protocolos;
- total de pontos;
- pontos regularizados;
- pontos aprovados para implantação;
- pontos previstos;
- pontos realizados.

Evolução prevista:

- pontos atrasados;
- protocolos paralisados;
- evolução por etapa;
- busca textual;
- ordenação e paginação;
- exportação CSV/XLSX;
- mapa de pontos com coordenadas.

## 4. Etapas e situações

### Etapas

```text
planejamento
elaboracao
fase_1
fase_2
homologacao
concluido
```

### Situações

```text
nao_iniciado
em_andamento
em_analise
em_correcao
aguardando_terceiros
paralisado
aprovado_concessionaria
concluido
```

A etapa representa posição no ciclo operacional. A situação representa condição atual. A UI deve exibir ambos sem misturar seus significados.

Evolução obrigatória antes de operação crítica: definir matriz de transições permitidas, incluindo transições inválidas, justificativa e usuário responsável.

## 5. Validações

### Protocolo

- título, concessionária e rodovia obrigatórios;
- contrato deve existir;
- dados textuais devem ser normalizados para comparação;
- duplicidade deve ser tratada antes da criação manual ou importada.

### Ponto

- código, estado e km obrigatórios;
- contrato e protocolo devem coincidir;
- concessionária e rodovia devem coincidir com protocolo;
- latitude e longitude devem aparecer juntas;
- latitude entre `-90` e `90`;
- longitude entre `-180` e `180`;
- resultado compatível com classificação;
- código não pode duplicar no escopo definido.

### Arquivo

- tamanho máximo de 20 MB por anexo de movimentação;
- nome e URL devem ser persistidos após upload;
- erro de upload deve impedir confirmação enganosa;
- extensão e conteúdo de planilha devem ser validados.

## 6. Persistência

Coleções atuais:

- `gestaoContratos`;
- `gestaoProtocolos`;
- `gestaoPontos`;
- `gestaoMovimentos`.

Regras de consistência:

- todo protocolo deve referenciar contrato existente;
- todo ponto deve referenciar contrato e protocolo compatíveis;
- toda movimentação deve referenciar contrato e protocolo compatíveis;
- alterações de etapa/status devem atualizar histórico;
- operações multi-documento devem usar `writeBatch` ou transação quando exigirem atomicidade.

## 7. Segurança e autorização

- exigir usuário autenticado;
- validar `contratoId`, `protocoloId` e IDs relacionados no backend Firestore Rules;
- impedir gravação cruzada entre contratos;
- validar limites de anexos nas regras e no cliente;
- não confiar somente em filtros da interface;
- impedir alteração de vínculo estrutural por usuário sem permissão definida.

## 8. Estado atual e próximo incremento

### Implementado

- cadastro básico de contratos;
- criação de protocolos;
- criação conjunta de protocolo e pontos;
- criação avulsa de pontos;
- validações compartilhadas;
- planejamento básico;
- movimentações com anexos;
- atualização de etapa e status;
- importação XLSX/CSV com prévia;
- agrupamento por protocolo;
- prevenção de duplicidades;
- filtros e indicadores básicos;
- testes unitários e build.

### Próxima ordem de implementação

1. Editar protocolo e ponto sem criar novo registro.
2. Completar cadastro e edição de contrato.
3. Definir e aplicar transições válidas de etapa/status.
4. Completar auditoria e histórico de alterações.
5. Fortalecer importação: arquivo vazio, cabeçalhos, prévia de mudanças e lotes.
6. Adicionar indicadores operacionais: atrasos, pendências e paralisados.
7. Adicionar exportação e, depois, mapa.

## 9. Critérios de aceite do próximo ciclo

### Edição

- operador edita protocolo sem alterar seu ID;
- operador edita ponto sem alterar seu ID;
- alterações preservam contrato e protocolo;
- histórico registra campos relevantes alterados.

### Transições

- transição permitida atualiza etapa/status e cria histórico;
- transição inválida é rejeitada com mensagem clara;
- conclusão exige condições definidas pelo negócio;
- paralisação e correção exigem observação.

### Importação

- arquivo inválido falha antes da gravação;
- prévia mostra totais, grupos, válidos, inválidos e duplicados;
- confirmação grava somente dados aprovados;
- falha em grupo não corrompe outros grupos;
- repetição da mesma importação não cria pontos duplicados.

### Acompanhamento

- filtros combinados retornam dados coerentes;
- indicadores respeitam os filtros aplicados;
- detalhe mostra pontos, status, etapa, planejamento e movimentações;
- anexos abrem por URL válida;
- falhas nunca aparecem como sucesso silencioso.

## 10. Fora do escopo

- análise técnica por IA;
- treinamento, feedback ou melhoria de IA;
- fine-tuning, RAG ou embeddings;
- portal público para clientes externos;
- edição automática de plantas ou projetos;
- redesign completo do dashboard;
- migração de Firebase ou troca de infraestrutura;
- novos domínios sem regras de negócio aprovadas.

## 11. Validação técnica

Comandos mínimos antes de concluir cada incremento:

```bash
npm test -- --run
npm run build
npm run lint
npm run functions:build
git diff --check
```

Também é necessária validação autenticada do fluxo real:

```text
criar contrato
→ criar protocolo
→ criar protocolo com pontos
→ editar ponto
→ registrar movimentação com anexo
→ alterar etapa/status
→ importar planilha
→ repetir importação
→ consultar filtros e indicadores
```

O Firebase Emulator ou ambiente autenticado deve ser usado para validar regras e atomicidade. Testes unitários não substituem essa validação.

## 12. Resultado esperado

Ao final do ciclo, o módulo deve permitir operação completa sem recriar registros para corrigir dados:

```text
Contrato completo
→ Protocolos organizados
→ Pontos vinculados
→ Planejamento
→ Movimentações auditáveis
→ Anexos
→ Importação segura
→ Indicadores operacionais
→ Conclusão do protocolo
```

A qualidade do módulo será medida pela consistência dos vínculos, ausência de duplicidades, rastreabilidade das alterações e capacidade de acompanhar a operação do início ao encerramento.
