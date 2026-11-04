import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { getContrato, listPontos, listProtocolos, filtrarGestao, indicadoresGestao, type Contrato, type Etapa, type Ponto, type Protocolo } from '../services/gestaoContratos'
import { calcularDashboardGestao } from '../services/gestaoDashboard'
import { exportarRecorteGestao, gestaoFiltroFromSearchParams } from '../services/gestaoExportacao'
import GestaoDashboardCharts from '../components/gestao/GestaoDashboardCharts'
import MapaLeaflet from '../components/gestao/MapaLeaflet'
import { classificarPrazo, resumirPrioridades } from '../utils/gestaoPrioridades'
import { nomeGestao } from './gestaoUi'
import { resumoContratoGestao, tituloContratoGestao } from './gestaoContratoHelpers'
import './GestaoContratos.css'

const etapasFiltro: Etapa[] = ['planejamento', 'elaboracao', 'fase_1', 'fase_2', 'homologacao', 'concluido']
type DashboardQueryKey = 'estado' | 'concessionaria' | 'rodovia' | 'status' | 'tipo' | 'etapa' | 'inicio' | 'fim' | 'q'

export type GestaoContext = { contrato: Contrato; protocolos: Protocolo[]; pontos: Ponto[]; refresh: () => Promise<void> }
export default function GestaoContratoDetalhe() {
  const { contratoId = '' } = useParams()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [contrato, setContrato] = useState<Contrato | null>(null)
  const [protocolos, setProtocolos] = useState<Protocolo[]>([])
  const [pontos, setPontos] = useState<Ponto[]>([])
  const [error, setError] = useState('')
  const [exportando, setExportando] = useState(false)
  const [exportMessage, setExportMessage] = useState('')
  const filtro = useMemo(() => gestaoFiltroFromSearchParams(searchParams), [searchParams])
  const { estado, concessionaria, rodovia, status, tipo, etapa, inicio, fim, busca } = filtro
  const setDashboardParam = (key: DashboardQueryKey, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }
  const clearDashboardFilters = () => setSearchParams({})
  const hasDashboardFilter = Boolean(estado || concessionaria || rodovia || status || tipo || etapa || inicio || fim || busca)
  const refresh = async () => {
    try {
      const found = await getContrato(contratoId)
      if (!found) { setError('Contrato não encontrado.'); return }
      const [ps, pts] = await Promise.all([listProtocolos(contratoId), listPontos(contratoId)])
      setContrato(found); setProtocolos(ps); setPontos(pts); setError('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao carregar contrato.') }
  }
  useEffect(() => { void refresh() }, [contratoId])
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
  if (!contrato) return <div className="gestao-page"><Link to="/gestao-contratos">Voltar aos contratos</Link><p role="alert">{error || 'Carregando contrato...'}</p></div>
  const base = `/gestao-contratos/${contratoId}`
  const isOverview = location.pathname === base
  return <div className="gestao-page">
    <header className="gestao-header"><div><Link className="gestao-back" to="/gestao-contratos">← Todos os contratos</Link><span className="gestao-eyebrow">Contrato selecionado{contrato.numero?.trim() ? ` · ${contrato.numero}` : ''}</span><h1>{tituloContratoGestao(contrato.nome, contrato.numero)}</h1><p>{resumoContratoGestao(contrato) || 'Protocolos, pontos e entregas no mesmo contexto.'}</p>{contrato.objeto?.trim() && <p className="gestao-contract-object">{contrato.objeto}</p>}{contrato.observacoes?.trim() && <p className="gestao-contract-notes"><strong>Observações:</strong> {contrato.observacoes}</p>}</div>{contrato.situacao && contrato.situacao !== 'ativo' && <span className="gestao-status">{nomeGestao(contrato.situacao)}</span>}</header>
    <nav aria-label="Áreas do contrato" className="gestao-nav">
      <NavLink end to={base}>Visão geral</NavLink><NavLink to={`${base}/protocolos`}>Protocolos</NavLink><NavLink to={`${base}/pontos`}>Pontos</NavLink><NavLink to={`${base}/planejamento`}>Planejamento</NavLink><NavLink to={`${base}/mapa`}>Mapa</NavLink>
    </nav>
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
            <label htmlFor="gestao-dashboard-estado">Estado<select id="gestao-dashboard-estado" value={estado} onChange={(event) => setDashboardParam('estado', event.target.value)}><option value="">Todos</option>{dashboard.estados.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
            <label htmlFor="gestao-dashboard-concessionaria">Concessionária<select id="gestao-dashboard-concessionaria" value={concessionaria} onChange={(event) => setDashboardParam('concessionaria', event.target.value)}><option value="">Todas</option>{dashboard.concessionarias.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
            <label htmlFor="gestao-dashboard-rodovia">Rodovia<select id="gestao-dashboard-rodovia" value={rodovia} onChange={(event) => setDashboardParam('rodovia', event.target.value)}><option value="">Todas</option>{dashboard.rodovias.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
          </div>
        </fieldset>
        <fieldset>
          <legend>Operação</legend>
          <div className="gestao-overview-fields">
            <label htmlFor="gestao-dashboard-status">Status<select id="gestao-dashboard-status" value={status ?? ''} onChange={(event) => setDashboardParam('status', event.target.value)}><option value="">Todos</option>{statusOpcoes.map((item) => <option value={item} key={item}>{nomeGestao(item)}</option>)}</select></label>
            <label htmlFor="gestao-dashboard-tipo">Tipo de ponto<select id="gestao-dashboard-tipo" value={tipo ?? ''} onChange={(event) => setDashboardParam('tipo', event.target.value)}><option value="">Todos</option><option value="nova_implantacao">Nova implantação</option><option value="regularizacao">Regularização</option></select></label>
            <label htmlFor="gestao-dashboard-etapa">Etapa<select id="gestao-dashboard-etapa" value={etapa ?? ''} onChange={(event) => setDashboardParam('etapa', event.target.value)}><option value="">Todas</option>{etapasFiltro.map((item) => <option value={item} key={item}>{nomeGestao(item)}</option>)}</select></label>
          </div>
        </fieldset>
        <fieldset className="gestao-overview-period">
          <legend>Prazo e busca</legend>
          <div className="gestao-overview-fields">
            <label htmlFor="gestao-dashboard-inicio">Previsão de<input id="gestao-dashboard-inicio" lang="pt-BR" type="date" value={inicio ?? ''} onChange={(event) => setDashboardParam('inicio', event.target.value)} /></label>
            <label htmlFor="gestao-dashboard-fim">Previsão até<input id="gestao-dashboard-fim" lang="pt-BR" type="date" value={fim ?? ''} onChange={(event) => setDashboardParam('fim', event.target.value)} /></label>
            <label className="gestao-overview-search" htmlFor="gestao-dashboard-busca">Busca<input id="gestao-dashboard-busca" type="search" placeholder="Título, código ou rodovia" value={busca ?? ''} onChange={(event) => setDashboardParam('q', event.target.value)} /></label>
          </div>
        </fieldset>
      </div>
      <p className="gestao-overview-live" aria-live="polite">{totals.protocolos} protocolos · {totals.pontos} pontos{dashboard.pontosSemProtocolo ? ` · ${dashboard.pontosSemProtocolo} sem protocolo` : ''}</p>
    </section>
    <GestaoDashboardCharts data={dashboard} />
    <section className="gestao-health" aria-label="Saúde operacional do contrato">
      <div className="gestao-health-main">
        <div><span className="gestao-eyebrow">Saúde operacional</span><h2>{totals.atrasados ? 'Atenção necessária' : totals.protocolos ? 'Operação sob controle' : 'Pronto para começar'}</h2><p>{totals.atrasados ? `${totals.atrasados} protocolo${totals.atrasados === 1 ? '' : 's'} com prazo vencido pede${totals.atrasados === 1 ? '' : 'm'} ação.` : 'Acompanhe prazos, aprovações e localização dos pontos em um só lugar.'}</p></div>
        <div className="gestao-health-ring" style={{ '--gestao-progress': `${totals.protocolos ? Math.round(((totals.protocolos - totals.atrasados) / totals.protocolos) * 100) : 0}%` } as React.CSSProperties}><strong>{totals.protocolos ? Math.max(0, Math.round(((totals.protocolos - totals.atrasados) / totals.protocolos) * 100)) : 0}%</strong><span>em dia</span></div>
      </div>
      <div className="gestao-health-stats"><div className="gestao-health-stat"><span>Protocolos</span><strong>{totals.protocolos}</strong><small>{totals.paralisados} paralisados</small></div><div className="gestao-health-stat"><span>Pontos</span><strong>{totals.pontos}</strong><small>{totals.realizados} realizados</small></div><div className="gestao-health-stat gestao-health-stat-success"><span>Entregas</span><strong>{totals.realizados}</strong><small>{totals.previstos} previstas</small></div><div className={`gestao-health-stat ${totals.atrasados ? 'gestao-health-stat-danger' : 'gestao-health-stat-success'}`}><span>Prazo</span><strong>{totals.atrasados}</strong><small>{totals.atrasados ? 'em atraso' : 'sem atrasos'}</small></div></div>
    </section>
    <section className="gestao-attention" aria-label="Atenção operacional"><div><span className="gestao-eyebrow">Atenção operacional</span><p>Protocolos que pedem acompanhamento neste recorte.</p></div><div className="gestao-attention-items"><span><strong>{prioridades.emCorrecao}</strong> em correção</span><span><strong>{prioridades.aguardandoTerceiros}</strong> aguardando terceiros</span><span><strong>{prioridades.vencidos}</strong> com prazo vencido</span><span><strong>{prioridades.proximos}</strong> com entrega em até 7 dias</span></div></section>
<section className="gestao-dashboard-map"><div className="gestao-section-head"><div><span className="gestao-eyebrow">Visão territorial</span><h2>Mapa operacional</h2><p>Uma prévia dos pontos localizados neste contrato.</p></div><Link className="gestao-button-secondary" to={`${base}/mapa`}>Abrir mapa completo ↗</Link></div><div className="gestao-map-preview"><MapaLeaflet pontos={filtrado.pontos} protocolos={filtrado.protocolos} onSelectPoint={(ponto) => { window.location.href = `${base}/mapa?ponto=${ponto.id}` }} height={220} fitBoundsOnChange={false} /></div></section>
    </>}
    <Outlet context={{ contrato, protocolos: filtrado.protocolos, pontos: filtrado.pontos, refresh } satisfies GestaoContext} />
  </div>
}
export function GestaoVisaoGeral() {
  const { contratoId = '' } = useParams()
  const { protocolos } = useOutletContext<GestaoContext>()
  const pendentes = [...protocolos].filter((item) => item.status !== 'concluido' && item.etapa !== 'concluido' && (item.status === 'em_correcao' || item.status === 'aguardando_terceiros' || ['atrasado', 'proximo'].includes(classificarPrazo(item.previsao).prioridade))).sort((a, b) => (a.previsao || '9999-12-31').localeCompare(b.previsao || '9999-12-31')).slice(0, 5)
  return <section><div className="gestao-section-head"><div><h2>Visão geral</h2><p>Escolha uma área para trabalhar neste contrato.</p></div></div><div className="gestao-grid gestao-quicklinks"><Link className="gestao-card" to={`/gestao-contratos/${contratoId}/protocolos`}><span className="gestao-eyebrow">Tramitação</span><strong>Protocolos</strong><span>Acompanhar etapas, pareceres e movimentações ↗</span></Link><Link className="gestao-card" to={`/gestao-contratos/${contratoId}/pontos`}><span className="gestao-eyebrow">Localizações</span><strong>Pontos</strong><span>Consultar classificação e resultado de cada ponto ↗</span></Link><Link className="gestao-card" to={`/gestao-contratos/${contratoId}/planejamento`}><span className="gestao-eyebrow">Entregas</span><strong>Planejamento</strong><span>Comparar previsto e realizado ↗</span></Link><Link className="gestao-card" to={`/gestao-contratos/${contratoId}/mapa`}><span className="gestao-eyebrow">Território</span><strong>Mapa esquemático</strong><span>Ver coordenadas disponíveis e pendentes ↗</span></Link></div><div className="gestao-section-head"><div><h2>Para acompanhar</h2><p>Correções, retornos de terceiros e entregas próximas.</p></div><Link to={`/gestao-contratos/${contratoId}/protocolos`}>Ver todos os protocolos ↗</Link></div>{pendentes.length ? <ul className="gestao-list">{pendentes.map((item) => { const prazo = classificarPrazo(item.previsao); return <li key={item.id}><Link className="gestao-list-link" to={`/gestao-contratos/${contratoId}/protocolos/${item.id}`}><span className="gestao-list-main"><strong>{item.titulo}</strong><small>{item.concessionaria} · {item.rodovia}</small></span><span className="gestao-status">{item.status.replaceAll('_', ' ')}</span><span className={`gestao-deadline gestao-deadline-${prazo.prioridade}`}>{prazo.rotulo}</span><span aria-hidden="true">↗</span></Link></li> })}</ul> : <div className="gestao-empty"><h3>Nenhuma pendência destacada</h3><p>Não há protocolos em correção, aguardando terceiros ou com entrega nos próximos 7 dias neste recorte.</p></div>}</section>
}
