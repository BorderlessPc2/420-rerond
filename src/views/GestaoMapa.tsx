import { useEffect, useState } from 'react'
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { atualizarPonto, pontoStatus, type Ponto } from '../services/gestaoContratos'
import MapaLeaflet from '../components/gestao/MapaLeaflet'
import { getSelectedPointId } from '../components/gestao/mapaUtils'
import type { GestaoContext } from './GestaoContratoDetalhe'

export default function GestaoMapa() {
  const { contratoId = '' } = useParams()
  const { pontos, protocolos, refresh } = useOutletContext<GestaoContext>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedPointId, setSelectedPointId] = useState<string | null>(() => getSelectedPointId(searchParams.toString(), pontos))
  const [error, setError] = useState('')
  const selected = pontos.find((ponto) => ponto.id === selectedPointId) ?? null
  const geolocated = pontos.filter((ponto) => Number.isFinite(ponto.latitude) && Number.isFinite(ponto.longitude))
  const pending = pontos.filter((ponto) => !Number.isFinite(ponto.latitude) || !Number.isFinite(ponto.longitude))
  useEffect(() => {
    setSelectedPointId(getSelectedPointId(searchParams.toString(), pontos))
  }, [pontos, searchParams])
  const selectPoint = (ponto: Ponto | null) => {
    setSelectedPointId(ponto?.id ?? null)
    if (ponto) setSearchParams({ ponto: ponto.id })
    else setSearchParams({})
  }
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected) return
    const form = new FormData(event.currentTarget)
    try { await atualizarPonto(contratoId, selected.id, { latitude: Number(form.get('latitude')), longitude: Number(form.get('longitude')), precisao: form.get('precisao') as Ponto['precisao'] }); await refresh(); setError(''); selectPoint(null) } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao salvar coordenadas.') }
  }
  return <section><div className="gestao-section-head"><div><span className="gestao-eyebrow">Visão territorial</span><h2>Mapa operacional</h2><p>Mapa real com pontos localizados. Selecione um marcador para consultar andamento.</p></div><span className="gestao-count">{geolocated.length} localizados · {pending.length} pendentes</span></div>{error && <p className="gestao-error" role="alert">{error}</p>}
    <MapaLeaflet pontos={pontos} protocolos={protocolos} selectedPointId={selectedPointId ?? undefined} onSelectPoint={selectPoint} fitBoundsOnChange />
    <p className="gestao-map-note">Mapa gratuito com OpenStreetMap. Coordenadas são operacionais e podem ser aproximadas.</p>
    <div className="gestao-map-legend"><strong>Legenda</strong><span><i className="gestao-legend-dot gestao-legend-success" /> Concluído</span><span><i className="gestao-legend-dot gestao-legend-attention" /> Atenção</span><span><i className="gestao-legend-dot gestao-legend-progress" /> Em andamento</span><span><i className="gestao-legend-dot gestao-legend-neutral" /> Não iniciado</span></div>
    <h3>Coordenadas pendentes <span className="gestao-count">{pending.length}</span></h3>{pending.length ? <ul className="gestao-simple-list">{pending.map((ponto) => <li key={ponto.id}><button type="button" className="gestao-button-link" onClick={() => selectPoint(ponto)}>{ponto.codigo} · {ponto.rodovia} km {ponto.km} — registrar coordenadas</button></li>)}</ul> : <p className="gestao-empty">Nenhum ponto sem coordenadas neste recorte.</p>}
    {selected && <div className="gestao-panel gestao-map-detail"><div className="gestao-section-head"><div><span className="gestao-eyebrow">Ponto selecionado</span><h3>{selected.codigo}</h3><p>{selected.estado} · {selected.concessionaria} · {selected.rodovia} km {selected.km}</p></div><button type="button" className="gestao-button-secondary" onClick={() => selectPoint(null)}>Fechar detalhes</button></div><span className="gestao-status">{pontoStatus(selected, protocolos.find((p) => p.id === selected.protocoloId)).valor.replaceAll('_', ' ')}</span><Link to={`/gestao-contratos/${contratoId}/protocolos/${selected.protocoloId}?ponto=${selected.id}`}>Abrir protocolo ↗</Link><form key={selected.id} className="gestao-form" onSubmit={(event) => void save(event)}><label>Latitude<input name="latitude" required type="number" step="any" min="-90" max="90" defaultValue={selected.latitude} /></label><label>Longitude<input name="longitude" required type="number" step="any" min="-180" max="180" defaultValue={selected.longitude} /></label><label>Precisão<select name="precisao" defaultValue={selected.precisao || 'aproximada'}><option value="confirmada">Confirmada</option><option value="aproximada">Aproximada</option></select></label><button type="submit">Salvar localização</button></form></div>}
  </section>
}
