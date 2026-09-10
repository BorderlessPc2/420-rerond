# Casos de teste mínimos — Sprint 5 (isolamento por tipo)

> Validação empírica com OpenAI fica pendente de chave/deploy.  
> Estes casos definem a expectativa de **não misturar** checklists entre domínios.  
> Tipologias POC/PPU/PAC por fase alinhadas à avaliação Baseinfra (09/09).

## Convenção de IDs

| Prefixo | Domínio / tipoAnaliseId |
|---------|-------------------------|
| `OCUP_*` | Ocupação (`ocupacao-faixa`) |
| `ACESSO_*` | Acessos (`acesso`) |
| `PAC_*` | PAC genérico (`pac`) |
| `POC_*` | POC (`poc`) |
| `PPU_*` | PPU / publicidade (`ppu`) |
| `PACV_*` | PAC viabilidade (`pac-viabilidade`) |
| `PACE_*` | PAC executivo (`pac-executivo`) |

## Caso 1 — Ocupação

- **tipoAnaliseId:** `ocupacao-faixa`
- **Entrada:** solicitação com memorial/planta de ocupação (ou mock documental)
- **Esperado no checklist:** somente IDs `OCUP_*`
- **Proibido:** qualquer `ACESSO_*`, `PAC_*`, `POC_*`, `PPU_*`, `PACV_*`, `PACE_*`

## Caso 2 — Acesso

- **tipoAnaliseId:** `acesso`
- **Entrada:** solicitação de acesso à propriedade lindeira
- **Esperado:** somente IDs `ACESSO_*`
- **Proibido:** outros prefixos de domínio

## Caso 3 — PAC (genérico)

- **tipoAnaliseId:** `pac`
- **Entrada:** solicitação de plano de adequação / PAC
- **Esperado:** somente IDs `PAC_*` (não `PACV_*` / `PACE_*` se o seed genérico usar só `PAC_*`)
- **Proibido:** `OCUP_*`, `ACESSO_*`, `POC_*`, `PPU_*`

## Caso 4 — POC

- **tipoAnaliseId:** `poc`
- **Entrada:** projeto de ocupação / POC conforme material do cliente
- **Esperado:** somente IDs `POC_*`
- **Proibido:** checklist de PPU ou PAC fase errada

## Caso 5 — PPU

- **tipoAnaliseId:** `ppu`
- **Entrada:** publicidade / estrutura de sustentação
- **Esperado:** somente IDs `PPU_*`
- **Proibido:** itens exclusivos de POC/PAC/ocupação

## Caso 6 — PAC viabilidade

- **tipoAnaliseId:** `pac-viabilidade`
- **Entrada:** fase de viabilidade
- **Esperado:** somente IDs `PACV_*` (ou o prefixo do seed da fase)
- **Proibido:** requisitos exclusivos do executivo (`PACE_*`)

## Caso 7 — PAC executivo

- **tipoAnaliseId:** `pac-executivo`
- **Entrada:** projeto executivo / disciplinas
- **Esperado:** somente IDs `PACE_*` (ou prefixo do seed da fase)
- **Proibido:** checklist só de viabilidade como se bastasse para executivo

## Como verificar (após deploy + OpenAI)

1. Criar/editar solicitação com o `tipoAnaliseId` do caso.
2. Rodar análise.
3. Inspecionar `checklistConformidade` / relatório: cada `item` deve respeitar o prefixo do domínio.
4. Confirmar no header do relatório o **Tipo de análise** exibido.

## Critério de aceite Sprint 5

- Casos 1–7 passam no isolamento de IDs.
- Relatório identifica o tipo usado (`tipoAnaliseNomeUsado`).
- Apontamentos seguem instrução de evidência + localização + justificativa + norma (amostra manual).
