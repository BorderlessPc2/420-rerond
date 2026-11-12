import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { getContrato, listPontos, listProtocolos, filtrarGestao, indicadoresGestao, type Contrato, type Etapa, type Ponto, type Protocolo } from '../services/gestaoContratos'
import { calcularDashboardGestao } from '../services/gestaoDashboard'
import { exportarRecorteGestao, gestaoFiltroFromSearchParams } from '../services/gestaoExportacao'
import GestaoDashboardCharts from '../components/gestao/GestaoDashboardCharts'
import SelectDropdown from '../components/ui/selectDropdown'
import GestaoLoadingSkeleton from '../components/gestao/GestaoLoadingSkeleton'
import MapaLeaflet from '../components/gestao/MapaLeaflet'
import { classificarPrazo, resumirPrioridades, situacaoOperacional } from '../utils/gestaoPrioridades'
import { nomeGestao } from './gestaoUi'
import { resumoContratoGestao, tituloContratoGestao } from './gestaoContratoHelpers'
import './GestaoContratos.css'

const etapasFiltro: Etapa[] = ['planejamento', 'elaboracao', 'fase_1', 'fase_2', 'homologacao', 'concluido']
type DashboardQueryKey = 'estado' | 'concessionaria' | 'rodovia' | 'status' | 'tipo' | 'etapa' | 'inicio' | 'fim' | 'q'

