# Relatório de implementação — Ensinar a IA

**Data:** 23/10/2026  
**Projeto:** 420-rerond  
**Escopo:** governança do aprendizado, recuperação contextual, RAG documental, embeddings, orçamento de contexto e validação do preview.

## Resumo executivo

A aba **Ensinar a IA** foi endurecida para que conteúdo de aprendizado não pareça salvo quando falhar a sincronização com Firestore. O fluxo continua disponível para qualquer usuário autenticado do CRM, sem roles individuais. `concessionariaId` organiza e prioriza a recuperação; não funciona como autorização.

Fine Tuning e novo vector store ficaram fora deste ciclo. O RAG documental atual recebeu contrato de score, threshold e motivos de seleção, mas ainda usa recuperação lexical de chunks; embeddings persistidos por chunk seguem como próxima etapa.

## Implementações

### 1. Fallback local e sincronização

- Fallback para `localStorage` permitido somente quando:
  - ambiente é desenvolvimento; e
  - `VITE_ENABLE_LOCAL_FALLBACK=true`.
- Falhas de permissão em produção agora retornam erro explícito.
- O usuário não recebe confirmação local como se o conteúdo tivesse chegado ao backend.
- Testes adicionados para a política de fallback.

Arquivos principais:

- `src/config/localFallback.ts`
- `src/services/goldenCase/goldenCaseService.ts`
- `src/services/feedback/feedbackService.ts`

### 2. Acesso e governança Firestore

- Usuários autenticados podem ler e gravar conteúdos de aprendizado.
- Não foram adicionadas roles `admin`, `revisor` ou `colaborador`.
- Golden cases, feedbacks e auditoria receberam contrato de autoria, origem, revisão, versão e ativação quando aplicável.
- Conteúdo global pode ter `concessionariaId` vazio.

Arquivo principal:

- `firestore.rules`

### 3. Escopo de aprendizado

- `tipoAnaliseId` permanece obrigatório para seleção.
- `organizacaoId` identifica empresa quando disponível.
- `concessionariaId` prioriza conteúdo da concessionária atual.
- Conteúdo global da organização pode ser usado.
- Conteúdo de outra concessionária pode entrar apenas como fallback contextual, com motivo identificável.
- Conteúdo de organização incompatível não entra no contexto.

Arquivos principais:

- `src/services/learning/learningScope.ts`
- `functions/src/services/contextSelection/rankByContext.ts`

### 4. Ranking contextual

Adicionado ranking detalhado com:

- `scope`;
- `selectionReason`;
- `textScore`;
- score de organização;
- prioridade de concessionária;
- recência apenas como desempate/componente secundário.

A autorização continua sendo responsabilidade do Firestore e dos filtros de organização. Ranking não é usado como mecanismo de segurança.

### 5. Threshold de similaridade

- `rankBySimilarity` agora aceita threshold mínimo.
- Resultados abaixo do threshold são descartados.
- Query vazia ou embedding ausente não seleciona conteúdo automaticamente.
- Falha de embedding não é tratada como relevância semântica; o log identifica fallback lexical.

Arquivo principal:

- `functions/src/services/embeddingService.ts`

O valor atual de threshold ainda precisa de calibração com dados reais de produção antes de virar política definitiva.

### 6. Embeddings de golden cases e feedbacks

- Embeddings existentes são reutilizados.
- Embeddings ausentes são gerados em paralelo, reduzindo chamadas sequenciais.
- Falhas individuais não interrompem toda a análise.
- Fallback fica explicitamente registrado como lexical.

Arquivos principais:

- `functions/src/services/goldenCaseService.ts`
- `functions/src/services/feedbackAprendizadoService.ts`

Ainda não existe fila assíncrona de pré-processamento nem batch de embeddings persistidos. Essa é a próxima evolução recomendada.

### 7. RAG documental

A recuperação documental passou a expor metadados auditáveis:

- `lexicalScore`;
- `semanticScore`;
- `combinedScore`;
- `thresholdPassed`;
- `selectionReason`.

Também foram mantidos:

- limite de chunks por documento;
- diversidade entre documentos;
- limite total de chunks;
- prioridade por tipo documental.

O código atual deve ser descrito como **recuperação lexical de chunks com contrato preparado para score híbrido**, não como RAG semântico documental completo.

Arquivos principais:

- `functions/src/services/pipeline/documentRetrieval.ts`
- `functions/src/services/pipeline/pdfTextExtractor.ts`

### 8. Orçamento de contexto

Criado orçamento por blocos para evitar que o limite considere apenas PDFs. O cálculo considera:

- sistema;
- requisitos;
- normas;
- memória anterior;
- golden cases;
- feedbacks;
- RAG documental;
- PDFs;
- reserva de tokens de saída.

Blocos opcionais são limitados antes da montagem do prompt.

Arquivos principais:

- `functions/src/services/contextSelection/contextBudget.ts`
- `functions/src/services/analiseJobProcessor.ts`

### 9. Preview da aba Ensinar a IA

- Preview continua filtrando casos aprovados, ativos e do tipo selecionado.
- Quando `organizacaoId` estiver disponível, casos de outra organização são excluídos.
- A aba atual não expõe contexto confiável de organização no `AuthProvider`; por isso não foi inventado um filtro no frontend.
- URLs de documentos são validadas e somente `http`/`https` são transformadas em links.

Arquivos principais:

- `src/utils/goldenCasePrompt.ts`
- `src/utils/safeLearningUrl.ts`
- `src/views/EnsinarIA.tsx`

### 10. Métricas de assertividade

As métricas foram ampliadas para avaliar, além de cobertura textual:

- precisão e recall de findings;
- precisão de evidência;
- precisão de página;
- taxa de alucinação.

A validação completa de norma correta, consistência entre checklist e parecer e calibração única de thresholds continua recomendada como etapa de avaliação E2E.

## Testes adicionados ou ajustados

- fallback local explícito;
- escopo de aprendizado;
- URL segura;
- preview por organização;
- ranking contextual e fallback de concessionária;
- score e threshold documental;
- orçamento de contexto;
- métricas de assertividade.

## Validação executada

```text
npm test -- --run
94 testes passando em 26 arquivos

npm run lint
passou

npm run build
passou

npm --prefix functions run build
passou

git diff --check
passou
```

O build mantém warnings preexistentes de CSS inválido e bundle JavaScript acima de 500 kB.

## Validações não concluídas

- Firebase Emulator não estava configurado neste ambiente.
- `firebase deploy --only firestore:rules --dry-run` foi bloqueado por permissão externa (`403 The caller does not have permission`).
- Deploy real depende de autenticação/permissão válida no projeto Firebase.
- Embeddings persistidos de chunks documentais ainda não foram implementados.
- Fine Tuning não faz parte deste ciclo.

## Próximas melhorias recomendadas

1. Criar job assíncrono de ingestão de PDFs e embeddings por chunk.
2. Persistir versão do modelo de embedding e hash do chunk.
3. Calibrar threshold semântico com dataset avaliado.
4. Alinhar preview e execução real usando um seletor puro compartilhado no backend.
5. Adicionar testes no Firebase Emulator para regras e isolamento organizacional.
6. Consolidar thresholds de assertividade em uma política única por tipo e criticidade.
7. Adicionar avaliação E2E de evidência, página, norma, status técnico e alucinação.
