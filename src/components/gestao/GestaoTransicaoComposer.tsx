import { useEffect, useMemo } from 'react'
import {
  aplicarIntencaoTransicao,
  descreverTransicao,
  listarEtapasPermitidas,
  listarSituacoesAlcancaveis,
  type IntencaoTransicao,
} from '../../services/gestaoTransicoes'
import type { Etapa, Ponto, Situacao } from '../../services/gestaoContratos'
import { nomeGestao } from '../../views/gestaoUi'

const etapasLabels: Etapa[] = ['planejamento', 'elaboracao', 'fase_1', 'fase_2', 'homologacao', 'concluido']

type GestaoTransicaoComposerProps = {
  etapaAtual: Etapa
  statusAtual: Situacao
  etapa: Etapa
  status: Situacao
  observacao: string
  pontosVinculados: Pick<Ponto, 'id' | 'codigo' | 'resultado'>[]
  onEtapaChange: (etapa: Etapa) => void
  onStatusChange: (status: Situacao) => void
  onIntencao?: (intencao: IntencaoTransicao) => void
  pontosPendentesHref?: string
  observacaoInputId?: string
}

const intencoes: { id: IntencaoTransicao; label: string; hidden?: (etapa: Etapa, status: Situacao) => boolean }[] = [
  { id: 'retomar_andamento', label: 'Retomar andamento', hidden: (_, status) => status === 'em_andamento' || status === 'concluido' },
  { id: 'correcao', label: 'Correção', hidden: (_, status) => status === 'em_correcao' },
  { id: 'paralisacao', label: 'Paralisar', hidden: (_, status) => status === 'paralisado' || status === 'concluido' },
  { id: 'avancar_etapa', label: 'Avançar etapa', hidden: (etapa) => etapa === 'concluido' },
  { id: 'concluir', label: 'Concluir', hidden: (etapa) => etapa === 'concluido' },
]

export default function GestaoTransicaoComposer({
  etapaAtual,
  statusAtual,
  etapa,
  status,
  observacao,
  pontosVinculados,
  onEtapaChange,
  onStatusChange,
  onIntencao,
  pontosPendentesHref,
  observacaoInputId = 'gestao-movimentacao-observacao',
}: GestaoTransicaoComposerProps) {
  const descricao = useMemo(
    () => descreverTransicao(etapaAtual, statusAtual, etapa, status, observacao, pontosVinculados),
    [etapa, etapaAtual, observacao, pontosVinculados, status, statusAtual],
  )
  const etapasPermitidas = useMemo(() => listarEtapasPermitidas(etapaAtual), [etapaAtual])
  const situacoesAlcancaveis = useMemo(
    () => listarSituacoesAlcancaveis(etapaAtual, statusAtual, etapa, observacao, pontosVinculados),
    [etapa, etapaAtual, observacao, pontosVinculados, statusAtual],
  )

  useEffect(() => {
    const atual = situacoesAlcancaveis.find((item) => item.situacao === status && item.disponivel)
    if (atual) return
    const fallback = situacoesAlcancaveis.find((item) => item.disponivel) ?? situacoesAlcancaveis[0]
    if (fallback && fallback.situacao !== status) onStatusChange(fallback.situacao)
  }, [etapa, onStatusChange, situacoesAlcancaveis, status])

  useEffect(() => {
    if (descricao.requerObservacao && !observacao.trim()) {
      document.getElementById(observacaoInputId)?.focus()
    }
  }, [descricao.requerObservacao, etapa, observacao, observacaoInputId, status])

  const aplicarIntencao = (intencao: IntencaoTransicao) => {
    const next = aplicarIntencaoTransicao(intencao, etapaAtual, statusAtual)
    onEtapaChange(next.etapa)
    onStatusChange(next.status)
    onIntencao?.(intencao)
    if (intencao === 'correcao' || intencao === 'paralisacao') {
      requestAnimationFrame(() => document.getElementById(observacaoInputId)?.focus())
    }
  }

  return (
    <div className={`gestao-transicao-composer ${descricao.valido ? 'is-valid' : 'is-invalid'}`}>
      <div className="gestao-transicao-intencoes" role="group" aria-label="Intenção da movimentação">
        {intencoes
          .filter((item) => !item.hidden?.(etapaAtual, statusAtual))
          .map((item) => (
            <button key={item.id} type="button" className="gestao-chip-intencao" onClick={() => aplicarIntencao(item.id)}>
              {item.label}
            </button>
          ))}
      </div>
      <div className="gestao-transicao-diff" aria-live="polite">
        <div>
          <span className="gestao-eyebrow">De</span>
          <span className={`gestao-status gestao-status-${descricao.de.status}`}>{nomeGestao(descricao.de.status)}</span>
          <small>{nomeGestao(descricao.de.etapa)}</small>
        </div>
        <span className="gestao-transicao-arrow" aria-hidden="true">
          →
        </span>
        <div>
          <span className="gestao-eyebrow">Para</span>
          <span className={`gestao-status gestao-status-${descricao.para.status}`}>{nomeGestao(descricao.para.status)}</span>
          <small>{nomeGestao(descricao.para.etapa)}</small>
        </div>
      </div>
      <div className="gestao-transicao-fields">
        <label>
          Etapa
          <select name="etapa" value={etapa} onChange={(event) => onEtapaChange(event.target.value as Etapa)}>
            {etapasLabels
              .filter((item) => etapasPermitidas.includes(item))
              .map((item) => (
                <option value={item} key={item}>
                  {nomeGestao(item)}
                </option>
              ))}
          </select>
        </label>
        <label>
          Situação
          <select name="status" value={status} onChange={(event) => onStatusChange(event.target.value as Situacao)}>
            {situacoesAlcancaveis.map((entry) => (
              <option value={entry.situacao} key={entry.situacao} disabled={!entry.disponivel} title={entry.motivo ?? undefined}>
                {nomeGestao(entry.situacao)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {descricao.erro ? (
        <p className="gestao-error gestao-transicao-feedback" role="alert">
          {descricao.erro}
        </p>
      ) : (
        <p className="gestao-transition-preview gestao-transicao-feedback" role="status">
          Transição permitida para registrar no histórico.
        </p>
      )}
      {descricao.para.etapa === 'concluido' && descricao.pontosSemResultado > 0 && (
        <p className="gestao-import-limit-hint">
          {descricao.pontosSemResultado} ponto(s) ainda sem resultado operacional.
          {pontosPendentesHref && (
            <>
              {' '}
              <a href={pontosPendentesHref}>Ver pontos vinculados</a>
            </>
          )}
        </p>
      )}
    </div>
  )
}
