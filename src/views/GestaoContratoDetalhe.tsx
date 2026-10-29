import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useOutletContext, useParams } from 'react-router-dom'
import { getContrato, listPontos, listProtocolos, filtrarGestao, indicadoresGestao, pontoStatus, type Contrato, type Ponto, type Protocolo } from '../services/gestaoContratos'
import MapaLeaflet from '../components/gestao/MapaLeaflet'
import ModalGestao from '../components/gestao/ModalGestao'
import { classificarPrazo, resumirPrioridades } from '../utils/gestaoPrioridades'
import './GestaoContratos.css'

export type GestaoContext = { contrato: Contrato; protocolos: Protocolo[]; pontos: Ponto[]; refresh: () => Promise<void> }
export default function GestaoContratoDetalhe() {
  const { contratoId = '' } = useParams()
  const location = useLocation()
  const [contrato, setContrato] = useState<Contrato | null>(null)
  const [protocolos, setProtocolos] = useState<Protocolo[]>([])
  const [pontos, setPontos] = useState<Ponto[]>([])
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState({ estado: '', concessionaria: '', rodovia: '', protocoloId: '', pontoCodigo: '', status: '', tipo: '', etapa: '', inicio: '', fim: '' })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null)
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
  const prioridades = resumirPrioridades(filtrado.protocolos)
  const selectedPoint = filtrado.pontos.find((ponto) => ponto.id === selectedPointId) ?? null
  const selectedProtocol = selectedPoint ? filtrado.protocolos.find((protocolo) => protocolo.id === selectedPoint.protocoloId) : undefined
  useEffect(() => {
    if (selectedPointId && !selectedPoint) setSelectedPointId(null)
  }, [selectedPointId, selectedPoint])
  if (!contrato) return <div className="gestao-page"><Link to="/gestao-contratos">Voltar aos contratos</Link><p role="alert">{error || 'Carregando contrato...'}</p></div>
  const base = `/gestao-contratos/${contratoId}`
  return <div className="gestao-page">
    <header className="gestao-header"><div><Link className="gestao-back" to="/gestao-contratos">← Todos os contratos</Link><span className="gestao-eyebrow">Contrato selecionado</span><h1>{contrato.nome}</h1><p>Protocolos, pontos e entregas no mesmo contexto.</p></div></header>
    <nav aria-label="Áreas do contrato" className="gestao-nav">
      <NavLink end to={base}>Visão geral</NavLink><NavLink to={`${base}/protocolos`}>Protocolos</NavLink><NavLink to={`${base}/pontos`}>Pontos</NavLink><NavLink to={`${base}/planejamento`}>Planejamento</NavLink><NavLink to={`${base}/mapa`}>Mapa</NavLink>
    </nav>
    {error && <p className="gestao-error" role="alert">{error}</p>}
    <section className="gestao-dashboard-intro" aria-label="Resumo do contrato">
      <div><span className="gestao-eyebrow">Painel operacional</span><h2>Decida o próximo movimento</h2><p>Use este recorte para localizar gargalos, revisar prazos e abrir o contexto certo sem perder o contrato atual.</p></div>
      <span className="gestao-status">{protocolos.length} protocolos · {pontos.length} pontos</span>
    </section>
    <div className="gestao-filter-bar"><span>Recorte do contrato</span><div><span>{Object.values(filtro).filter(Boolean).length} filtros ativos</span><button type="button" className="gestao-button-secondary" aria-expanded={showFilters} aria-controls="gestao-filtros" onClick={() => setShowFilters(!showFilters)}>{showFilters ? 'Ocultar filtros' : 'Filtrar dados'}</button></div></div>
    <ModalGestao open={showFilters} title="Filtrar dados" description="Refine indicadores, mapa e listas sem sair da visão do contrato." labelledBy="gestao-filtros-title" onClose={() => setShowFilters(false)}>
      <div id="gestao-filtros" className="gestao-filtros">
        {([['estado', 'Estado'], ['concessionaria', 'Concessionária'], ['rodovia', 'Rodovia'], ['status', 'Status'], ['tipo', 'Classificação'], ['etapa', 'Etapa']] as const).map(([key, label]) => <label key={key}>{label}<select value={filtro[key]} onChange={(event) => setFiltro({ ...filtro, [key]: event.target.value })}><option value="">Todos</option>{Array.from(new Set((key === 'status' ? [...pontos.map((p) => p.resultado), ...protocolos.map((p) => p.status)] : key === 'etapa' ? protocolos.map((p) => p.etapa) : pontos.map((p) => p[key as 'estado' | 'concessionaria' | 'rodovia' | 'tipo'])).filter((item): item is string => !!item))).map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>)}
        <label>Protocolo<select value={filtro.protocoloId} onChange={(event) => setFiltro({ ...filtro, protocoloId: event.target.value })}><option value="">Todos</option>{protocolos.map((protocolo) => <option key={protocolo.id} value={protocolo.id}>{protocolo.titulo}</option>)}</select></label><label>Código do ponto<input value={filtro.pontoCodigo} placeholder="Buscar código" onChange={(event) => setFiltro({ ...filtro, pontoCodigo: event.target.value })} /></label>
        <label>Previsão inicial<input type="date" value={filtro.inicio} onChange={(event) => setFiltro({ ...filtro, inicio: event.target.value })} /></label><label>Previsão final<input type="date" value={filtro.fim} onChange={(event) => setFiltro({ ...filtro, fim: event.target.value })} /></label><button type="button" className="gestao-button-secondary" onClick={() => { setFiltro({ estado: '', concessionaria: '', rodovia: '', protocoloId: '', pontoCodigo: '', status: '', tipo: '', etapa: '', inicio: '', fim: '' }); setShowFilters(false) }}>Limpar filtros</button>
      </div>
    </ModalGestao>
    <section className="gestao-health" aria-label="Saúde operacional do contrato">
      <div className="gestao-health-main">
        <div><span className="gestao-eyebrow">Saúde operacional</span><h2>{totals.atrasados ? 'Atenção necessária' : totals.protocolos ? 'Operação sob controle' : 'Pronto para começar'}</h2><p>{totals.atrasados ? `${totals.atrasados} protocolo${totals.atrasados === 1 ? '' : 's'} com prazo vencido pede${totals.atrasados === 1 ? '' : 'm'} ação.` : 'Acompanhe prazos, aprovações e localização dos pontos em um só lugar.'}</p></div>
        <div className="gestao-health-ring" style={{ '--gestao-progress': `${totals.protocolos ? Math.round(((totals.protocolos - totals.atrasados) / totals.protocolos) * 100) : 0}%` } as React.CSSProperties}><strong>{totals.protocolos ? Math.max(0, Math.round(((totals.protocolos - totals.atrasados) / totals.protocolos) * 100)) : 0}%</strong><span>em dia</span></div>
      </div>
      <div className="gestao-health-stats"><div className="gestao-health-stat"><span>Protocolos</span><strong>{totals.protocolos}</strong><small>{totals.paralisados} paralisados</small></div><div className="gestao-health-stat"><span>Pontos</span><strong>{totals.pontos}</strong><small>{totals.realizados} realizados</small></div><div className="gestao-health-stat gestao-health-stat-success"><span>Entregas</span><strong>{totals.realizados}</strong><small>{totals.previstos} previstas</small></div><div className={`gestao-health-stat ${totals.atrasados ? 'gestao-health-stat-danger' : 'gestao-health-stat-success'}`}><span>Prazo</span><strong>{totals.atrasados}</strong><small>{totals.atrasados ? 'em atraso' : 'sem atrasos'}</small></div></div>
    </section>
    <section className="gestao-attention" aria-label="Atenção operacional"><div><span className="gestao-eyebrow">Atenção operacional</span><p>Protocolos que pedem acompanhamento neste recorte.</p></div><div className="gestao-attention-items"><span><strong>{prioridades.emCorrecao}</strong> em correção</span><span><strong>{prioridades.aguardandoTerceiros}</strong> aguardando terceiros</span><span><strong>{prioridades.vencidos}</strong> com prazo vencido</span><span><strong>{prioridades.proximos}</strong> com entrega em até 7 dias</span></div></section>
{location.pathname === base && <section className="gestao-dashboard-map"><div className="gestao-section-head"><div><span className="gestao-eyebrow">Visão territorial</span><h2>Mapa operacional</h2><p>Selecione um marcador para consultar andamento e informações do ponto.</p></div><span className="gestao-count">{filtrado.pontos.filter((ponto) => Number.isFinite(ponto.latitude) && Number.isFinite(ponto.longitude)).length} localizados</span></div><MapaLeaflet pontos={filtrado.pontos} protocolos={filtrado.protocolos} selectedPointId={selectedPointId ?? undefined} onSelectPoint={(ponto) => setSelectedPointId(ponto.id)} /><div className="gestao-map-legend"><strong>Legenda</strong><span><i className="gestao-legend-dot gestao-legend-success" /> Concluído</span><span><i className="gestao-legend-dot gestao-legend-attention" /> Atenção</span><span><i className="gestao-legend-dot gestao-legend-progress" /> Em andamento</span><span><i className="gestao-legend-dot gestao-legend-neutral" /> Não iniciado</span></div>{selectedPoint ? <div className="gestao-panel gestao-map-detail"><div className="gestao-section-head"><div><span className="gestao-eyebrow">Ponto selecionado</span><h3>{selectedPoint.codigo}</h3><p>{selectedPoint.estado} · {selectedPoint.concessionaria} · {selectedPoint.rodovia} km {selectedPoint.km}</p></div><button type="button" className="gestao-button-secondary" onClick={() => setSelectedPointId(null)}>Fechar detalhes</button></div><div className="gestao-point-detail-grid"><div><span>Status</span><strong className="gestao-status">{pontoStatus(selectedPoint, selectedProtocol).valor.replaceAll('_', ' ')}</strong></div><div><span>Tipo</span><strong>{selectedPoint.tipo === 'regularizacao' ? 'Regularização' : 'Nova implantação'}</strong></div><div><span>Resultado</span><strong>{selectedPoint.resultado ? selectedPoint.resultado.replaceAll('_', ' ') : 'Pendente'}</strong></div><div><span>Protocolo</span><strong>{selectedProtocol?.titulo || 'Não encontrado'}</strong></div><div><span>Previsão</span><strong>{selectedPoint.previsao || selectedProtocol?.previsao || 'Não definida'}</strong></div><div><span>Realizado</span><strong>{selectedPoint.realizadoEm || 'Pendente'}</strong></div></div>{selectedProtocol && <Link to={`${base}/protocolos/${selectedProtocol.id}?ponto=${selectedPoint.id}`}>Abrir andamento completo do protocolo ↗</Link>}</div> : <div className="gestao-map-empty">Clique em um ponto no mapa para abrir seus dados operacionais.</div>}<div className="gestao-map-pending"><strong>Pontos sem coordenadas</strong><span>{filtrado.pontos.filter((ponto) => !Number.isFinite(ponto.latitude) || !Number.isFinite(ponto.longitude)).length} pendentes de localização</span>{filtrado.pontos.filter((ponto) => !Number.isFinite(ponto.latitude) || !Number.isFinite(ponto.longitude)).map((ponto) => <Link key={ponto.id} to={`${base}/mapa?ponto=${ponto.id}`}>{ponto.codigo} · {ponto.rodovia} km {ponto.km} — registrar localização ↗</Link>)}</div></section>}
    <Outlet context={{ contrato, protocolos: filtrado.protocolos, pontos: filtrado.pontos, refresh } satisfies GestaoContext} />
  </div>
}
export function GestaoVisaoGeral() {
  const { contratoId = '' } = useParams()
  const { protocolos } = useOutletContext<GestaoContext>()
  const pendentes = [...protocolos].filter((item) => item.status !== 'concluido' && item.etapa !== 'concluido' && (item.status === 'em_correcao' || item.status === 'aguardando_terceiros' || ['atrasado', 'proximo'].includes(classificarPrazo(item.previsao).prioridade))).sort((a, b) => (a.previsao || '9999-12-31').localeCompare(b.previsao || '9999-12-31')).slice(0, 5)
  return <section><div className="gestao-section-head"><div><h2>Visão geral</h2><p>Escolha uma área para trabalhar neste contrato.</p></div></div><div className="gestao-grid gestao-quicklinks"><Link className="gestao-card" to={`/gestao-contratos/${contratoId}/protocolos`}><span className="gestao-eyebrow">Tramitação</span><strong>Protocolos</strong><span>Acompanhar etapas, pareceres e movimentações ↗</span></Link><Link className="gestao-card" to={`/gestao-contratos/${contratoId}/pontos`}><span className="gestao-eyebrow">Localizações</span><strong>Pontos</strong><span>Consultar classificação e resultado de cada ponto ↗</span></Link><Link className="gestao-card" to={`/gestao-contratos/${contratoId}/planejamento`}><span className="gestao-eyebrow">Entregas</span><strong>Planejamento</strong><span>Comparar previsto e realizado ↗</span></Link><Link className="gestao-card" to={`/gestao-contratos/${contratoId}/mapa`}><span className="gestao-eyebrow">Território</span><strong>Mapa esquemático</strong><span>Ver coordenadas disponíveis e pendentes ↗</span></Link></div><div className="gestao-section-head"><div><h2>Para acompanhar</h2><p>Correções, retornos de terceiros e entregas próximas.</p></div><Link to={`/gestao-contratos/${contratoId}/protocolos`}>Ver todos os protocolos ↗</Link></div>{pendentes.length ? <ul className="gestao-list">{pendentes.map((item) => { const prazo = classificarPrazo(item.previsao); return <li key={item.id}><Link className="gestao-list-link" to={`/gestao-contratos/${contratoId}/protocolos/${item.id}`}><span className="gestao-list-main"><strong>{item.titulo}</strong><small>{item.concessionaria} · {item.rodovia}</small></span><span className="gestao-status">{item.status.replaceAll('_', ' ')}</span><span className={`gestao-deadline gestao-deadline-${prazo.prioridade}`}>{prazo.rotulo}</span><span aria-hidden="true">↗</span></Link></li> })}</ul> : <div className="gestao-empty"><h3>Nenhuma pendência destacada</h3><p>Não há protocolos em correção, aguardando terceiros ou com entrega nos próximos 7 dias neste recorte.</p></div>}</section>
}
