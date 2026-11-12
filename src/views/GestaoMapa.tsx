import { useEffect, useMemo, useState } from 'react'
import { useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { pontoStatus, type Ponto, type Protocolo } from '../services/gestaoContratos'
import MapaLeaflet from '../components/gestao/MapaLeaflet'
import PontoIconBar from '../components/gestao/PontoIconBar'
import GestaoLoadingSkeleton from '../components/gestao/GestaoLoadingSkeleton'
import PontoPainelModal from '../components/gestao/PontoPainelModal'
import type { PontoPainelTab } from '../components/gestao/pontoPainelTypes'
import { filtrarPontosMapa, getPontoColor, getSelectedPointId } from '../components/gestao/mapaUtils'
import { nomeGestao } from './gestaoUi'
import { getPontoDetailSummary, removerPontoSelecionado } from './gestaoMapaHelpers'
import type { GestaoContext } from './GestaoContratoDetalhe'
import SelectDropdown from '../components/ui/selectDropdown'

export default function GestaoMapa() {
  const { contratoId = '' } = useParams()
  const { pontos, protocolos, loading, refresh } = useOutletContext<GestaoContext>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedPointId, setSelectedPointId] = useState<string | null>(() => getSelectedPointId(searchParams.toString(), pontos))
  const [viewMode, setViewMode] = useState<'selected' | 'all'>(() => getSelectedPointId(searchParams.toString(), pontos) ? 'selected' : 'all')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [painel, setPainel] = useState<{ ponto: Ponto; tab: PontoPainelTab } | null>(null)
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
  const closeSelectedPoint = () => {
    setSelectedPointId(null)
    setViewMode('all')
    setSearchParams(removerPontoSelecionado(searchParams.toString()))
  }
  const onMapKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, a, button')) return
    if (event.key === 'Escape' && selectedPointId) { event.preventDefault(); closeSelectedPoint() }
    if (event.key === 'ArrowRight') { event.preventDefault(); stepPoint(1) }
    if (event.key === 'ArrowLeft') { event.preventDefault(); stepPoint(-1) }
  }
  const painelPonto = painel ? pontos.find((item) => item.id === painel.ponto.id) ?? painel.ponto : null
  const openPainel = (ponto: Ponto, tab: PontoPainelTab) => {
    setPainel({ ponto, tab })
    setError('')
  }
  useEffect(() => {
    if (!selectedPointId) return
    document.getElementById(`gestao-map-point-${selectedPointId}`)?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [selectedPointId])
  if (loading) return <GestaoLoadingSkeleton variant="mapa" label="Carregando mapa operacional" />

  return <section onKeyDown={onMapKeyDown}><div className="gestao-section-head"><div><span className="gestao-eyebrow">Visão territorial</span><h2>Mapa operacional</h2><p>Percorra a faixa, use as setas do teclado ou clique no pino.</p></div><span className="gestao-count">{geolocated.length} visíveis · {pontosFiltrados.length} no filtro</span></div>{error && <p className="gestao-error" role="alert">{error}</p>}{notice && <p className="gestao-success" role="status">{notice}</p>}
    <PontoPainelModal open={Boolean(painelPonto)} contratoId={contratoId} ponto={painelPonto} protocolos={protocolos} initialTab={painel?.tab ?? 'dados'} onClose={() => setPainel(null)} refresh={refresh} onNotice={(message) => { setNotice(message); setError('') }} onError={(message) => { if (message) setError(message); else setError('') }} />
    <div className="gestao-map-filters" aria-label="Filtros do mapa"><div className="gestao-map-search"><label htmlFor="gestao-mapa-busca">Buscar ponto</label><input id="gestao-mapa-busca" type="search" value={filtro.busca} placeholder="Código, rodovia ou km" onChange={(event) => setFilter('busca', event.target.value)} /></div><SelectDropdown label="Estado" value={filtro.estado} onChange={(value) => setFilter('estado', value)} options={[{ value: '', label: 'Todos os estados' }, ...estados.map((estado) => ({ value: estado, label: estado }))]} /><SelectDropdown label="Tipo" value={filtro.tipo} onChange={(value) => setFilter('tipo', value)} options={[{ value: '', label: 'Todos os tipos' }, { value: 'regularizacao', label: 'Regularização' }, { value: 'nova_implantacao', label: 'Nova implantação' }]} /><SelectDropdown label="Situação" value={filtro.status} onChange={(value) => setFilter('status', value)} options={[{ value: '', label: 'Todas as situações' }, ...statusOpcoes.map((status) => ({ value: status, label: nomeGestao(status) }))]} />{hasFilters && <button type="button" className="gestao-button-link gestao-map-clear" onClick={() => setSearchParams({})}>Limpar filtros</button>}</div>
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
      <aside className="gestao-map-inspector" aria-live="polite">
        <div key={selected?.id ?? 'vazio'} className="gestao-map-inspector-body">
          {selected ? (
            <MapaPontoFicha
              contratoId={contratoId}
              ponto={selected}
              protocolo={protocolos.find((item) => item.id === selected.protocoloId)}
              onOpenPainel={(tab) => openPainel(selected, tab)}
              onClose={closeSelectedPoint}
            />
          ) : (
            <div className="gestao-map-inspector-empty">
              <h3>Nenhum ponto selecionado</h3>
              <p>Escolha um ponto na faixa ou clique em um pino. A ficha abre aqui.</p>
            </div>
          )}
        </div>
      </aside>
    </div>
    <p className="gestao-map-note">A faixa lista o recorte na ordem do código. Anterior e Próximo, ou as setas do teclado, percorrem os pontos. Ver todos enquadra o mapa. Clique no mapa e use a roda para ampliar. O anel vazio no pino indica coordenada aproximada.</p>
    <div className="gestao-map-legend"><strong>Legenda</strong><span><i className="gestao-legend-dot gestao-legend-success" /> Concluído</span><span><i className="gestao-legend-dot gestao-legend-attention" /> Atenção</span><span><i className="gestao-legend-dot gestao-legend-progress" /> Em andamento</span><span><i className="gestao-legend-dot gestao-legend-neutral" /> Não iniciado</span></div>
    <h3>Coordenadas pendentes <span className="gestao-count">{pending.length}</span></h3>{pending.length ? <ul className="gestao-simple-list">{pending.map((ponto) => <li key={ponto.id}><button type="button" className="gestao-button-link" onClick={() => selectPoint(ponto)}>{ponto.codigo} · {ponto.rodovia} km {ponto.km} — registrar coordenadas</button></li>)}</ul> : <p className="gestao-empty">Nenhum ponto sem coordenadas neste recorte.</p>}
  </section>
}

