# Ensinar a IA — Governança, RAG e Avaliação

## Objetivo

Tornar a aba “Ensinar a IA” confiável para produção, corrigindo persistência falsa, isolamento de tenant, autorização de conteúdo, recuperação documental, custo de embeddings, orçamento de contexto e avaliação de assertividade. Fine Tuning será tratado como experimento posterior, separado do RAG.

## Escopo

Incluído:

- fallback de `localStorage` somente em desenvolvimento explicitamente configurado;
- migração manual revisada de dados locais;
- isolamento por `organizacaoId`, `concessionariaId` e `tipoAnaliseId`;
- autorização de criação, aprovação, revogação, desativação e importação;
- auditoria de mudanças;
- RAG documental híbrido lexical + semântico;
- embeddings por chunk com deduplicação e reutilização;
- threshold de recuperação e política explícita de fallback;
- diversidade documental e cobertura de requisitos;
- orçamento unificado de tokens, bytes, chamadas, tempo e custo;
- preview coerente com seleção efetiva do backend;
- dataset dourado, métricas técnicas e testes end-to-end;
- desenho de experimento para Fine Tuning após baseline estável.

Fora do escopo inicial:

- novo vector store;
- Fine Tuning em produção;
- reescrita completa do pipeline de análise;
- migração automática silenciosa de dados locais;
- conteúdo global implícito.

## Decisões de produto

### Dados locais

Dados existentes em `localStorage` serão exportados, revisados e importados manualmente. A revisão deve confirmar organização, concessionária, tipo, autor e conteúdo. Registros conflitantes ou incompletos serão separados para decisão; não serão enviados automaticamente.

### Tenant

Conteúdo novo exige `organizacaoId` e `concessionariaId`. Registros legados sem esses campos ficam fora do prompt até revisão. Conteúdo global não será aceito implicitamente.

### RAG v1

A primeira versão será híbrida e controlada, sem infraestrutura vetorial nova. A recuperação combinará busca lexical e embeddings persistidos por chunk.

### Aceite

A avaliação usará matriz por tipo de análise, com critérios distintos para qualidade geral, itens críticos, evidências, páginas, alucinação, consistência, custo e latência.

## Arquitetura alvo

### Governança de conteúdo

Golden cases e feedbacks terão, no mínimo:

- tenant (`organizacaoId`, `concessionariaId`);
- `tipoAnaliseId`;
- autor;
- status explícito;
- flag de atividade;
- versão do conteúdo;
- timestamps;
- revisor e timestamp de revisão;
- origem da importação, quando aplicável.

Papéis:

- colaborador: cria e edita rascunhos permitidos;
- revisor: aprova e rejeita;
- administrador: revoga, desativa e importa;
- backend: seleciona somente conteúdo autorizado e elegível.

Regras Firestore e validações backend devem impedir que o cliente altere tenant ou faça transição de status sem autorização.

### Persistência e fallback

Em produção, falha de Firestore interrompe a operação e exibe erro. Nenhuma operação local será apresentada como sincronizada. Fallback em `localStorage` será habilitado somente por configuração explícita de desenvolvimento e terá indicação inequívoca.

### RAG documental

Cada chunk indexado terá:

- identificador do documento;
- hash do conteúdo;
- tenant;
- tipo documental;
- texto;
- página real, quando disponível;
- embedding;
- modelo e versão do embedding;
- versão do parser;
- timestamps.

O fluxo de recuperação será:

1. filtrar por tenant e tipo;
2. gerar ou reutilizar query embedding;
3. recuperar candidatos lexicalmente;
4. recuperar candidatos semanticamente;
5. combinar scores;
6. aplicar threshold calibrado;
7. deduplicar;
8. limitar chunks por documento;
9. garantir diversidade documental;
10. selecionar cobertura de requisitos;
11. incluir contexto adjacente quando necessário;
12. registrar evidência e motivo da seleção.

