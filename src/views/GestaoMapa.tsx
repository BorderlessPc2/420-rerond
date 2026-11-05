import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { atualizarPonto, type Ponto, type Protocolo } from '../services/gestaoContratos'
import MapaLeaflet from '../components/gestao/MapaLeaflet'
import { filtrarPontosMapa, getPontoColor, getSelectedPointId } from '../components/gestao/mapaUtils'
import { nomeGestao } from './gestaoUi'
import { getPontoDetailSummary, getPontoStatusOptions } from './gestaoMapaHelpers'
import type { GestaoContext } from './GestaoContratoDetalhe'

export default function GestaoMapa() {
  const { contratoId = '' } = useParams()
  const { pontos, protocolos, refresh } = useOutletContext<GestaoContext>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedPointId, setSelectedPointId] = useState<string | null>(() => getSelectedPointId(searchParams.toString(), pontos))
  const [viewMode, setViewMode] = useState<'selected' | 'all'>(() => getSelectedPointId(searchParams.toString(), pontos) ? 'selected' : 'all')
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
  const ordenados = useMemo(() => [...pontosFiltrados].sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true })), [pontosFiltrados])
  const selectedIndex = ordenados.findIndex((ponto) => ponto.id === selectedPointId)
  const selectPoint = (ponto: Ponto | null) => {
    setSelectedPointId(ponto?.id ?? null)
    setViewMode(ponto ? 'selected' : 'all')
    const next = new URLSearchParams(searchParams)
    if (ponto) next.set('ponto', ponto.id)
    else next.delete('ponto')
    setSearchParams(next)
  }
  const stepPoint = (delta: number) => {
    if (!ordenados.length) return
    const index = selectedIndex < 0 ? (delta > 0 ? 0 : ordenados.length - 1) : selectedIndex + delta
    const next = ordenados[index]
    if (next) selectPoint(next)
  }
  const onMapKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, a')) return
    if (event.key === 'ArrowRight') { event.preventDefault(); stepPoint(1) }
    if (event.key === 'ArrowLeft') { event.preventDefault(); stepPoint(-1) }
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
    try { await atualizarPonto(contratoId, selected.id, { latitude: Number(form.get('latitude')), longitude: Number(form.get('longitude')), precisao: form.get('precisao') as Ponto['precisao'] }); await refresh(); setError('') } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao salvar coordenadas.') } finally { setSaving(false) }
  }
  useEffect(() => {
    if (!selectedPointId) return
    document.getElementById(`gestao-map-point-${selectedPointId}`)?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [selectedPointId])
  return <section onKeyDown={onMapKeyDown}><div className="gestao-section-head"><div><span className="gestao-eyebrow">Visão territorial</span><h2>Mapa operacional</h2><p>Percorra a faixa, use as setas do teclado ou clique no pino.</p></div><span className="gestao-count">{geolocated.length} visíveis · {pontosFiltrados.length} no filtro</span></div>{error && <p className="gestao-error" role="alert">{error}</p>}
    <div className="gestao-map-filters" aria-label="Filtros do mapa"><div className="gestao-map-search"><label htmlFor="gestao-mapa-busca">Buscar ponto</label><input id="gestao-mapa-busca" type="search" value={filtro.busca} placeholder="Código, rodovia ou km" onChange={(event) => setFilter('busca', event.target.value)} /></div><label>Estado<select value={filtro.estado} onChange={(event) => setFilter('estado', event.target.value)}><option value="">Todos os estados</option>{estados.map((estado) => <option value={estado} key={estado}>{estado}</option>)}</select></label><label>Tipo<select value={filtro.tipo} onChange={(event) => setFilter('tipo', event.target.value)}><option value="">Todos os tipos</option><option value="regularizacao">Regularização</option><option value="nova_implantacao">Nova implantação</option></select></label><label>Situação<select value={filtro.status} onChange={(event) => setFilter('status', event.target.value)}><option value="">Todas as situações</option>{statusOpcoes.map((status) => <option value={status} key={status}>{nomeGestao(status)}</option>)}</select></label>{hasFilters && <button type="button" className="gestao-button-link gestao-map-clear" onClick={() => setSearchParams({})}>Limpar filtros</button>}</div>
    <div className="gestao-map-summary" role="status"><strong>{pontosFiltrados.length}</strong><span>pontos no recorte</span><i /> <strong>{geolocated.length}</strong><span>localizados no mapa</span>{pending.length > 0 && <><i /><strong>{pending.length}</strong><span>aguardando coordenadas</span></>}</div>
    <div className="gestao-map-nav" aria-label="Navegação dos pontos">
      <div className="gestao-map-nav-actions">
        <button type="button" className="gestao-button-secondary" onClick={() => setViewMode('all')} aria-pressed={viewMode === 'all'}>Ver todos</button>
        <button type="button" className="gestao-button-secondary" onClick={() => stepPoint(-1)} disabled={!ordenados.length || selectedIndex === 0}>Anterior</button>
        <span>{ordenados.length ? `${selectedIndex < 0 ? 0 : selectedIndex + 1} de ${ordenados.length}` : '0 pontos'}</span>
        <button type="button" className="gestao-button-secondary" onClick={() => stepPoint(1)} disabled={!ordenados.length || selectedIndex === ordenados.length - 1}>Próximo</button>
      </div>
      <div className="gestao-map-rail" role="listbox" aria-label="Pontos do recorte" aria-orientation="horizontal">
        {ordenados.map((ponto) => {
          const protocolo = protocolos.find((item) => item.id === ponto.protocoloId)
          const noMapa = Number.isFinite(ponto.latitude) && Number.isFinite(ponto.longitude)
          return <button type="button" role="option" id={`gestao-map-point-${ponto.id}`} aria-selected={ponto.id === selectedPointId} className={ponto.id === selectedPointId ? 'is-selected' : ''} key={ponto.id} onClick={() => selectPoint(ponto)}>
            <i style={{ background: getPontoColor(ponto, protocolo) }} />
            <b>{ponto.codigo}</b>
            <span>{ponto.rodovia} · km {ponto.km}</span>
            {!noMapa && <small>sem mapa</small>}
          </button>
        })}
      </div>
    </div>
    <div className="gestao-map-stage">
      <MapaLeaflet pontos={pontosFiltrados} protocolos={protocolos} selectedPointId={selectedPointId ?? undefined} onSelectPoint={selectPoint} height={560} fitBoundsOnChange viewMode={viewMode} />
      <aside className={`gestao-map-inspector${saving ? ' is-saving' : ''}`} aria-live="polite">
        <div key={selected?.id ?? 'vazio'} className="gestao-map-inspector-body">
          {saving ? <MapaFichaSkeleton /> : selected ? <MapaPontoFicha contratoId={contratoId} ponto={selected} protocolo={protocolos.find((item) => item.id === selected.protocoloId)} saving={saving} editingStatus={editingStatus} onEditStatus={setEditingStatus} onSaveStatus={saveStatus} onSaveLocation={saveLocation} /> : <div className="gestao-map-inspector-empty"><h3>Nenhum ponto selecionado</h3><p>Escolha um ponto na faixa ou clique em um pino. A ficha abre aqui.</p></div>}
        </div>
      </aside>
    </div>
    <p className="gestao-map-note">A faixa lista o recorte na ordem do código. Anterior e Próximo, ou as setas do teclado, percorrem os pontos. Ver todos enquadra o mapa. Clique no mapa e use a roda para ampliar. O anel vazio no pino indica coordenada aproximada.</p>
    <div className="gestao-map-legend"><strong>Legenda</strong><span><i className="gestao-legend-dot gestao-legend-success" /> Concluído</span><span><i className="gestao-legend-dot gestao-legend-attention" /> Atenção</span><span><i className="gestao-legend-dot gestao-legend-progress" /> Em andamento</span><span><i className="gestao-legend-dot gestao-legend-neutral" /> Não iniciado</span></div>
    <h3>Coordenadas pendentes <span className="gestao-count">{pending.length}</span></h3>{pending.length ? <ul className="gestao-simple-list">{pending.map((ponto) => <li key={ponto.id}><button type="button" className="gestao-button-link" onClick={() => selectPoint(ponto)}>{ponto.codigo} · {ponto.rodovia} km {ponto.km} — registrar coordenadas</button></li>)}</ul> : <p className="gestao-empty">Nenhum ponto sem coordenadas neste recorte.</p>}
  </section>
}

