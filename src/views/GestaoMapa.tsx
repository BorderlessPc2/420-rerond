import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { atualizarPonto, type Ponto } from '../services/gestaoContratos'
import MapaLeaflet from '../components/gestao/MapaLeaflet'
import { filtrarPontosMapa, getSelectedPointId } from '../components/gestao/mapaUtils'
import { nomeGestao } from './gestaoUi'
import ModalGestao from '../components/gestao/ModalGestao'
import { getPontoDetailSummary, getPontoStatusOptions } from './gestaoMapaHelpers'
import type { GestaoContext } from './GestaoContratoDetalhe'

export default function GestaoMapa() {
  const { contratoId = '' } = useParams()
  const { pontos, protocolos, refresh } = useOutletContext<GestaoContext>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedPointId, setSelectedPointId] = useState<string | null>(() => getSelectedPointId(searchParams.toString(), pontos))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingStatus, setEditingStatus] = useState(false)
  const filtro = { busca: searchParams.get('busca') ?? '', estado: searchParams.get('estado') ?? '', tipo: (searchParams.get('tipo') ?? '') as Ponto['tipo'] | '', status: searchParams.get('status') ?? '' }
  const pontosFiltrados = filtrarPontosMapa(pontos, protocolos, filtro)
  const selected = pontosFiltrados.find((ponto) => ponto.id === selectedPointId) ?? null
  const geolocated = pontosFiltrados.filter((ponto) => Number.isFinite(ponto.latitude) && Number.isFinite(ponto.longitude))
  const pending = pontosFiltrados.filter((ponto) => !Number.isFinite(ponto.latitude) || !Number.isFinite(ponto.longitude))
  const estados = useMemo(() => [...new Set(pontos.map((ponto) => ponto.estado).filter(Boolean))].sort(), [pontos])
  const statusOpcoes = useMemo(() => [...new Set(pontos.map((ponto) => ponto.resultado ?? protocolos.find((item) => item.id === ponto.protocoloId)?.status ?? 'nao_iniciado'))].sort(), [pontos, protocolos])
  const hasFilters = Boolean(filtro.busca || filtro.estado || filtro.tipo || filtro.status)
  const setFilter = (key: 'busca' | 'estado' | 'tipo' | 'status', value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }
  useEffect(() => {
    setSelectedPointId(getSelectedPointId(searchParams.toString(), pontos))
  }, [pontos, searchParams])
  const selectPoint = (ponto: Ponto | null) => {
    setSelectedPointId(ponto?.id ?? null)
    if (ponto) setSearchParams({ ponto: ponto.id })
    else setSearchParams({})
  }
  const saveStatus = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected) return
    const form = new FormData(event.currentTarget)
    setSaving(true)
    try {
      const resultado = form.get('resultado') as Ponto['resultado'] | ''
      await atualizarPonto(contratoId, selected.id, { resultado: resultado || undefined })
      await refresh()
      setEditingStatus(false)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar situação do ponto.')
    } finally {
      setSaving(false)
    }
  }
  const saveLocation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected) return
    const form = new FormData(event.currentTarget)
    setSaving(true)
    try { await atualizarPonto(contratoId, selected.id, { latitude: Number(form.get('latitude')), longitude: Number(form.get('longitude')), precisao: form.get('precisao') as Ponto['precisao'] }); await refresh(); setError(''); selectPoint(null) } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao salvar coordenadas.') } finally { setSaving(false) }
  }
  return <section><div className="gestao-section-head"><div><span className="gestao-eyebrow">Visão territorial</span><h2>Mapa operacional</h2><p>Explore os pontos por localização, classificação e situação.</p></div><span className="gestao-count">{geolocated.length} visíveis · {pontosFiltrados.length} no filtro</span></div>{error && <p className="gestao-error" role="alert">{error}</p>}
    <div className="gestao-map-filters" aria-label="Filtros do mapa"><div className="gestao-map-search"><label htmlFor="gestao-mapa-busca">Buscar ponto</label><input id="gestao-mapa-busca" type="search" value={filtro.busca} placeholder="Código, rodovia ou km" onChange={(event) => setFilter('busca', event.target.value)} /></div><label>Estado<select value={filtro.estado} onChange={(event) => setFilter('estado', event.target.value)}><option value="">Todos os estados</option>{estados.map((estado) => <option value={estado} key={estado}>{estado}</option>)}</select></label><label>Tipo<select value={filtro.tipo} onChange={(event) => setFilter('tipo', event.target.value)}><option value="">Todos os tipos</option><option value="regularizacao">Regularização</option><option value="nova_implantacao">Nova implantação</option></select></label><label>Situação<select value={filtro.status} onChange={(event) => setFilter('status', event.target.value)}><option value="">Todas as situações</option>{statusOpcoes.map((status) => <option value={status} key={status}>{nomeGestao(status)}</option>)}</select></label>{hasFilters && <button type="button" className="gestao-button-link gestao-map-clear" onClick={() => setSearchParams({})}>Limpar filtros</button>}</div>
    <div className="gestao-map-summary" role="status"><strong>{pontosFiltrados.length}</strong><span>pontos no recorte</span><i /> <strong>{geolocated.length}</strong><span>localizados no mapa</span>{pending.length > 0 && <><i /><strong>{pending.length}</strong><span>aguardando coordenadas</span></>}</div>
    <MapaLeaflet pontos={pontosFiltrados} protocolos={protocolos} selectedPointId={selectedPointId ?? undefined} onSelectPoint={selectPoint} fitBoundsOnChange />
    <p className="gestao-map-note">Mapa gratuito com OpenStreetMap. Coordenadas são operacionais e podem ser aproximadas.</p>
    <div className="gestao-map-legend"><strong>Legenda</strong><span><i className="gestao-legend-dot gestao-legend-success" /> Concluído</span><span><i className="gestao-legend-dot gestao-legend-attention" /> Atenção</span><span><i className="gestao-legend-dot gestao-legend-progress" /> Em andamento</span><span><i className="gestao-legend-dot gestao-legend-neutral" /> Não iniciado</span></div>
    <h3>Coordenadas pendentes <span className="gestao-count">{pending.length}</span></h3>{pending.length ? <ul className="gestao-simple-list">{pending.map((ponto) => <li key={ponto.id}><button type="button" className="gestao-button-link" onClick={() => selectPoint(ponto)}>{ponto.codigo} · {ponto.rodovia} km {ponto.km} — registrar coordenadas</button></li>)}</ul> : <p className="gestao-empty">Nenhum ponto sem coordenadas neste recorte.</p>}
    {selected && <ModalGestao open title={`Ponto ${selected.codigo}`} description="Consulte localização, protocolo e situação operacional." labelledBy="gestao-ponto-mapa-title" onClose={() => selectPoint(null)}><div className="gestao-map-modal"><div className="gestao-point-detail-grid"><div><span>Local</span><strong>{getPontoDetailSummary(selected, protocolos.find((p) => p.id === selected.protocoloId)).local}</strong></div><div><span>Classificação</span><strong>{getPontoDetailSummary(selected, protocolos.find((p) => p.id === selected.protocoloId)).classificacao}</strong></div><div><span>Protocolo</span><strong>{getPontoDetailSummary(selected, protocolos.find((p) => p.id === selected.protocoloId)).protocolo}</strong></div></div><div className="gestao-map-modal-status"><span className="gestao-status">{nomeGestao(getPontoDetailSummary(selected, protocolos.find((p) => p.id === selected.protocoloId)).status)}</span><button type="button" className="gestao-button-secondary" onClick={() => setEditingStatus(true)}>Atualizar situação</button></div>{selected.protocoloId && <Link to={`/gestao-contratos/${contratoId}/protocolos/${selected.protocoloId}?ponto=${selected.id}`}>Abrir protocolo ↗</Link>}{editingStatus ? <form className="gestao-form gestao-map-status-form" onSubmit={(event) => void saveStatus(event)}><label htmlFor="gestao-ponto-resultado">Situação operacional<select id="gestao-ponto-resultado" name="resultado" defaultValue={selected.resultado ?? ''}>{getPontoStatusOptions(selected).map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label><div className="gestao-form-footer"><button type="button" className="gestao-button-secondary" onClick={() => setEditingStatus(false)}>Cancelar</button><button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar situação'}</button></div></form> : <button type="button" className="gestao-button-secondary" onClick={() => setEditingStatus(true)}>Editar situação do ponto</button>}<details className="gestao-map-location-details"><summary>Editar localização</summary><form key={selected.id} className="gestao-form" onSubmit={(event) => void saveLocation(event)}><label>Latitude<input name="latitude" required type="number" step="any" min="-90" max="90" defaultValue={selected.latitude} /></label><label>Longitude<input name="longitude" required type="number" step="any" min="-180" max="180" defaultValue={selected.longitude} /></label><label>Precisão<select name="precisao" defaultValue={selected.precisao || 'aproximada'}><option value="confirmada">Confirmada</option><option value="aproximada">Aproximada</option></select></label><button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar localização'}</button></form></details></div></ModalGestao>}
  </section>
}