export type GestaoContext = { contrato: Contrato; protocolos: Protocolo[]; pontos: Ponto[]; loading: boolean; refresh: () => Promise<void> }
export default function GestaoContratoDetalhe() {
  const { contratoId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [contrato, setContrato] = useState<Contrato | null>(null)
  const [protocolos, setProtocolos] = useState<Protocolo[]>([])
  const [pontos, setPontos] = useState<Ponto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exportando, setExportando] = useState(false)
  const [exportMessage, setExportMessage] = useState('')
  const filtro = useMemo(() => gestaoFiltroFromSearchParams(searchParams), [searchParams])
  const { estado, concessionaria, rodovia, status, tipo, etapa, inicio, fim, busca } = filtro
  const [buscaDraft, setBuscaDraft] = useState(busca ?? '')
  const setDashboardParam = useCallback((key: DashboardQueryKey, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }, [searchParams, setSearchParams])
  const clearDashboardFilters = () => setSearchParams({})
  const hasDashboardFilter = Boolean(estado || concessionaria || rodovia || status || tipo || etapa || inicio || fim || busca)
  const refresh = useCallback(async () => {
    try {
      const found = await getContrato(contratoId)
      if (!found) { setError('Contrato não encontrado.'); return }
      const [ps, pts] = await Promise.all([listProtocolos(contratoId), listPontos(contratoId)])
      setContrato(found); setProtocolos(ps); setPontos(pts); setError('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao carregar contrato.') }
    finally { setLoading(false) }
  }, [contratoId])
  useEffect(() => {
    setLoading(true)
    void refresh()
    const unsubscribeContrato = onSnapshot(doc(db, 'gestaoContratos', contratoId), (snapshot) => {
      if (!snapshot.exists()) { setContrato(null); setError('Contrato não encontrado.'); return }
      setContrato({ id: snapshot.id, ...snapshot.data() } as Contrato)
      setError('')
    }, (err) => setError(err.message || 'Erro ao atualizar contrato.'))
    const subscribeCollection = <T extends { id: string }>(name: 'gestaoProtocolos' | 'gestaoPontos', setData: (items: T[]) => void) =>
      onSnapshot(query(collection(db, name), where('contratoId', '==', contratoId)), (snapshot) => {
        setData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as T)))
      }, (err) => setError(err.message || 'Erro ao atualizar dados do contrato.'))
    const unsubscribeProtocolos = subscribeCollection<Protocolo>('gestaoProtocolos', setProtocolos)
    const unsubscribePontos = subscribeCollection<Ponto>('gestaoPontos', setPontos)
    return () => { unsubscribeContrato(); unsubscribeProtocolos(); unsubscribePontos() }
  }, [contratoId, refresh])
  useEffect(() => { setBuscaDraft(busca ?? '') }, [busca])
  useEffect(() => {
    if (buscaDraft === (busca ?? '')) return
    const timer = window.setTimeout(() => setDashboardParam('q', buscaDraft), 250)
    return () => window.clearTimeout(timer)
  }, [busca, buscaDraft, setDashboardParam])
  const filtrado = useMemo(() => filtrarGestao(protocolos, pontos, filtro), [protocolos, pontos, filtro])
  const totals = indicadoresGestao(filtrado.protocolos, filtrado.pontos)
  const dashboard = useMemo(() => calcularDashboardGestao(protocolos, pontos, filtro), [protocolos, pontos, filtro])
  const exportarRecorte = async () => {
    if (!contrato) return
    setExportando(true)
    try {
      const result = exportarRecorteGestao(contrato.nome, protocolos, pontos, filtro)
      setError('')
      setExportMessage(`Exportado: ${result.protocolos} protocolos e ${result.pontos} pontos.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao exportar recorte.')
    } finally {
      setExportando(false)
    }
  }
  const statusOpcoes = useMemo(() => [...new Set(protocolos.map((item) => item.status))].sort(), [protocolos])
  const prioridades = resumirPrioridades(filtrado.protocolos)
  const situacao = situacaoOperacional(totals)
  const percentualNoPrazo = totals.protocolos ? Math.max(0, Math.round(((totals.protocolos - totals.atrasados) / totals.protocolos) * 100)) : 0
  if (!contrato) return error ? <div className="gestao-page"><Link to="/gestao-contratos">Voltar aos contratos</Link><p role="alert">{error}</p></div> : <div className="gestao-page"><GestaoLoadingSkeleton variant="detalhe" label="Carregando contrato" /></div>
  const base = `/gestao-contratos/${contratoId}`
  const isOverview = location.pathname === base
  return <div className="gestao-page">
    <header className="gestao-header"><div><Link className="gestao-back" to="/gestao-contratos">← Todos os contratos</Link><span className="gestao-eyebrow">Contrato selecionado{contrato.numero?.trim() ? ` · ${contrato.numero}` : ''}</span><h1>{tituloContratoGestao(contrato.nome, contrato.numero)}</h1><p>{resumoContratoGestao(contrato, { incluirObjeto: false }) || 'Protocolos, pontos e entregas no mesmo contexto.'}</p>{contrato.objeto?.trim() && <p className="gestao-contract-object">{contrato.objeto}</p>}{contrato.observacoes?.trim() && <p className="gestao-contract-notes"><strong>Observações:</strong> {contrato.observacoes}</p>}</div>{contrato.situacao && contrato.situacao !== 'ativo' && <span className="gestao-status">{nomeGestao(contrato.situacao)}</span>}</header>
    <nav aria-label="Áreas do contrato" className="gestao-nav">
      <NavLink end to={{ pathname: base, search: searchParams.toString() }}>Visão geral</NavLink><NavLink to={{ pathname: `${base}/protocolos`, search: searchParams.toString() }}>Protocolos</NavLink><NavLink to={{ pathname: `${base}/pontos`, search: searchParams.toString() }}>Pontos</NavLink><NavLink to={{ pathname: `${base}/planejamento`, search: searchParams.toString() }}>Planejamento</NavLink><NavLink to={{ pathname: `${base}/mapa`, search: searchParams.toString() }}>Mapa</NavLink>
    </nav>
    <p className="gestao-flow">O recorte acompanha as abas. Protocolos tramitam o processo, Pontos guardam o cadastro e o Mapa mostra onde cada um está.</p>
    {error && <p className="gestao-error" role="alert">{error}</p>}
    {exportMessage && <p className="gestao-success" role="status">{exportMessage}</p>}
    {isOverview && <>
    <section className="gestao-overview-panel" aria-label="Recorte da visão geral">
      <header className="gestao-overview-head">
        <div>
          <span className="gestao-eyebrow">Visão geral</span>
          <h2>Recorte operacional</h2>
          <p>Filtre protocolos e pontos deste contrato. Indicadores, mapa e listas usam o mesmo recorte.</p>
        </div>
        <div className="gestao-overview-actions">
          {hasDashboardFilter && <button type="button" className="gestao-button-link" onClick={clearDashboardFilters}>Limpar filtros</button>}
          <button type="button" className="gestao-button-secondary" disabled={exportando} onClick={() => void exportarRecorte()}>{exportando ? 'Exportando…' : 'Exportar XLSX'}</button>
        </div>
      </header>
      <div className="gestao-overview-filters">
        <fieldset>
          <legend>Local</legend>
          <div className="gestao-overview-fields">
            <SelectDropdown id="gestao-dashboard-estado" label="Estado" value={estado ?? ''} onChange={(value) => setDashboardParam('estado', value)} options={[{ value: '', label: 'Todos' }, ...dashboard.estados.map((item) => ({ value: item, label: item }))]} />
            <SelectDropdown id="gestao-dashboard-concessionaria" label="Concessionária" value={concessionaria ?? ''} onChange={(value) => setDashboardParam('concessionaria', value)} options={[{ value: '', label: 'Todas' }, ...dashboard.concessionarias.map((item) => ({ value: item, label: item }))]} />
            <SelectDropdown id="gestao-dashboard-rodovia" label="Rodovia" value={rodovia ?? ''} onChange={(value) => setDashboardParam('rodovia', value)} options={[{ value: '', label: 'Todas' }, ...dashboard.rodovias.map((item) => ({ value: item, label: item }))]} />
          </div>
        </fieldset>
        <fieldset>
          <legend>Operação</legend>
          <div className="gestao-overview-fields">
            <SelectDropdown id="gestao-dashboard-status" label="Status" value={status ?? ''} onChange={(value) => setDashboardParam('status', value)} options={[{ value: '', label: 'Todos' }, ...statusOpcoes.map((item) => ({ value: item, label: nomeGestao(item) }))]} />
            <SelectDropdown id="gestao-dashboard-tipo" label="Tipo de ponto" value={tipo ?? ''} onChange={(value) => setDashboardParam('tipo', value)} options={[{ value: '', label: 'Todos' }, { value: 'nova_implantacao', label: 'Nova implantação' }, { value: 'regularizacao', label: 'Regularização' }]} />
            <SelectDropdown id="gestao-dashboard-etapa" label="Etapa" value={etapa ?? ''} onChange={(value) => setDashboardParam('etapa', value)} options={[{ value: '', label: 'Todas' }, ...etapasFiltro.map((item) => ({ value: item, label: nomeGestao(item) }))]} />
          </div>
        </fieldset>
        <fieldset className="gestao-overview-period">
          <legend>Prazo e busca</legend>
          <div className="gestao-overview-fields">
            <label htmlFor="gestao-dashboard-inicio">Previsão de<input id="gestao-dashboard-inicio" lang="pt-BR" type="date" value={inicio ?? ''} onChange={(event) => setDashboardParam('inicio', event.target.value)} /></label>
            <label htmlFor="gestao-dashboard-fim">Previsão até<input id="gestao-dashboard-fim" lang="pt-BR" type="date" value={fim ?? ''} onChange={(event) => setDashboardParam('fim', event.target.value)} /></label>
            <label className="gestao-overview-search" htmlFor="gestao-dashboard-busca">Busca<input id="gestao-dashboard-busca" type="search" placeholder="Título, código ou rodovia" value={buscaDraft} onChange={(event) => setBuscaDraft(event.target.value)} /></label>
          </div>
        </fieldset>
      </div>
      <p className="gestao-overview-live" aria-live="polite">{totals.protocolos} protocolos · {totals.pontos} pontos{dashboard.pontosSemProtocolo ? ` · ${dashboard.pontosSemProtocolo} sem protocolo` : ''}</p>
    </section>
    <section className="gestao-health" aria-labelledby="gestao-health-title">
      <header className="gestao-health-heading"><span className="gestao-eyebrow">Visão do recorte</span><h2 id="gestao-health-title">Situação operacional</h2></header>
      <div className="gestao-health-content">
        <div className="gestao-health-summary">
          <div className="gestao-health-main">
            <div><h3>{situacao.titulo}</h3><p>{situacao.descricao}</p></div>
            <div className="gestao-health-ring" style={{ '--gestao-progress': `${percentualNoPrazo}%` } as React.CSSProperties}><strong>{totals.protocolos ? `${percentualNoPrazo}%` : '—'}</strong><span>{totals.protocolos ? 'no prazo' : 'sem dados'}</span></div>
          </div>
          <div className="gestao-health-stats">
            <div className="gestao-health-stat"><span>Protocolos</span><strong>{totals.protocolos}</strong><small>{totals.paralisados} {totals.paralisados === 1 ? 'paralisado' : 'paralisados'}</small></div>
            <div className="gestao-health-stat"><span>Pontos</span><strong>{totals.pontos}</strong><small>{totals.realizados} realizados</small></div>
            <div className="gestao-health-stat gestao-health-stat-success"><span>Entregas</span><strong>{totals.realizados}</strong><small>{totals.previstos} previstas</small></div>
          </div>
        </div>
        <div className="gestao-attention">
          <h3>Pendências que exigem acompanhamento</h3>
          <p>Protocolos deste recorte. Um protocolo pode aparecer em mais de uma categoria.</p>
          <div className="gestao-attention-items">
            <div className="gestao-attention-item gestao-attention-item-urgent"><strong>{totals.atrasados}</strong><span>com prazo vencido</span></div>
            <div className="gestao-attention-item"><strong>{prioridades.emCorrecao}</strong><span>em correção</span></div>
            <div className="gestao-attention-item"><strong>{prioridades.aguardandoTerceiros}</strong><span>aguardando terceiros</span></div>
            <div className="gestao-attention-item"><strong>{prioridades.proximos}</strong><span>com entrega em até 7 dias</span></div>
          </div>
        </div>
      </div>
    </section>
    <GestaoDashboardCharts data={dashboard} />
<section className="gestao-dashboard-map"><div className="gestao-section-head"><div><span className="gestao-eyebrow">Visão territorial</span><h2>Mapa operacional</h2><p>Clique em um ponto para abrir a ficha, com protocolo e situação.</p></div><Link className="gestao-button-secondary" to={{ pathname: `${base}/mapa`, search: searchParams.toString() }}>Abrir mapa completo ↗</Link></div><div className="gestao-map-preview"><MapaLeaflet pontos={filtrado.pontos} protocolos={filtrado.protocolos} onSelectPoint={(ponto) => { const next = new URLSearchParams(searchParams); next.set('ponto', ponto.id); navigate({ pathname: `${base}/mapa`, search: next.toString() }) }} height={380} fitBoundsOnChange /></div></section>
    </>}
    <Outlet context={{ contrato, protocolos: filtrado.protocolos, pontos: filtrado.pontos, loading, refresh } satisfies GestaoContext} />
  </div>
}
export function GestaoVisaoGeral() {
  const { contratoId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const { protocolos } = useOutletContext<GestaoContext>()
  const destino = (path: string) => ({ pathname: path, search: searchParams.toString() })
  const pendentes = [...protocolos].filter((item) => item.status !== 'concluido' && item.etapa !== 'concluido' && (item.status === 'em_correcao' || item.status === 'aguardando_terceiros' || ['atrasado', 'proximo'].includes(classificarPrazo(item.previsao).prioridade))).sort((a, b) => (a.previsao || '9999-12-31').localeCompare(b.previsao || '9999-12-31')).slice(0, 5)
  return <section><div className="gestao-section-head"><div><h2>Visão geral</h2><p>Escolha uma área para trabalhar neste contrato.</p></div></div><div className="gestao-grid gestao-quicklinks"><Link className="gestao-card" to={destino(`/gestao-contratos/${contratoId}/protocolos`)}><span className="gestao-eyebrow">Tramitação</span><strong>Protocolos</strong><span>Acompanhar etapas, pareceres e movimentações deste recorte ↗</span></Link><Link className="gestao-card" to={destino(`/gestao-contratos/${contratoId}/pontos`)}><span className="gestao-eyebrow">Cadastro</span><strong>Pontos</strong><span>Consultar classificação e resultado de cada ponto ↗</span></Link><Link className="gestao-card" to={destino(`/gestao-contratos/${contratoId}/planejamento`)}><span className="gestao-eyebrow">Prazos</span><strong>Planejamento</strong><span>Comparar previsto e realizado ↗</span></Link><Link className="gestao-card" to={destino(`/gestao-contratos/${contratoId}/mapa`)}><span className="gestao-eyebrow">Território</span><strong>Mapa dos pontos</strong><span>Clique em um ponto para ver protocolo, situação e coordenadas ↗</span></Link></div><div className="gestao-section-head"><div><h2>Para acompanhar</h2><p>Correções, retornos de terceiros e entregas próximas.</p></div><Link to={`/gestao-contratos/${contratoId}/protocolos`}>Ver todos os protocolos ↗</Link></div>{pendentes.length ? <ul className="gestao-list">{pendentes.map((item) => { const prazo = classificarPrazo(item.previsao); return <li key={item.id}><Link className="gestao-list-link" to={`/gestao-contratos/${contratoId}/protocolos/${item.id}`}><span className="gestao-list-main"><strong>{item.titulo}</strong><small>{item.concessionaria} · {item.rodovia}</small></span><span className="gestao-status">{nomeGestao(item.status)}</span><span className={`gestao-deadline gestao-deadline-${prazo.prioridade}`}>{prazo.rotulo}</span><span aria-hidden="true">↗</span></Link></li> })}</ul> : <div className="gestao-empty"><h3>Nenhuma pendência destacada</h3><p>Não há protocolos em correção, aguardando terceiros ou com entrega nos próximos 7 dias neste recorte.</p></div>}</section>
}
