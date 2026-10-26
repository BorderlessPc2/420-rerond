import { useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { atualizarPonto, pontoStatus, type Ponto } from '../services/gestaoContratos'
import type { GestaoContext } from './GestaoContratoDetalhe'

export default function GestaoMapa() {
  const { contratoId = '' } = useParams()
  const { pontos, protocolos, refresh } = useOutletContext<GestaoContext>()
  const [selected, setSelected] = useState<Ponto | null>(null), [error, setError] = useState('')
  const geolocated = pontos.filter((p) => p.latitude !== undefined && p.longitude !== undefined)
  const pending = pontos.filter((p) => p.latitude === undefined || p.longitude === undefined)
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected) return
    const form = new FormData(event.currentTarget)
    try { await atualizarPonto(contratoId, selected.id, { latitude: Number(form.get('latitude')), longitude: Number(form.get('longitude')), precisao: form.get('precisao') as Ponto['precisao'] }); await refresh(); setSelected(null); setError('') } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao salvar coordenadas.') }
  }
  return <section><div className="gestao-section-head"><div><h2>Mapa esquemático</h2><p>Coordenadas disponíveis neste recorte. Marcadores aproximados são indicados.</p></div><span className="gestao-count">{geolocated.length} localizados · {pending.length} pendentes</span></div>{error && <p className="gestao-error" role="alert">{error}</p>}
    <div className="gestao-map" aria-label={`Representação esquemática de ${geolocated.length} pontos no Brasil`}>
      {geolocated.map((p) => { const situacao = pontoStatus(p, protocolos.find((item) => item.id === p.protocoloId)); return <button key={p.id} type="button" className={`gestao-marker ${p.precisao === 'aproximada' ? 'approx' : ''}`} style={{ left: `${Math.min(98, Math.max(2, ((p.longitude! + 75) / 42) * 100))}%`, top: `${Math.min(98, Math.max(2, ((p.latitude! + 5) / -30) * 100))}%` }} onClick={() => setSelected(p)} title={`${p.codigo}: ${situacao.valor}`} aria-label={`${p.codigo}, ${situacao.valor.replaceAll('_', ' ')}, ${p.precisao || 'precisão não informada'}`} /> })}
    </div><p className="gestao-map-note">Representação esquemática: não substitui cartografia nem valida coordenadas contra rodovia e quilômetro.</p>
    <div className="gestao-map-legend"><strong>Legenda</strong><span><i className="gestao-legend-dot" /> Coordenada confirmada</span><span><i className="gestao-legend-dot approx" /> Coordenada aproximada</span><span>Selecione marcador para ver situação.</span></div>
    <h3>Coordenadas pendentes <span className="gestao-count">{pending.length}</span></h3>{pending.length ? <ul className="gestao-simple-list">{pending.map((p) => <li key={p.id}><button type="button" className="gestao-button-link" onClick={() => setSelected(p)}>{p.codigo} · {p.rodovia} km {p.km} — registrar coordenadas</button></li>)}</ul> : <p className="gestao-empty">Nenhum ponto sem coordenadas neste recorte.</p>}
    {selected && <div className="gestao-panel gestao-map-detail"><div className="gestao-section-head"><div><span className="gestao-eyebrow">Ponto selecionado</span><h3>{selected.codigo}</h3><p>{selected.estado} · {selected.concessionaria} · {selected.rodovia} km {selected.km}</p></div><button type="button" className="gestao-button-secondary" onClick={() => setSelected(null)}>Fechar detalhes</button></div><span className="gestao-status">{pontoStatus(selected, protocolos.find((p) => p.id === selected.protocoloId)).valor.replaceAll('_', ' ')}</span><Link to={`/gestao-contratos/${contratoId}/protocolos/${selected.protocoloId}`}>Abrir protocolo ↗</Link><form key={selected.id} className="gestao-form" onSubmit={(event) => void save(event)}><label>Latitude<input name="latitude" required type="number" step="any" min="-90" max="90" defaultValue={selected.latitude} /></label><label>Longitude<input name="longitude" required type="number" step="any" min="-180" max="180" defaultValue={selected.longitude} /></label><label>Precisão<select name="precisao" defaultValue={selected.precisao || 'aproximada'}><option value="confirmada">Confirmada</option><option value="aproximada">Aproximada</option></select></label><button type="submit">Salvar localização</button></form></div>}
  </section>
}
