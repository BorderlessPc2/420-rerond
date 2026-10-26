import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useOutletContext, useParams } from 'react-router-dom'
import { getContrato, listPontos, listProtocolos, filtrarGestao, indicadoresGestao, type Contrato, type Ponto, type Protocolo } from '../services/gestaoContratos'
import { classificarPrazo, resumirPrioridades } from '../utils/gestaoPrioridades'
import './GestaoContratos.css'

export type GestaoContext = { contrato: Contrato; protocolos: Protocolo[]; pontos: Ponto[]; refresh: () => Promise<void> }
export default function GestaoContratoDetalhe() {
  const { contratoId = '' } = useParams()
  const [contrato, setContrato] = useState<Contrato | null>(null)
  const [protocolos, setProtocolos] = useState<Protocolo[]>([])
  const [pontos, setPontos] = useState<Ponto[]>([])
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState({ estado: '', concessionaria: '', rodovia: '', status: '', tipo: '', etapa: '', inicio: '', fim: '' })
  const [showFilters, setShowFilters] = useState(false)
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
  if (!contrato) return <div className="gestao-page"><Link to="/gestao-contratos">Voltar aos contratos</Link><p role="alert">{error || 'Carregando contrato...'}</p></div>
  const base = `/gestao-contratos/${contratoId}`
  return <div className="gestao-page">
    <header className="gestao-header"><div><Link className="gestao-back" to="/gestao-contratos">← Todos os contratos</Link><span className="gestao-eyebrow">Contrato selecionado</span><h1>{contrato.nome}</h1><p>Protocolos, pontos e entregas no mesmo contexto.</p></div></header>
    <nav aria-label="Áreas do contrato" className="gestao-nav">
      <NavLink end to={base}>Visão geral</NavLink><NavLink to={`${base}/protocolos`}>Protocolos</NavLink><NavLink to={`${base}/pontos`}>Pontos</NavLink><NavLink to={`${base}/planejamento`}>Planejamento</NavLink><NavLink to={`${base}/mapa`}>Mapa</NavLink>
    </nav>
    {error && <p className="gestao-error" role="alert">{error}</p>}
    <div className="gestao-filter-bar"><span>Recorte do contrato</span><div><span>{Object.values(filtro).filter(Boolean).length} filtros ativos</span><button type="button" className="gestao-button-secondary" aria-expanded={showFilters} aria-controls="gestao-filtros" onClick={() => setShowFilters(!showFilters)}>{showFilters ? 'Ocultar filtros' : 'Filtrar dados'}</button></div></div>
    {showFilters && <div id="gestao-filtros" className="gestao-filtros">
      {([['estado', 'Estado'], ['concessionaria', 'Concessionária'], ['rodovia', 'Rodovia'], ['status', 'Status'], ['tipo', 'Classificação'], ['etapa', 'Etapa']] as const).map(([key, label]) => <label key={key}>{label}<select value={filtro[key]} onChange={(event) => setFiltro({ ...filtro, [key]: event.target.value })}><option value="">Todos</option>{Array.from(new Set((key === 'status' ? [...pontos.map((p) => p.resultado), ...protocolos.map((p) => p.status)] : key === 'etapa' ? protocolos.map((p) => p.etapa) : pontos.map((p) => p[key as 'estado' | 'concessionaria' | 'rodovia' | 'tipo'])).filter((item): item is string => !!item))).map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>)}
      <label>Previsão inicial<input type="date" value={filtro.inicio} onChange={(event) => setFiltro({ ...filtro, inicio: event.target.value })} /></label><label>Previsão final<input type="date" value={filtro.fim} onChange={(event) => setFiltro({ ...filtro, fim: event.target.value })} /></label><button type="button" className="gestao-button-secondary" onClick={() => setFiltro({ estado: '', concessionaria: '', rodovia: '', status: '', tipo: '', etapa: '', inicio: '', fim: '' })}>Limpar filtros</button>
    </div>}
    <div className="gestao-metrics"><div><span>Protocolos</span><strong>{totals.protocolos}</strong></div><div><span>Pontos</span><strong>{totals.pontos}</strong></div><div><span>Regularizados</span><strong>{totals.regularizados}</strong></div><div><span>Aprovados para implantação</span><strong>{totals.aprovadosImplantacao}</strong></div><div><span>Pontos previstos</span><strong>{totals.previstos}</strong></div><div><span>Pontos realizados</span><strong>{totals.realizados}</strong></div></div>
    <section className="gestao-attention" aria-label="Atenção operacional"><div><span className="gestao-eyebrow">Atenção operacional</span><p>Protocolos que pedem acompanhamento neste recorte.</p></div><div className="gestao-attention-items"><span><strong>{prioridades.emCorrecao}</strong> em correção</span><span><strong>{prioridades.aguardandoTerceiros}</strong> aguardando terceiros</span><span><strong>{prioridades.vencidos}</strong> com prazo vencido</span><span><strong>{prioridades.proximos}</strong> com entrega em até 7 dias</span></div></section>
    <Outlet context={{ contrato, protocolos: filtrado.protocolos, pontos: filtrado.pontos, refresh } satisfies GestaoContext} />
  </div>
}
export function GestaoVisaoGeral() {
  const { contratoId = '' } = useParams()
  const { protocolos } = useOutletContext<GestaoContext>()
  const pendentes = [...protocolos].filter((item) => item.status !== 'concluido' && item.etapa !== 'concluido' && (item.status === 'em_correcao' || item.status === 'aguardando_terceiros' || ['atrasado', 'proximo'].includes(classificarPrazo(item.previsao).prioridade))).sort((a, b) => (a.previsao || '9999-12-31').localeCompare(b.previsao || '9999-12-31')).slice(0, 5)
  return <section><div className="gestao-section-head"><div><h2>Visão geral</h2><p>Escolha uma área para trabalhar neste contrato.</p></div></div><div className="gestao-grid gestao-quicklinks"><Link className="gestao-card" to={`/gestao-contratos/${contratoId}/protocolos`}><span className="gestao-eyebrow">Tramitação</span><strong>Protocolos</strong><span>Acompanhar etapas, pareceres e movimentações ↗</span></Link><Link className="gestao-card" to={`/gestao-contratos/${contratoId}/pontos`}><span className="gestao-eyebrow">Localizações</span><strong>Pontos</strong><span>Consultar classificação e resultado de cada ponto ↗</span></Link><Link className="gestao-card" to={`/gestao-contratos/${contratoId}/planejamento`}><span className="gestao-eyebrow">Entregas</span><strong>Planejamento</strong><span>Comparar previsto e realizado ↗</span></Link><Link className="gestao-card" to={`/gestao-contratos/${contratoId}/mapa`}><span className="gestao-eyebrow">Território</span><strong>Mapa esquemático</strong><span>Ver coordenadas disponíveis e pendentes ↗</span></Link></div><div className="gestao-section-head"><div><h2>Para acompanhar</h2><p>Correções, retornos de terceiros e entregas próximas.</p></div><Link to={`/gestao-contratos/${contratoId}/protocolos`}>Ver todos os protocolos ↗</Link></div>{pendentes.length ? <ul className="gestao-list">{pendentes.map((item) => { const prazo = classificarPrazo(item.previsao); return <li key={item.id}><Link className="gestao-list-link" to={`/gestao-contratos/${contratoId}/protocolos/${item.id}`}><span className="gestao-list-main"><strong>{item.titulo}</strong><small>{item.concessionaria} · {item.rodovia}</small></span><span className="gestao-status">{item.status.replaceAll('_', ' ')}</span><span className={`gestao-deadline gestao-deadline-${prazo.prioridade}`}>{prazo.rotulo}</span><span aria-hidden="true">↗</span></Link></li> })}</ul> : <div className="gestao-empty"><h3>Nenhuma pendência destacada</h3><p>Não há protocolos em correção, aguardando terceiros ou com entrega nos próximos 7 dias neste recorte.</p></div>}</section>
}
