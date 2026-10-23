# Ensinar a IA — Governança com Acesso Amplo

## Objetivo

Corrigir persistência, escopo de recuperação, RAG e avaliação da aba “Ensinar a IA” sem restringir funcionalidades entre funcionários autenticados da empresa.

## Decisões

- Todo usuário autenticado no CRM pode criar, editar, aprovar, rejeitar, revogar e desativar conteúdo de Ensino.
- `organizacaoId` identifica a empresa e não bloqueia funcionários da mesma empresa.
- `concessionariaId` classifica conteúdo e orienta recuperação; não funciona como permissão individual.
- `tipoAnaliseId` continua sendo filtro técnico obrigatório para evitar misturar tipos.
- `autorId`, timestamps, versão e histórico permanecem para rastreabilidade, não para restrição.
- Conteúdo global da empresa pode existir quando `organizacaoId` corresponde à empresa e `concessionariaId` está vazio; conteúdo global não significa acesso público.
- Fallback de `localStorage` só existe em desenvolvimento explicitamente configurado.
- Fine Tuning não entra nesta implementação.

## Fora do escopo

- roles `colaborador`, `revisor` e `admin`;
- claims de autorização individual;
- bloqueio de funcionário por concessionária;
- novo vector store;
- Fine Tuning em produção;
- migração automática silenciosa.

## Contrato de conteúdo

Golden cases e feedbacks devem possuir:

- `organizacaoId` da empresa;
- `concessionariaId` opcional para conteúdo global ou preenchido para conteúdo específico;
- `tipoAnaliseId`;
- `autorId` e `autorNome`;
- status explícito;
- `ativo` explícito;
- versão;
- timestamps;
- dados de revisão e origem para rastreabilidade.

Qualquer usuário autenticado pode alterar status. Firestore deve validar apenas autenticação e integridade do tenant da empresa, não papel individual.

Registros legados sem `organizacaoId` podem ser tratados como globais durante migração controlada. Eles não devem ser considerados automaticamente pertencentes a qualquer empresa.

## Recuperação por escopo

A recuperação deve priorizar, nesta ordem:

1. mesmo `tipoAnaliseId`;
2. mesma `concessionariaId`;
3. conteúdo global da mesma empresa;
4. relevância lexical/semântica;
5. recência apenas como desempate.

Conteúdo de concessionária diferente pode ser usado somente como referência global se a política do tipo permitir e isso deve ser registrado no score/origem. Nunca usar score de concessionária como substituto de segurança.

## Fallback

Em produção, erro de Firestore retorna erro visível e não grava sucesso local. Em desenvolvimento, fallback só ativa com `VITE_ENABLE_LOCAL_FALLBACK=true` e `import.meta.env.DEV`.

Dados locais existentes serão exportados, revisados e importados manualmente. Exportação deve indicar que os dados não estão sincronizados.

## RAG

Primeira versão usa recuperação híbrida controlada, sem infraestrutura vetorial nova:

- lexical + embeddings;
- threshold calibrável;
- limite por documento;
- diversidade documental;
- origem e score no resultado;
- ausência de evidência separada de erro de extração/embedding;
- embeddings reutilizados por hash/modelo/versão quando possível.

## Orçamento

O orçamento único deve considerar sistema, requisitos, normas, memória, golden cases, feedbacks, chunks RAG, PDFs e margem de saída. Deve registrar tokens, chamadas, retries, contexto removido, tempo e custo estimado.

## Preview

Preview deve mostrar o mesmo contexto que seria selecionado para análise: golden cases, feedbacks, chunks, escopo, score, threshold e fallback.

## Avaliação

Dataset dourado por tipo de análise deve medir precisão/recall de findings, evidência, página, alucinação, consistência, custo e latência. Scorer lexical é sinal auxiliar, não critério único.

## Fases

1. Contrato de empresa, escopo e fallback.
2. Queries e Firestore compatíveis com acesso amplo autenticado.
3. Governança e rastreabilidade sem roles individuais.
4. RAG híbrido e embeddings.
5. Orçamento de contexto.
6. Preview alinhado ao backend.
7. Avaliação end-to-end.
8. Documentação e gates.

## Critério de conclusão

- qualquer usuário autenticado consegue operar Ensino;
- escopo não bloqueia usuário, apenas organiza recuperação;
- falha de Firestore não vira sucesso local em produção;
- tipo e empresa são preservados no conteúdo;
- RAG registra score/origem e não injeta itens abaixo do threshold;
- orçamento cobre todo contexto;
- preview e análise usam mesma seleção;
- testes end-to-end e builds passam;
- Fine Tuning continua fora da produção.
