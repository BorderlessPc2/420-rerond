# Plano de Robustez e Assertividade da IA

## Objetivo

Aumentar a assertividade da IA sem fine-tune nesta etapa, usando melhor os golden cases validados pelo cliente, feedbacks aprovados, contexto documental relevante e métricas objetivas.

## Baseline

A assertividade passa a ser acompanhada por tipo de análise, com sinais complementares:

- score médio produzido pelo avaliador interno;
- percentual de itens críticos considerados corretos;
- percentual de análises que exigiram correção humana;
- percentual de apontamentos com evidência completa;
- quantidade de itens frágeis por falta de evidência, localização, justificativa ou norma.

O cliente continua validando os golden cases. A equipe técnica usa esses sinais para comparar versões do pipeline antes e depois de cada mudança.

## Primeira implementação

- Métricas puras de assertividade para baseline reprodutível.
- Ranking contextual de golden cases e feedbacks por tipo de análise, organização, concessionária e similaridade textual.
- Verificador de evidência do checklist consolidado.
- Persistência de `evidenceVerification` na solicitação, versão da análise e job.
- Extração textual best-effort dos PDFs priorizados, recuperação de chunks documentais e injeção do bloco RAG no prompt final.
- Exposição de evidência completa, itens frágeis, chunks RAG e complementos humanos em `/metricas-ia`.