function MapaPontoFicha({ contratoId, ponto, protocolo, onOpenPainel, onClose }: {
  contratoId: string
  ponto: Ponto
  protocolo?: Protocolo
  onOpenPainel: (tab: PontoPainelTab) => void
  onClose: () => void
}) {
  const resumo = getPontoDetailSummary(ponto, protocolo)
  const situacao = pontoStatus(ponto, protocolo)
  return (
    <div className="gestao-map-modal">
      <div className="gestao-map-modal-head">
        <div>
          <span className="gestao-eyebrow">Ponto selecionado</span>
          <h3>{ponto.codigo}</h3>
          <p>{resumo.local}</p>
        </div>
        <button type="button" className="gestao-map-inspector-close" onClick={onClose} aria-label="Fechar ficha do ponto">Fechar</button>
      </div>
      <div className="gestao-point-detail-grid">
        <div>
          <span>Classificação</span>
          <strong>{resumo.classificacao}</strong>
        </div>
        <div>
          <span>Protocolo</span>
          <strong>{resumo.protocolo}</strong>
        </div>
      </div>
      <div className="gestao-map-modal-status">
        <span className="gestao-status">{nomeGestao(situacao.valor)}</span>
        {situacao.herdado && ponto.protocoloId ? <small> · protocolo</small> : null}
      </div>
      <PontoIconBar
        contratoId={contratoId}
        ponto={ponto}
        protocolo={protocolo}
        mapaAtual
        onOpenPainel={onOpenPainel}
      />
      <p className="gestao-ponto-painel-hint">
        <small>Use os ícones para editar dados, situação, prazos ou vínculo no mesmo painel da aba Pontos.</small>
      </p>
    </div>
  )
}
