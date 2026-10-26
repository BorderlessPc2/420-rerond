import { useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import { atualizarPlanejamento, atualizarPlanejamentoPonto } from '../services/gestaoContratos'
import type { GestaoContext } from './GestaoContratoDetalhe'

export default function GestaoPlanejamento() {
  const { contratoId = '' } = useParams()
  const { protocolos, pontos, refresh } = useOutletContext<GestaoContext>()
  const [error, setError] = useState('')
  const save = async (unit: 'protocolo' | 'ponto', id: string, event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const previsto = String(data.get('previsto') ?? ''), realizado = String(data.get('realizado') ?? '')
    try { if (unit === 'protocolo') await atualizarPlanejamento(contratoId, id, previsto, realizado); else await atualizarPlanejamentoPonto(contratoId, id, previsto, realizado); await refresh(); setError('') } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao salvar planejamento.') }
  }
  return <section><div className="gestao-section-head"><div><h2>Planejamento</h2><p>Previsão e entrega registradas separadamente para protocolos e pontos.</p></div></div>{error && <p className="gestao-error" role="alert">{error}</p>}
    <h3>Protocolos <span className="gestao-count">{protocolos.length}</span></h3>{protocolos.length ? <ul className="gestao-planning-list">{protocolos.map((item) => <li key={item.id}><div><strong>{item.titulo}</strong><small>{item.rodovia} · {item.concessionaria}</small></div><form className="gestao-form" onSubmit={(e) => void save('protocolo', item.id, e)}><label>Previsto<input name="previsto" type="date" defaultValue={item.previsao ?? ''} key={`${item.id}-p-${item.previsao}`} /></label><label>Realizado<input name="realizado" type="date" defaultValue={item.realizadoEm ?? ''} key={`${item.id}-r-${item.realizadoEm}`} /></label><button type="submit">Salvar protocolo</button></form></li>)}</ul> : <p className="gestao-empty">Nenhum protocolo neste recorte.</p>}
    <h3>Pontos <span className="gestao-count">{pontos.length}</span></h3>{pontos.length ? <ul className="gestao-planning-list">{pontos.map((item) => <li key={item.id}><div><strong>{item.codigo}</strong><small>{item.estado} · {item.rodovia} km {item.km}</small></div><form className="gestao-form" onSubmit={(e) => void save('ponto', item.id, e)}><label>Previsto<input name="previsto" type="date" defaultValue={item.previsao ?? ''} key={`${item.id}-p-${item.previsao}`} /></label><label>Realizado<input name="realizado" type="date" defaultValue={item.realizadoEm ?? ''} key={`${item.id}-r-${item.realizadoEm}`} /></label><button type="submit">Salvar ponto</button></form></li>)}</ul> : <p className="gestao-empty">Nenhum ponto neste recorte.</p>}
  </section>
}
