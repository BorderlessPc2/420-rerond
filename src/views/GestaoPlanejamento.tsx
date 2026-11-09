import { useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import { atualizarPlanejamento, atualizarPlanejamentoPonto, pontoStatus, type Ponto } from '../services/gestaoContratos'
import PontoIconBar from '../components/gestao/PontoIconBar'
import PontoPainelModal from '../components/gestao/PontoPainelModal'
import type { PontoPainelTab } from '../components/gestao/pontoPainelTypes'
import type { GestaoContext } from './GestaoContratoDetalhe'
import { nomeGestao } from './gestaoUi'

export default function GestaoPlanejamento() {
  const { contratoId = '' } = useParams()
  const { protocolos, pontos, refresh } = useOutletContext<GestaoContext>()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [savingId, setSavingId] = useState('')
  const [painel, setPainel] = useState<{ ponto: Ponto; tab: PontoPainelTab } | null>(null)
  const painelPonto = painel ? pontos.find((item) => item.id === painel.ponto.id) ?? painel.ponto : null

  const openPainel = (ponto: Ponto, tab: PontoPainelTab) => {
    setPainel({ ponto, tab })
    setError('')
  }

  const save = async (unit: 'protocolo' | 'ponto', id: string, event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (savingId) return
    const data = new FormData(event.currentTarget)
    const previsto = String(data.get('previsto') ?? '')
    const realizado = String(data.get('realizado') ?? '')
    setSavingId(id)
    try {
      if (unit === 'protocolo') await atualizarPlanejamento(contratoId, id, previsto, realizado)
      else await atualizarPlanejamentoPonto(contratoId, id, previsto, realizado)
      await refresh()
      setError('')
      setNotice(unit === 'protocolo' ? 'Prazo do protocolo salvo.' : 'Prazo do ponto salvo.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar planejamento.')
    } finally {
      setSavingId('')
    }
  }

  return (
    <section>
      <div className="gestao-section-head">
        <div>
          <h2>Planejamento</h2>
          <p>Grave a previsão e a realização. Use os ícones do ponto para situação e demais dados.</p>
        </div>
      </div>
      {error && <p className="gestao-error" role="alert">{error}</p>}
      {notice && <p className="gestao-success" role="status">{notice}</p>}

      <PontoPainelModal
        open={Boolean(painelPonto)}
        contratoId={contratoId}
        ponto={painelPonto}
        protocolos={protocolos}
        initialTab={painel?.tab ?? 'planejamento'}
        onClose={() => setPainel(null)}
        refresh={refresh}
        onNotice={(message) => { setNotice(message); setError('') }}
        onError={(message) => { if (message) setError(message) }}
      />

      <h3>
        Protocolos <span className="gestao-count">{protocolos.length}</span>
      </h3>
      {protocolos.length ? (
        <ul className="gestao-planning-list">
          {protocolos.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.titulo}</strong>
                <small>
                  {item.rodovia} · {item.concessionaria}
                </small>
              </div>
              <form className="gestao-form" onSubmit={(e) => void save('protocolo', item.id, e)}>
                <label>
                  Previsto
                  <input name="previsto" type="date" defaultValue={item.previsao ?? ''} key={`${item.id}-p-${item.previsao}`} />
                </label>
                <label>
                  Realizado
                  <input name="realizado" type="date" defaultValue={item.realizadoEm ?? ''} key={`${item.id}-r-${item.realizadoEm}`} />
                </label>
                <button type="submit" disabled={savingId === item.id}>{savingId === item.id ? 'Salvando…' : 'Salvar protocolo'}</button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="gestao-empty">Nenhum protocolo neste recorte.</p>
      )}

      <h3>
        Pontos <span className="gestao-count">{pontos.length}</span>
      </h3>
      {pontos.length ? (
        <ul className="gestao-planning-list">
          {pontos.map((item) => {
            const proc = protocolos.find((p) => p.id === item.protocoloId)
            const situacao = pontoStatus(item, proc)
            return (
              <li key={item.id}>
                <div className="gestao-point-row-meta">
                  <strong>{item.codigo}</strong>
                  <small>
                    {item.estado} · {item.rodovia} km {item.km}
                  </small>
                  <span className={`gestao-status gestao-point-status-pill${item.resultado ? ' gestao-point-status-pill-ok' : ''}`}>
                    {nomeGestao(situacao.valor)}
                  </span>
                </div>
                <div className="gestao-point-row-aside">
                  <PontoIconBar contratoId={contratoId} ponto={item} protocolo={proc} onOpenPainel={(tab) => openPainel(item, tab)} />
                </div>
                <form className="gestao-form gestao-planning-inline" onSubmit={(e) => void save('ponto', item.id, e)}>
                  <label>
                    Previsto
                    <input name="previsto" type="date" defaultValue={item.previsao ?? ''} key={`${item.id}-p-${item.previsao}`} />
                  </label>
                  <label>
                    Realizado
                    <input name="realizado" type="date" defaultValue={item.realizadoEm ?? ''} key={`${item.id}-r-${item.realizadoEm}`} />
                  </label>
                  <button type="submit" disabled={savingId === item.id}>{savingId === item.id ? 'Salvando…' : 'Salvar datas'}</button>
                </form>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="gestao-empty">Nenhum ponto neste recorte.</p>
      )}
    </section>
  )
}