function MapaFichaSkeleton() {
  return <div aria-busy="true" aria-label="Atualizando ponto">
    <span className="gestao-skeleton gestao-skeleton-line" />
    <span className="gestao-skeleton gestao-skeleton-title" />
    <span className="gestao-skeleton gestao-skeleton-line" />
    <span className="gestao-skeleton gestao-skeleton-pill" />
  </div>
}

function MapaPontoFicha({ contratoId, ponto, protocolo, saving, editingStatus, onEditStatus, onSaveStatus, onSaveLocation }: {
  contratoId: string
  ponto: Ponto
  protocolo?: Protocolo
  saving: boolean
  editingStatus: boolean
  onEditStatus: (open: boolean) => void
  onSaveStatus: (event: React.FormEvent<HTMLFormElement>) => void
  onSaveLocation: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  const resumo = getPontoDetailSummary(ponto, protocolo)
  return <div className="gestao-map-modal">
    <div><span className="gestao-eyebrow">Ponto selecionado</span><h3>{ponto.codigo}</h3><p>{resumo.local}</p></div>
    <div className="gestao-point-detail-grid"><div><span>Classificação</span><strong>{resumo.classificacao}</strong></div><div><span>Protocolo</span><strong>{resumo.protocolo}</strong></div></div>
    <div className="gestao-map-modal-status"><span className="gestao-status">{nomeGestao(resumo.status)}</span></div>
    {ponto.protocoloId && <Link to={`/gestao-contratos/${contratoId}/protocolos/${ponto.protocoloId}?ponto=${ponto.id}`}>Abrir protocolo ↗</Link>}
    {editingStatus ? <form className="gestao-form gestao-map-status-form" onSubmit={onSaveStatus}><label htmlFor="gestao-ponto-resultado">Situação operacional<select id="gestao-ponto-resultado" name="resultado" defaultValue={ponto.resultado ?? ''}>{getPontoStatusOptions(ponto).map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label><div className="gestao-form-footer"><button type="button" className="gestao-button-secondary" onClick={() => onEditStatus(false)}>Cancelar</button><button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar situação'}</button></div></form> : <button type="button" className="gestao-button-secondary" onClick={() => onEditStatus(true)}>Atualizar situação</button>}
    <details className="gestao-map-location-details" open={!Number.isFinite(ponto.latitude)}><summary>{Number.isFinite(ponto.latitude) ? 'Ajustar coordenadas' : 'Registrar coordenadas'}</summary><form key={ponto.id} className="gestao-form" onSubmit={onSaveLocation}><label>Latitude<input name="latitude" required type="number" step="any" min="-90" max="90" defaultValue={ponto.latitude ?? ''} /></label><label>Longitude<input name="longitude" required type="number" step="any" min="-180" max="180" defaultValue={ponto.longitude ?? ''} /></label><label>Precisão<select name="precisao" defaultValue={ponto.precisao || 'aproximada'}><option value="confirmada">Confirmada</option><option value="aproximada">Aproximada</option></select></label><button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar localização'}</button></form></details>
  </div>
}
