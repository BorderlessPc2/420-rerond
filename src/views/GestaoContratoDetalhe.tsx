import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { calcularDashboardGestao, getContrato, listPontos, listProtocolos, filtrarGestao, indicadoresGestao, type Contrato, type Ponto, type Protocolo } from '../services/gestaoContratos'
import MapaLeaflet from '../components/gestao/MapaLeaflet'
import { classificarPrazo, resumirPrioridades } from '../utils/gestaoPrioridades'
import { nomeGestao } from './gestaoUi'
import './GestaoContratos.css'

export type GestaoContext = { contrato: Contrato; protocolos: Protocolo[]; pontos: Ponto[]; refresh: () => Promise<void> }
export default function GestaoContratoDetalhe() {
  const { contratoId = '' } = useParams()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [contrato, setContrato] = useState<Contrato | null>(null)
  const [protocolos, setProtocolos] = useState<Protocolo[]>([])
  const [pontos, setPontos] = useState<Ponto[]>([])
  const [error, setError] = useState('')
  const estado = searchParams.get('estado') ?? ''
  const filtro = { estado, concessionaria: '', rodovia: '', protocoloId: '', pontoCodigo: '', status: '', tipo: '', etapa: '', inicio: '', fim: '' }
  const refresh = async () => {
    try {
      const found = await getContrato(contratoId)
      if (!found) { setError('Contrato não encontrado.'); return }
      const [ps, pts] = await Promise.all([listProtocolos(contratoId), listPontos(contratoId)])
      setContrato(found); setProtocolos(ps); setPontos(pts); setError('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao carregar contrato.') }
  }
  useEffect(() => { void refresh() }, [contratoId])
  const filtrado = useMemo(() => filtrarGestao(protocolos, pontos, filtro), [protocolos, pontos, estado])
  const totals = indicadoresGestao(filtrado.protocolos, filtrado.pontos)
  const dashboard = calcularDashboardGestao(protocolos, pontos, estado)
  const prioridades = resumirPrioridades(filtrado.protocolos)
  if (!contrato) return <div className="gestao-page"><Link to="/gestao-contratos">Voltar aos contratos</Link><p role="alert">{error || 'Carregando contrato...'}</p></div>
  const base = `/gestao-contratos/${contratoId}`
  const isOverview = location.pathname === base
  return <div className="gestao-page">
    <header className="gestao-header"><div><Link className="gestao-back" to="/gestao-contratos">← Todos os contratos</Link><span className="gestao-eyebrow">Contrato selecionado</span><h1>{contrato.nome}</h1><p>Protocolos, pontos e entregas no mesmo contexto.</p></div></header>
    <nav aria-label="Áreas do contrato" className="gestao-nav">
      <NavLink end to={base}>Visão geral</NavLink><NavLink to={`${base}/protocolos`}>Protocolos</NavLink><NavLink to={`${base}/pontos`}>Pontos</NavLink><NavLink to={`${base}/planejamento`}>Planejamento</NavLink><NavLink to={`${base}/mapa`}>Mapa</NavLink>
    </nav>
    {error && <p className="gestao-error" role="alert">{error}</p>}
    {isOverview && <>
    <section className="gestao-dashboard-intro" aria-label="Resumo do contrato">
      <div><span className="gestao-eyebrow">Painel operacional</span><h2>Decida o próximo movimento</h2><p>Use este recorte para localizar gargalos, revisar prazos e abrir o contexto certo sem perder o contrato atual.</p></div>
      <div className="gestao-dashboard-filter"><label htmlFor="gestao-dashboard-estado">Estado</label><select id="gestao-dashboard-estado" value={estado} onChange={(event) => { const next = new URLSearchParams(searchParams); if (event.target.value) next.set('estado', event.target.value); else next.delete('estado'); setSearchParams(next) }}><option value="">Todos os estados</option>{dashboard.estados.map((item) => <option value={item} key={item}>{item}</option>)}</select>{estado && <button type="button" className="gestao-button-link" onClick={() => { const next = new URLSearchParams(searchParams); next.delete('estado'); setSearchParams(next) }}>Limpar filtro</button>}</div>
    </section>
    <p className="gestao-dashboard-live" aria-live="polite">{totals.protocolos} protocolos e {totals.pontos} pontos no recorte atual.</p>
    <section className="gestao-dashboard-charts" aria-label="Indicadores visuais">
      <div className="gestao-chart-card" role="img" aria-label={`Distribuição de ${dashboard.totalProtocolos} protocolos por status` }><div className="gestao-section-head"><div><span className="gestao-eyebrow">Distribuição</span><h3>Status dos protocolos</h3></div><strong>{dashboard.totalProtocolos}</strong></div>{dashboard.status.length ? <div className="gestao-bars">{dashboard.status.map((item) => <div className="gestao-bar-row" key={item.status}><span>{nomeGestao(item.status)}</span><div className="gestao-bar-track"><i style={{ inlineSize: `${dashboard.totalProtocolos ? Math.max(8, (item.total / dashboard.totalProtocolos) * 100) : 0}%` }} /></div><strong>{item.total}</strong></div>)}</div> : <p className="gestao-chart-empty">Nenhum protocolo neste recorte.</p>}</div>
      <div className="gestao-chart-card gestao-chart-donut" role="img" aria-label="Percentual de pontos concluídos"><div><span className="gestao-eyebrow">Pontos</span><h3>Conclusão operacional</h3></div>{dashboard.totalPontos ? <><div className="gestao-donut" style={{ '--gestao-donut': `${Math.round(((dashboard.indicadores.regularizados + dashboard.indicadores.aprovadosImplantacao) / dashboard.totalPontos) * 100)}%` } as React.CSSProperties}><strong>{Math.round(((dashboard.indicadores.regularizados + dashboard.indicadores.aprovadosImplantacao) / dashboard.totalPontos) * 100)}%</strong></div><p>{dashboard.indicadores.regularizados + dashboard.indicadores.aprovadosImplantacao} de {dashboard.totalPontos} pontos concluídos</p></> : <p className="gestao-chart-empty">Nenhum ponto neste recorte.</p>}</div>
    </section>
    <section className="gestao-health" aria-label="Saúde operacional do contrato">
      <div className="gestao-health-main">
        <div><span className="gestao-eyebrow">Saúde operacional</span><h2>{totals.atrasados ? 'Atenção necessária' : totals.protocolos ? 'Operação sob controle' : 'Pronto para começar'}</h2><p>{totals.atrasados ? `${totals.atrasados} protocolo${totals.atrasados === 1 ? '' : 's'} com prazo vencido pede${totals.atrasados === 1 ? '' : 'm'} ação.` : 'Acompanhe prazos, aprovações e localização dos pontos em um só lugar.'}</p></div>
        <div className="gestao-health-ring" style={{ '--gestao-progress': `${totals.protocolos ? Math.round(((totals.protocolos - totals.atrasados) / totals.protocolos) * 100) : 0}%` } as React.CSSProperties}><strong>{totals.protocolos ? Math.max(0, Math.round(((totals.protocolos - totals.atrasados) / totals.protocolos) * 100)) : 0}%</strong><span>em dia</span></div>
      </div>
      <div className="gestao-health-stats"><div className="gestao-health-stat"><span>Protocolos</span><strong>{totals.protocolos}</strong><small>{totals.paralisados} paralisados</small></div><div className="gestao-health-stat"><span>Pontos</span><strong>{totals.pontos}</strong><small>{totals.realizados} realizados</small></div><div className="gestao-health-stat gestao-health-stat-success"><span>Entregas</span><strong>{totals.realizados}</strong><small>{totals.previstos} previstas</small></div><div className={`gestao-health-stat ${totals.atrasados ? 'gestao-health-stat-danger' : 'gestao-health-stat-success'}`}><span>Prazo</span><strong>{totals.atrasados}</strong><small>{totals.atrasados ? 'em atraso' : 'sem atrasos'}</small></div></div>
    </section>
    <section className="gestao-attention" aria-label="Atenção operacional"><div><span className="gestao-eyebrow">Atenção operacional</span><p>Protocolos que pedem acompanhamento neste recorte.</p></div><div className="gestao-attention-items"><span><strong>{prioridades.emCorrecao}</strong> em correção</span><span><strong>{prioridades.aguardandoTerceiros}</strong> aguardando terceiros</span><span><strong>{prioridades.vencidos}</strong> com prazo vencido</span><span><strong>{prioridades.proximos}</strong> com entrega em até 7 dias</span></div></section>
<section className="gestao-dashboard-map"><div className="gestao-section-head"><div><span className="gestao-eyebrow">Visão territorial</span><h2>Mapa operacional</h2><p>Uma prévia dos pontos localizados neste contrato.</p></div><Link className="gestao-button-secondary" to={`${base}/mapa`}>Abrir mapa completo ↗</Link></div><div className="gestao-map-preview"><MapaLeaflet pontos={filtrado.pontos} protocolos={filtrado.protocolos} onSelectPoint={() => undefined} height={220} fitBoundsOnChange={false} /></div></section>
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
