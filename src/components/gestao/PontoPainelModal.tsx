import { useEffect, useId, useState } from 'react'
import {
  atualizarPonto,
  atualizarPontoCompleto,
  atualizarPlanejamentoPonto,
  vincularPontoProtocolo,
  pontoStatus,
  type Ponto,
  type Protocolo,
} from '../../services/gestaoContratos'
import type { PontoInput } from '../../services/gestaoValidacao'
import ModalGestao from './ModalGestao'
import { getPontoDetailSummary, getPontoStatusOptions } from '../../views/gestaoMapaHelpers'
import { nomeGestao } from '../../views/gestaoUi'
import GestaoEtapaStepper from './GestaoEtapaStepper'
import type { PontoPainelTab } from './pontoPainelTypes'

function SaveButton({ saving, state, label, disabled = false }: { saving: boolean; state?: 'success' | 'error'; label: string; disabled?: boolean }) {
  return <button type="submit" className={`gestao-save-button${state ? ` gestao-save-button-${state}` : ''}`} disabled={disabled || saving}>{saving ? 'Salvando…' : state === 'success' ? '✓ Salvo' : state === 'error' ? '× Não salvou' : label}</button>
}

function SaveFeedback({ state, message }: { state?: 'success' | 'error'; message: string }) {
  return state ? <p className={`gestao-save-feedback gestao-save-feedback-${state}`} role={state === 'error' ? 'alert' : 'status'}>{message}</p> : null
}

type PontoPainelModalProps = {
  open: boolean
  contratoId: string
  ponto: Ponto | null
  protocolos: Protocolo[]
  initialTab?: PontoPainelTab
  onClose: () => void
  refresh: () => Promise<void>
  onNotice?: (message: string) => void
  onError?: (message: string) => void
}

const TABS: { id: PontoPainelTab; label: string }[] = [
  { id: 'dados', label: 'Dados' },
  { id: 'situacao', label: 'Situação' },
  { id: 'planejamento', label: 'Planejamento' },
  { id: 'vinculo', label: 'Vínculo' },
]

