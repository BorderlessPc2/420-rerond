# Relatório de implementação — 21/09/2026

**Projeto:** 420-rerond (BaseInfra / Rerond)  
**Ambiente:** Firebase `rerond-c747b` + Netlify (front via push em `main`)  
**Commits do dia (main):**

| Hash | Mensagem |
|------|----------|
| `47c7838` | feat: fecha residual Sprints 9-12 (omissao seletiva, edicao e metricas) |
| `06a2636` | feat: amplia contexto da analise para documentos grandes |
| `33d12e5` | feat: fatia PDFs grandes e recupera de overflow de contexto |
| `43f9a3b` | fix: estabiliza analise com muitos PDFs e teto da API |

---

## 1. Residual Sprints 9–12

### Sprint 9 — Omissão seletiva de anexos
- Novo helper `functions/src/services/pipeline/documentPriority.ts`
- Prioriza memorial, planta, perfil, ART, requerimento etc. sobre anexos genéricos
- `aplicarLimitesPdf` no processor ordena por prioridade antes de cortar por quantidade/tamanho
- Motivos claros em `documentosOmitidos` (nunca silencioso)
- Testes unitários de prioridade e tamanho

### Sprint 11 — Edição completa
- Select de **organização** (`concessionariaId`) em `EditarSolicitacao`
- Ação **Substituir arquivo** (remove + upload na mesma ação) via `replaceArquivoSolicitacao`
- Histórico: troca de org e substituição de arquivo

### Sprint 12 — Métricas de assertividade
- `/metricas-ia`: média `assertividadeScore`, % críticos OK, n scored (por tipo + cards globais)
- Colunas equivalentes no CSV
- Docs `docs-ia/checklist_sprints.md` e `escopo.md` alinhados ao código

### UX do modal de análise (mesmo ciclo)
- Modal menor (~420px, não “tela cheia”)
- **Minimizar** → chip flutuante com %; libera navegação enquanto o job roda

---

## 2. Ampliação de contexto da IA

| Antes | Depois |
|--------|--------|
| Modelo fixo `gpt-4o` (~128k) | **`gpt-4.1`** (~1M); override `OPENAI_MODEL` |
| Estimativa PDF `bytes/3` (quase 1 PDF/lote) | **`bytes/40`** (vários PDFs no lote) |
| Lote ~80k tokens / 15 MB | Orçamento alto + depois ajustado ao teto API |
| Máx. 10 PDFs / 20 MB | **18 PDFs / 35 MB** |
| Multi-lote só concatenava parecer | **Síntese LLM** do parecer final |
| Saída 12–16k | **16–20k** tokens |
| Goldens 3 / feedbacks 8 | Goldens **5** / feedbacks **12** (blocos maiores) |

---

## 3. PDFs grandes — split estável

- Pacote `pdf-lib` + `functions/src/services/pipeline/pdfSplit.ts`
- PDF grande é **dividido por páginas** (até 8 partes, overlap de 1 página)
- Labels de parte: não marcar `INFORMACAO_AUSENTE` só porque o dado pode estar em outra parte
- Se a API ainda estourar contexto: **retry** fatiando de novo / 1 arquivo por chamada (até 2 níveis) **sem derrubar o job**
- Consolidação: merge de checklist + síntese de parecer
- Aviso em `documentosOmitidos`: `arquivo.pdf (dividido em N partes…)`

---

## 4. Estabilidade com muitos arquivos

Problema encontrado nos testes de stress: lote podia somar ~45 MB de PDFs **+ normas** e passar do teto OpenAI (~**50 MB/request**).

| Ajuste | Valor |
|--------|--------|
| Bytes por lote (só projeto) | **28 MB** (folga para normas) |
| Itens por lote | **máx. 6** |
| Fatia de PDF grande | ~**10 MB** / ~100k tokens estimados |
| Sync legado (`index.ts`) | Omissão por **prioridade** (igual ao job async) |

Testes novos: `manyFiles.stability.test.ts` + casos em `pipeline.test.ts` (25→18 PDFs, lotes ≤6, split/consolidação).

---

## 5. Verificação

- `npm run test:assertividade` — OK (29)
- Pipeline / stability — OK
- `functions` build — OK
- Push `main` → Netlify (front)
- `firebase deploy --only functions --project rerond-c747b` — OK (várias vezes no dia)

---

## 6. Fora desta leva (backlog consciente)

- RAG documental com embeddings de PDF de projeto
- Extração assistida de requisitos a partir de PDF de norma
- Filas extras além de `withRetry`
- Fine-tune
- Upgrade runtime Node 20 das Functions (aviso de decommissioning Oct/2026)

---

## 7. Como validar em produção

1. Solicitação com **muitos PDFs** (>18): memorial/planta entram; extras listados em omitidos  
2. Memorial **muito grande**: aviso de partes; análise completa e consolidada  
3. Durante análise: **minimizar** o modal e navegar  
4. `/metricas-ia`: cards de assertividade e críticos OK  
5. Editar solicitação: trocar org e substituir arquivo  

---

*Gerado em 21/09/2026.*
