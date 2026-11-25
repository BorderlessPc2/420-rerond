import { useEffect, useMemo, useState } from 'react'
import ModalGestao from './ModalGestao'
import { atualizarPreferenciasIndicadoresContrato } from '../../services/gestaoContratos'
import {
  dashboardConfigPadrao,
  mesclarDashboardConfig,
  sanitizarDashboardConfig,
  type GestaoDashboardConfig,
} from '../../services/gestaoDashboardConfig'
import {
  gerarIdStatusPersonalizado,
  listarStatusContrato,
  sanitizarStatusPersonalizados,
  type StatusPersonalizado,
} from '../../services/gestaoStatusCatalogo'
import { rotuloStatusDashboard } from '../../services/gestaoDashboardConfig'

type Props = {
  open: boolean
  contratoId: string
  value?: GestaoDashboardConfig | null
  statusPersonalizados?: StatusPersonalizado[] | null
  onClose: () => void
  onSaved: () => void
}

function toggleLista(lista: string[], status: string) {
  return lista.includes(status) ? lista.filter((item) => item !== status) : [...lista, status]
}

export default function GestaoDashboardPersonalizarModal({
  open,
  contratoId,
  value,
  statusPersonalizados,
  onClose,
  onSaved,
}: Props) {
  const [draft, setDraft] = useState<GestaoDashboardConfig>(dashboardConfigPadrao())
  const [statusDraft, setStatusDraft] = useState<StatusPersonalizado[]>([])
  const [novoLabel, setNovoLabel] = useState('')
  const [novaCor, setNovaCor] = useState('#5b6ee1')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const todosStatus = useMemo(() => listarStatusContrato(statusDraft), [statusDraft])

  useEffect(() => {
    if (!open) return
    setStatusDraft(statusPersonalizados ? [...statusPersonalizados] : [])
    setDraft(mesclarDashboardConfig(value, statusPersonalizados ?? undefined))
    setNovoLabel('')
    setNovaCor('#5b6ee1')
    setError('')
  }, [open, value, statusPersonalizados])

  useEffect(() => {
    if (!open) return
    setDraft((atual) => ({
      ...atual,
      statusVisiveis: (atual.statusVisiveis ?? []).filter((item) => todosStatus.includes(item)),
      previstoStatus: (atual.previstoStatus ?? []).filter((item) => todosStatus.includes(item)),
      realizadoStatus: (atual.realizadoStatus ?? []).filter((item) => todosStatus.includes(item)),
    }))
  }, [open, todosStatus])

  const atualizarRotulo = (status: string, rotulo: string) => {
    setDraft((atual) => ({
      ...atual,
      rotulosStatus: { ...atual.rotulosStatus, [status]: rotulo },
    }))
  }

  const restaurarPadrao = () => {
    setStatusDraft([])
    setDraft(dashboardConfigPadrao())
  }

  const adicionarStatus = () => {
    const label = novoLabel.trim()
    if (!label) {
      setError('Informe o nome do novo status.')
      return
    }
    const existentes = listarStatusContrato(statusDraft)
    const id = gerarIdStatusPersonalizado(label, existentes)
    const novo: StatusPersonalizado = { id, label, color: novaCor.trim() || undefined }
    setStatusDraft((atual) => [...atual, novo])
    setDraft((atual) => ({
      ...atual,
      statusVisiveis: toggleLista(atual.statusVisiveis ?? [], id),
      previstoStatus: toggleLista(atual.previstoStatus ?? [], id),
      realizadoStatus: toggleLista(atual.realizadoStatus ?? [], id),
    }))
    setNovoLabel('')
    setError('')
  }

  const removerStatus = (id: string) => {
    setStatusDraft((atual) => atual.filter((item) => item.id !== id))
    setDraft((atual) => ({
      ...atual,
      statusVisiveis: (atual.statusVisiveis ?? []).filter((item) => item !== id),
      previstoStatus: (atual.previstoStatus ?? []).filter((item) => item !== id),
      realizadoStatus: (atual.realizadoStatus ?? []).filter((item) => item !== id),
    }))
  }

  const salvar = async (event: React.FormEvent) => {
    event.preventDefault()
    const visiveis = draft.statusVisiveis?.length ?? 0
    if (!visiveis) {
      setError('Selecione ao menos um status para o gráfico.')
      return
    }
    if (!(draft.previstoStatus?.length) || !(draft.realizadoStatus?.length)) {
      setError('Selecione ao menos um status em Previsto e em Realizado.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const catalogo = sanitizarStatusPersonalizados(statusDraft)
      await atualizarPreferenciasIndicadoresContrato(contratoId, {
        dashboardConfig: sanitizarDashboardConfig(draft, catalogo),
        statusPersonalizados: catalogo,
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  const linhaStatus = (
    status: string,
    lista: string[],
    onLista: (next: string[]) => void,
    mostrarRotulo = false,
  ) => (
    <li key={status} className="gestao-dash-pref-row">
      <label className="gestao-dash-pref-check">
        <input
          type="checkbox"
          checked={lista.includes(status)}
          onChange={() => onLista(toggleLista(lista, status))}
        />
        <span>{rotuloStatusDashboard(status, draft, statusDraft)}</span>
      </label>
      {mostrarRotulo && (
        <input
          type="text"
          className="gestao-dash-pref-label"
          placeholder="Rótulo no gráfico (opcional)"
          value={draft.rotulosStatus?.[status] ?? ''}
          onChange={(event) => atualizarRotulo(status, event.target.value)}
          disabled={!lista.includes(status)}
          maxLength={80}
        />
      )}
    </li>
  )

  return (
    <ModalGestao
      open={open}
      title="Personalizar indicadores"
      description="Crie status sob medida para este contrato e escolha o que entra no gráfico e no Previsto x realizado."
      labelledBy="gestao-dashboard-pref-title"
      onClose={onClose}
    >
      <form className="gestao-form gestao-dash-pref-form" onSubmit={(event) => void salvar(event)}>
        {error && <p className="gestao-error" role="alert">{error}</p>}

        <section className="gestao-dash-pref-section">
          <h3>Status personalizados</h3>
          <p>Cada contrato pode ter status exclusivos. Eles aparecem em protocolos, filtros e indicadores.</p>
          <div className="gestao-dash-pref-add">
            <label>
              Nome do status
              <input type="text" value={novoLabel} onChange={(event) => setNovoLabel(event.target.value)} maxLength={80} placeholder="Ex.: Aguardando cliente" />
            </label>
            <label>
              Cor no gráfico
              <input type="color" value={novaCor} onChange={(event) => setNovaCor(event.target.value)} />
            </label>
            <button type="button" className="gestao-button-secondary" onClick={adicionarStatus}>Criar status</button>
          </div>
          {statusDraft.length ? (
            <ul className="gestao-dash-pref-custom-list">
              {statusDraft.map((item) => (
                <li key={item.id}>
                  <span className="gestao-dash-pref-swatch" style={{ background: item.color ?? '#5b6ee1' }} aria-hidden />
                  <span><strong>{item.label}</strong><small>{item.id}</small></span>
                  <button type="button" className="gestao-button-link" onClick={() => removerStatus(item.id)}>Remover</button>
                </li>
              ))}
            </ul>
          ) : <p className="gestao-dash-pref-hint">Nenhum status personalizado ainda.</p>}
        </section>

        <section className="gestao-dash-pref-section">
          <h3>Status no gráfico</h3>
          <p>Desmarque o que não é útil para este cliente. Você pode renomear o rótulo exibido.</p>
          <ul className="gestao-dash-pref-list">
            {todosStatus.map((status) =>
              linhaStatus(status, draft.statusVisiveis ?? [], (next) => setDraft((atual) => ({ ...atual, statusVisiveis: next })), true),
            )}
          </ul>
        </section>

        <section className="gestao-dash-pref-section">
          <h3>Previsto x realizado</h3>
          <fieldset className="gestao-dash-pref-base">
            <legend>Contar por</legend>
            <label>
              <input
                type="radio"
                name="gestao-dash-base"
                checked={(draft.previstoRealizadoBase ?? 'ponto') === 'ponto'}
                onChange={() => setDraft((atual) => ({ ...atual, previstoRealizadoBase: 'ponto' }))}
              />
              Pontos (data de previsão / realização no ponto)
            </label>
            <label>
              <input
                type="radio"
                name="gestao-dash-base"
                checked={draft.previstoRealizadoBase === 'protocolo'}
                onChange={() => setDraft((atual) => ({ ...atual, previstoRealizadoBase: 'protocolo' }))}
              />
              Protocolos (data de previsão / realização no protocolo)
            </label>
          </fieldset>
          <div className="gestao-dash-pref-columns">
            <div>
              <h4>Entram em “Previstas”</h4>
              <ul className="gestao-dash-pref-list gestao-dash-pref-list-compact">
                {todosStatus.map((status) =>
                  linhaStatus(status, draft.previstoStatus ?? [], (next) => setDraft((atual) => ({ ...atual, previstoStatus: next }))),
                )}
              </ul>
            </div>
            <div>
              <h4>Entram em “Realizadas”</h4>
              <ul className="gestao-dash-pref-list gestao-dash-pref-list-compact">
                {todosStatus.map((status) =>
                  linhaStatus(status, draft.realizadoStatus ?? [], (next) => setDraft((atual) => ({ ...atual, realizadoStatus: next }))),
                )}
              </ul>
            </div>
          </div>
        </section>

        <div className="gestao-form-footer gestao-dash-pref-footer">
          <button type="button" className="gestao-button-secondary" onClick={restaurarPadrao} disabled={saving}>
            Restaurar padrão
          </button>
          <button type="button" className="gestao-button-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar personalização'}</button>
        </div>
      </form>
    </ModalGestao>
  )
}