export default function PontoPainelModal({
  open,
  contratoId,
  ponto,
  protocolos,
  initialTab = 'dados',
  onClose,
  refresh,
  onNotice,
  onError,
}: PontoPainelModalProps) {
  const modalTitleId = useId()
  const [tab, setTab] = useState<PontoPainelTab>(initialTab)
  const [saving, setSaving] = useState(false)
  const [saveState, setSaveState] = useState<'success' | 'error' | undefined>()

  const [editCodigo, setEditCodigo] = useState('')
  const [editEstado, setEditEstado] = useState('')
  const [editKm, setEditKm] = useState('')
  const [editTipo, setEditTipo] = useState<Ponto['tipo']>('nova_implantacao')
  const [editLatitude, setEditLatitude] = useState('')
  const [editLongitude, setEditLongitude] = useState('')
  const [editPrecisao, setEditPrecisao] = useState<Ponto['precisao']>('confirmada')
  const [resultado, setResultado] = useState<Ponto['resultado'] | ''>('')
  const [previsao, setPrevisao] = useState('')
  const [realizadoEm, setRealizadoEm] = useState('')
  const [vinculoId, setVinculoId] = useState('')

  const protocolo = ponto?.protocoloId ? protocolos.find((item) => item.id === ponto.protocoloId) : undefined

  useEffect(() => {
    if (!open || !ponto) return
    setTab(initialTab)
    setSaveState(undefined)
    setEditCodigo(ponto.codigo)
    setEditEstado(ponto.estado)
    setEditKm(ponto.km)
    setEditTipo(ponto.tipo)
    setEditLatitude(Number.isFinite(ponto.latitude) ? String(ponto.latitude) : '')
    setEditLongitude(Number.isFinite(ponto.longitude) ? String(ponto.longitude) : '')
    setEditPrecisao(ponto.precisao ?? 'confirmada')
    setResultado(ponto.resultado ?? '')
    setPrevisao(ponto.previsao ?? '')
    setRealizadoEm(ponto.realizadoEm ?? '')
    setVinculoId(ponto.protocoloId ?? '')
  }, [open, ponto, initialTab])

  if (!ponto) return null

  const situacao = pontoStatus(ponto, protocolo)
  const resumo = getPontoDetailSummary(ponto, protocolo)

  const fail = (err: unknown) => {
    setSaveState('error')
    onError?.(err instanceof Error ? err.message : 'Erro ao salvar ponto.')
  }

  const beginSave = () => {
    setSaveState(undefined)
    setSaving(true)
  }

  const finishSave = (message: string) => {
    setSaveState('success')
    onNotice?.(message)
    onError?.('')
  }

  const saveDados = async (event: React.FormEvent) => {
    event.preventDefault()
    if (Boolean(editLatitude) !== Boolean(editLongitude)) {
      onError?.('Informe latitude e longitude juntas.')
      return
    }
    const proc = ponto.protocoloId ? protocolos.find((item) => item.id === ponto.protocoloId) : undefined
    const input: PontoInput = {
      codigo: editCodigo,
      estado: editEstado,
      km: editKm,
      tipo: editTipo,
      concessionaria: proc?.concessionaria ?? ponto.concessionaria,
      rodovia: proc?.rodovia ?? ponto.rodovia,
      previsao,
      realizadoEm,
      ...(editLatitude && editLongitude
        ? { latitude: Number(editLatitude), longitude: Number(editLongitude), precisao: editPrecisao }
        : {}),
    }
    beginSave()
    try {
      await atualizarPontoCompleto(contratoId, ponto.id, input)
      await refresh()
      finishSave(`Ponto ${input.codigo} atualizado.`)
    } catch (err) {
      fail(err)
    } finally {
      setSaving(false)
    }
  }

  const saveSituacao = async (event: React.FormEvent) => {
    event.preventDefault()
    beginSave()
    try {
      const patch = resultado
        ? { resultado: resultado as Ponto['resultado'] }
        : { resultado: undefined as undefined }
      await atualizarPonto(contratoId, ponto.id, patch)
      await refresh()
      finishSave(`Situação de ${ponto.codigo} atualizada.`)
    } catch (err) {
      fail(err)
    } finally {
      setSaving(false)
    }
  }

  const savePlanejamento = async (event: React.FormEvent) => {
    event.preventDefault()
    beginSave()
    try {
      await atualizarPlanejamentoPonto(contratoId, ponto.id, previsao, realizadoEm)
      await refresh()
      finishSave(`Planejamento de ${ponto.codigo} salvo.`)
    } catch (err) {
      fail(err)
    } finally {
      setSaving(false)
    }
  }

  const saveVinculo = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!vinculoId) {
      onError?.('Selecione um protocolo.')
      return
    }
    beginSave()
    try {
      await vincularPontoProtocolo(contratoId, ponto.id, vinculoId)
      await refresh()
      finishSave(`Ponto ${ponto.codigo} vinculado.`)
    } catch (err) {
      fail(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalGestao
      open={open}
      title={ponto.codigo}
      description={`${resumo.local} · ${resumo.classificacao}${protocolo ? ` · ${protocolo.titulo}` : ''}`}
      labelledBy={modalTitleId}
      onClose={onClose}
    >
      <div className="gestao-ponto-painel">
        <p className="gestao-ponto-painel-status">
          <span className="gestao-status">{nomeGestao(situacao.valor)}</span>
          {situacao.herdado && ponto.protocoloId ? <small> · herdado do protocolo</small> : null}
        </p>
        {protocolo && (
          <section className="gestao-ponto-planejamento" aria-label="Fases do planejamento do protocolo">
            <div className="gestao-ponto-planejamento-head">
              <div>
                <span className="gestao-eyebrow">Planejamento do protocolo</span>
                <strong>{nomeGestao(protocolo.etapa)}</strong>
              </div>
              <small>Etapa herdada do protocolo</small>
            </div>
            <GestaoEtapaStepper etapa={protocolo.etapa} status={protocolo.status} />
          </section>
        )}
        <div className="gestao-ponto-painel-tabs" role="tablist" aria-label="Seções do ponto">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={tab === item.id ? 'is-active' : ''}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'dados' && (
          <form className="gestao-form gestao-form-grid" role="tabpanel" onSubmit={(event) => void saveDados(event)}>
            <label>
              Código
              <input name="codigo" required value={editCodigo} onChange={(e) => setEditCodigo(e.target.value)} />
            </label>
            <label>
              Estado
              <input name="estado" required value={editEstado} onChange={(e) => setEditEstado(e.target.value)} />
            </label>
            <label>
              Quilômetro
              <input name="km" required value={editKm} onChange={(e) => setEditKm(e.target.value)} />
            </label>
            <label>
              Classificação
              <select name="tipo" value={editTipo} onChange={(e) => setEditTipo(e.target.value as Ponto['tipo'])}>
                <option value="nova_implantacao">Nova implantação</option>
                <option value="regularizacao">Regularização</option>
              </select>
            </label>
            <label>
              Latitude
              <input name="latitude" type="number" step="any" value={editLatitude} onChange={(e) => setEditLatitude(e.target.value)} />
            </label>
            <label>
              Longitude
              <input name="longitude" type="number" step="any" value={editLongitude} onChange={(e) => setEditLongitude(e.target.value)} />
            </label>
            <label>
              Precisão
              <select name="precisao" value={editPrecisao} onChange={(e) => setEditPrecisao(e.target.value as Ponto['precisao'])}>
                <option value="confirmada">Confirmada</option>
                <option value="aproximada">Aproximada</option>
              </select>
            </label>
            {ponto.protocoloId && (
              <p className="gestao-ponto-painel-hint">
                <small>Concessionária e rodovia seguem o protocolo vinculado. Troque o vínculo na aba Vínculo.</small>
              </p>
            )}
            <div className="gestao-form-footer">
              <button type="button" className="gestao-button-secondary" onClick={onClose}>Fechar</button>
              <SaveButton saving={saving} state={saveState} label="Salvar dados" />
            </div>
            <SaveFeedback state={saveState} message={saveState === 'success' ? '✓ Dados do ponto salvos.' : '× Não foi possível salvar ponto. Tente novamente.'} />
          </form>
        )}

        {tab === 'situacao' && (
          <form className="gestao-form" role="tabpanel" onSubmit={(event) => void saveSituacao(event)}>
            <label htmlFor="gestao-painel-resultado">
              Resultado operacional
              <select
                id="gestao-painel-resultado"
                value={resultado}
                onChange={(e) => setResultado((e.target.value || '') as Ponto['resultado'] | '')}
              >
                {getPontoStatusOptions(ponto).map((option) => (
                  <option value={option.value} key={option.value || 'pendente'}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="gestao-ponto-painel-hint">
              <small>Vazio = exibição herdada do status do protocolo ({nomeGestao(protocolo?.status ?? 'nao_iniciado')}).</small>
            </p>
            <div className="gestao-form-footer">
              <button type="button" className="gestao-button-secondary" onClick={onClose}>
                Cancelar
              </button>
              <SaveButton saving={saving} state={saveState} label="Salvar situação" />
            </div>
            <SaveFeedback state={saveState} message={saveState === 'success' ? '✓ Situação do ponto salva.' : '× Não foi possível salvar situação. Tente novamente.'} />
          </form>
        )}

        {tab === 'planejamento' && (
          <form className="gestao-form gestao-form-grid" role="tabpanel" onSubmit={(event) => void savePlanejamento(event)}>
            <label>
              Previsto
              <input name="previsao" type="date" value={previsao} onChange={(e) => setPrevisao(e.target.value)} />
            </label>
            <label>
              Realizado
              <input name="realizadoEm" type="date" value={realizadoEm} onChange={(e) => setRealizadoEm(e.target.value)} />
            </label>
            <div className="gestao-form-footer">
              <button type="button" className="gestao-button-secondary" onClick={onClose}>
                Cancelar
              </button>
              <SaveButton saving={saving} state={saveState} label="Salvar planejamento" />
            </div>
            <SaveFeedback state={saveState} message={saveState === 'success' ? '✓ Planejamento do ponto salvo.' : '× Não foi possível salvar planejamento. Tente novamente.'} />
          </form>
        )}

        {tab === 'vinculo' && (
          <form className="gestao-form" role="tabpanel" onSubmit={(event) => void saveVinculo(event)}>
            {ponto.protocoloId ? (
              <p>
                Vinculado a <strong>{protocolo?.titulo ?? ponto.protocoloId}</strong> · {ponto.concessionaria} · {ponto.rodovia}
              </p>
            ) : (
              <p>Nenhum protocolo vinculado. Escolha um para alinhar concessionária e rodovia.</p>
            )}
            <label>
              Protocolo
              <select value={vinculoId} required onChange={(e) => setVinculoId(e.target.value)}>
                <option value="">Selecionar protocolo</option>
                {protocolos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.titulo} · {item.rodovia}
                  </option>
                ))}
              </select>
            </label>
            <div className="gestao-form-footer">
              <button type="button" className="gestao-button-secondary" onClick={onClose}>
                Cancelar
              </button>
              <SaveButton saving={saving} state={saveState} label={ponto.protocoloId ? 'Alterar vínculo' : 'Vincular'} disabled={saving || !vinculoId || vinculoId === ponto.protocoloId} />
            </div>
            <SaveFeedback state={saveState} message={saveState === 'success' ? '✓ Vínculo do ponto salvo.' : '× Não foi possível salvar vínculo. Tente novamente.'} />
          </form>
        )}

      </div>
    </ModalGestao>
  )
}