Nenhum item abaixo do threshold será injetado sem política explícita. Ausência de evidência será distinta de erro de extração, erro de embedding e fallback lexical.

### Embeddings e custos

Embeddings de conteúdo serão pré-processados em job de indexação sempre que possível. O sistema deve usar hash para evitar reprocessamento, lock para evitar geração duplicada, batch quando suportado, cache de query e orçamento global de chamadas.

Golden cases e feedbacks devem compartilhar a query embedding da análise. Fallback lexical deve ser marcado no resultado. Recência não será substituto silencioso de relevância.

### Orçamento de contexto

Um orçamento único medirá:

- instruções do sistema;
- requisitos;
- normas;
- memória;
- golden cases;
- feedbacks;
- chunks RAG;
- PDFs;
- margem de saída.

O planejador deve registrar tokens estimados e usados, contexto removido, retries, número de chamadas e custo estimado. Deve preservar evidência crítica e impedir retries sem orçamento.

### Preview

O preview da aba deve compartilhar seleção, filtros, ranking, threshold e composição do backend. Deve mostrar golden cases, feedbacks, evidências, score e fallback aplicado.

## Segurança e falhas

- Links persistidos aceitarão somente esquemas `http` e `https`.
- Downloads externos terão validação de domínio/bucket, tenant, tamanho, redirects e tipo de conteúdo.
- Conteúdo de PDF e exemplos serão delimitados como dados não confiáveis no prompt.
- Ações de revisão terão loading por item, tratamento de erro e proteção contra duplo clique.
- Exclusão física será substituída por desativação e auditoria, salvo exceção administrativa controlada.
- Documentos sem status explícito não entrarão no prompt.

## Avaliação

Criar dataset dourado por tipo com entrada, documentos, resultado esperado, evidências, páginas, severidade, norma aplicável e critérios de falso positivo/negativo.

Métricas:

- precisão e recall por finding;
- assertividade de itens críticos;
- precisão de evidência;
- precisão de página;
- taxa de alucinação;
- consistência checklist/parecer;
- custo por análise;
- latência P50/P95;
- taxa de fallback;
- taxa de ausência de evidência.

Testes end-to-end devem executar o processor com fixtures e verificar tenant, concessionária, tipo, recuperação, prompt, IDs injetados, evidências, persistência e resultado.

## Fine Tuning

Fine Tuning será iniciado somente após baseline e dataset estáveis. O primeiro experimento avaliará classificação, formato estruturado, consistência de justificativa e vocabulário técnico.

Comparar:

1. modelo atual + RAG;
2. modelo Fine Tuned sem RAG;
3. modelo Fine Tuned + RAG.

O experimento precisa de conjuntos separados de treino, validação e teste, anonimização, métricas críticas, análise de custo, rollback e critério de não-regressão de evidências e alucinação.

## Fases de implementação

1. Baseline, dataset inicial e critérios de aceite.
2. Tenant, autorização, fallback e auditoria.
3. RAG híbrido e metadados de chunks.
4. Isolamento por concessionária.
5. Threshold, pré-processamento e custo de embeddings.
6. Orçamento unificado de contexto.
7. Preview e avaliação end-to-end.
8. Experimento de Fine Tuning.

## Critério de conclusão

A implementação só será considerada concluída quando:

- nenhuma falha de produção for mascarada por `localStorage`;
- conteúdo cruzado entre organizações, concessionárias ou tipos for bloqueado por regra testada;
- recuperação semântica e lexical tiver threshold e telemetria;
- orçamento real cobrir todo o contexto;
- preview representar a seleção do backend;
- testes end-to-end passarem;
- matriz de assertividade produzir baseline reproduzível;
- Fine Tuning permanecer separado até aprovação dos resultados experimentais.

## Não objetivos

Não prometer aumento de assertividade antes da avaliação. Não chamar recuperação lexical de RAG semântico. Não usar Fine Tuning para substituir recuperação de documentos ou controle de tenant.
