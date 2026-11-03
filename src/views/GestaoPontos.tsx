import { useMemo, useState } from 'react'
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { atualizarPonto, atualizarPontoCompleto, criarPonto, pontoStatus, vincularPontoProtocolo, type Ponto } from '../services/gestaoContratos'
import type { PontoInput } from '../services/gestaoValidacao'
import type { GestaoContext } from './GestaoContratoDetalhe'
import ModalGestao from '../components/gestao/ModalGestao'
import { ordenarPontos, type GestaoOrdemPonto } from '../services/gestaoLista'

export default function GestaoPontos() {
  const { contratoId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { protocolos, pontos, refresh } = useOutletContext<GestaoContext>()
  const [ordem, setOrdem] = useState<GestaoOrdemPonto>('codigo')
  const busca = searchParams.get('q') ?? ''
  const pontosLista = useMemo(() => ordenarPontos(pontos, ordem), [pontos, ordem])
  const setBusca = (value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value.trim()) next.set('q', value)
    else next.delete('q')
    setSearchParams(next)
  }
  const [protocoloId, setProtocoloId] = useState(''), [codigo, setCodigo] = useState(''), [estado, setEstado] = useState(''), [km, setKm] = useState(''), [tipo, setTipo] = useState<Ponto['tipo']>('nova_implantacao'), [latitude, setLatitude] = useState(''), [longitude, setLongitude] = useState(''), [precisao, setPrecisao] = useState<Ponto['precisao']>('confirmada'), [error, setError] = useState(''), [success, setSuccess] = useState('')
  const [creating, setCreating] = useState(false), [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Ponto | null>(null)
  const [editCodigo, setEditCodigo] = useState(''), [editEstado, setEditEstado] = useState(''), [editKm, setEditKm] = useState(''), [editTipo, setEditTipo] = useState<Ponto['tipo']>('nova_implantacao'), [editLatitude, setEditLatitude] = useState(''), [editLongitude, setEditLongitude] = useState(''), [editPrecisao, setEditPrecisao] = useState<Ponto['precisao']>('confirmada'), [editPrevisao, setEditPrevisao] = useState(''), [editRealizado, setEditRealizado] = useState(''), [editResultado, setEditResultado] = useState<Ponto['resultado'] | ''>('')
  const [concessionaria, setConcessionaria] = useState(''), [rodovia, setRodovia] = useState('')

  const openEdit = (ponto: Ponto) => {
    setEditing(ponto)
    setEditCodigo(ponto.codigo)
    setEditEstado(ponto.estado)
    setEditKm(ponto.km)
    setEditTipo(ponto.tipo)
    setEditLatitude(Number.isFinite(ponto.latitude) ? String(ponto.latitude) : '')
    setEditLongitude(Number.isFinite(ponto.longitude) ? String(ponto.longitude) : '')
    setEditPrecisao(ponto.precisao ?? 'confirmada')
    setEditPrevisao(ponto.previsao ?? '')
    setEditRealizado(ponto.realizadoEm ?? '')
    setEditResultado(ponto.resultado ?? '')
    setError('')
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    const proc = protocolos.find((p) => p.id === protocoloId)
    if (Boolean(latitude) !== Boolean(longitude)) { setError('Informe latitude e longitude juntas.'); return }
    if (!proc && (!concessionaria.trim() || !rodovia.trim())) { setError('Informe concessionária e rodovia para ponto sem protocolo.'); return }
    setSaving(true)
    try { await criarPonto(contratoId, protocoloId || null, { codigo, estado, km, tipo, concessionaria: proc?.concessionaria ?? concessionaria, rodovia: proc?.rodovia ?? rodovia, ...(latitude && longitude ? { latitude: Number(latitude), longitude: Number(longitude), precisao } : {}) }); setCodigo(''); setEstado(''); setKm(''); setLatitude(''); setLongitude(''); setConcessionaria(''); setRodovia(''); setCreating(false); await refresh(); setError('') } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao criar ponto.') } finally { setSaving(false) }
  }

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editing) return
    if (Boolean(editLatitude) !== Boolean(editLongitude)) { setError('Informe latitude e longitude juntas.'); return }
    const proc = editing.protocoloId ? protocolos.find((item) => item.id === editing.protocoloId) : undefined
    const input: PontoInput = {
      codigo: editCodigo,
      estado: editEstado,
      km: editKm,
      tipo: editTipo,
      concessionaria: proc?.concessionaria ?? editing.concessionaria,
      rodovia: proc?.rodovia ?? editing.rodovia,
      previsao: editPrevisao,
      realizadoEm: editRealizado,
      ...(editResultado ? { resultado: editResultado } : {}),
      ...(editLatitude && editLongitude ? { latitude: Number(editLatitude), longitude: Number(editLongitude), precisao: editPrecisao } : {}),
    }
    setSaving(true)
    setSuccess('')
    try {
      await atualizarPontoCompleto(contratoId, editing.id, input)
      setEditing(null)
      setSuccess(`Ponto ${input.codigo} atualizado.`)
      await refresh()
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao editar ponto.')
    } finally {
      setSaving(false)
    }
  }

  const linkPoint = async (ponto: Ponto, nextId: string) => { if (!nextId) return; setSaving(true); try { await vincularPontoProtocolo(contratoId, ponto.id, nextId); await refresh(); setError('') } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao vincular ponto.') } finally { setSaving(false) } }
  const setResultado = async (ponto: Ponto, resultado: Ponto['resultado']) => {
    try { await atualizarPonto(contratoId, ponto.id, { resultado }); await refresh(); setError('') } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao atualizar ponto.') }
  }

  return <section><div className="gestao-section-head"><div><h2>Pontos</h2><p>{pontos.length} {pontos.length === 1 ? 'ponto no recorte' : 'pontos no recorte'}</p></div><button type="button" aria-haspopup="dialog" onClick={() => setCreating(true)}>Novo ponto</button></div>
    <div className="gestao-list-controls"><label>Busca<input type="search" value={busca} placeholder="Código, estado, rodovia…" onChange={(event) => setBusca(event.target.value)} /></label><label>Ordenar por<select value={ordem} onChange={(event) => setOrdem(event.target.value as GestaoOrdemPonto)}><option value="codigo">Código</option><option value="km">Quilômetro</option></select></label></div>{error && <p className="gestao-error" role="alert">{error}</p>}{success && <p className="gestao-success" role="status">{success}</p>}
    <ModalGestao open={creating} title="Novo ponto" description="Cadastre localização e vincule protocolo agora ou depois." labelledBy="gestao-novo-ponto-title" onClose={() => setCreating(false)}><form className="gestao-form gestao-form-grid" onSubmit={(event) => void save(event)}><label>Protocolo<select name="protocolo" value={protocoloId} onChange={(e) => setProtocoloId(e.target.value)}><option value="">Sem protocolo</option>{protocolos.map((p) => <option key={p.id} value={p.id}>{p.titulo} · {p.rodovia}</option>)}</select></label>{!protocoloId && <><label>Concessionária<input name="concessionaria" required value={concessionaria} onChange={(e) => setConcessionaria(e.target.value)} /></label><label>Rodovia<input name="rodovia" required value={rodovia} onChange={(e) => setRodovia(e.target.value)} /></label></>}<label>Código<input name="codigo" required value={codigo} onChange={(e) => setCodigo(e.target.value)} /></label><label>Estado<input name="estado" required value={estado} onChange={(e) => setEstado(e.target.value)} /></label><label>Quilômetro<input name="km" required value={km} onChange={(e) => setKm(e.target.value)} /></label><label>Classificação<select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as Ponto['tipo'])}><option value="nova_implantacao">Nova implantação</option><option value="regularizacao">Regularização (já instalado)</option></select></label><label>Latitude<input name="latitude" type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} /></label><label>Longitude<input name="longitude" type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} /></label><label>Precisão<select name="precisao" value={precisao} onChange={(e) => setPrecisao(e.target.value as Ponto['precisao'])}><option value="confirmada">Confirmada</option><option value="aproximada">Aproximada</option></select></label><button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Criar ponto'}</button></form></ModalGestao>
    <ModalGestao open={Boolean(editing)} title="Editar ponto" description="Corrija localização e planejamento sem recriar o ponto." labelledBy="gestao-editar-ponto-title" onClose={() => setEditing(null)}>{editing && <form className="gestao-form gestao-form-grid" onSubmit={(event) => void saveEdit(event)}><label>Código<input name="codigo" required value={editCodigo} onChange={(e) => setEditCodigo(e.target.value)} /></label><label>Estado<input name="estado" required value={editEstado} onChange={(e) => setEditEstado(e.target.value)} /></label><label>Quilômetro<input name="km" required value={editKm} onChange={(e) => setEditKm(e.target.value)} /></label><label>Classificação<select name="tipo" value={editTipo} onChange={(e) => setEditTipo(e.target.value as Ponto['tipo'])}><option value="nova_implantacao">Nova implantação</option><option value="regularizacao">Regularização</option></select></label><label>Resultado operacional<select value={editResultado} onChange={(e) => setEditResultado((e.target.value || '') as Ponto['resultado'] | '')}><option value="">Ainda não concluído</option><option value={editTipo === 'regularizacao' ? 'regularizado' : 'aprovado_implantacao'}>{editTipo === 'regularizacao' ? 'Regularizado' : 'Aprovado para implantação'}</option></select></label><label>Latitude<input name="latitude" type="number" step="any" value={editLatitude} onChange={(e) => setEditLatitude(e.target.value)} /></label><label>Longitude<input name="longitude" type="number" step="any" value={editLongitude} onChange={(e) => setEditLongitude(e.target.value)} /></label><label>Precisão<select name="precisao" value={editPrecisao} onChange={(e) => setEditPrecisao(e.target.value as Ponto['precisao'])}><option value="confirmada">Confirmada</option><option value="aproximada">Aproximada</option></select></label><label>Previsão<input name="previsao" type="date" value={editPrevisao} onChange={(e) => setEditPrevisao(e.target.value)} /></label><label>Realizado<input name="realizadoEm" type="date" value={editRealizado} onChange={(e) => setEditRealizado(e.target.value)} /></label>{editing.protocoloId && <p><small>Concessionária e rodovia seguem o protocolo vinculado. Para mudar vínculo, use a lista.</small></p>}<div className="gestao-form-footer"><button type="button" className="gestao-button-secondary" onClick={() => setEditing(null)}>Cancelar</button><button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar alterações'}</button></div></form>}</ModalGestao>
    {pontosLista.length ? <ul className="gestao-point-list">{pontosLista.map((p) => { const proc = protocolos.find((item) => item.id === p.protocoloId); const situacao = pontoStatus(p, proc); return <li className="gestao-point-row" key={p.id}><div><strong>{p.codigo}</strong><span>{p.estado} · {p.rodovia} km {p.km} · {p.concessionaria}</span><small>{p.tipo === 'regularizacao' ? 'Regularização' : 'Nova implantação'} · {!Number.isFinite(p.latitude) || !Number.isFinite(p.longitude) ? 'Coordenadas pendentes' : `${p.latitude}, ${p.longitude} (${p.precisao || 'precisão não informada'})`}</small></div><div className="gestao-point-actions"><span className="gestao-status">{situacao.valor.replaceAll('_', ' ')}{situacao.herdado ? ' · protocolo' : ''}</span><button type="button" className="gestao-button-secondary" onClick={() => openEdit(p)}>Editar</button><label>Resultado operacional<select value={p.resultado ?? ''} onChange={(e) => void setResultado(p, (e.target.value || undefined) as Ponto['resultado'])}><option value="">Ainda não concluído</option><option value={p.tipo === 'regularizacao' ? 'regularizado' : 'aprovado_implantacao'}>{p.tipo === 'regularizacao' ? 'Regularizado' : 'Aprovado para implantação'}</option></select></label>{!p.protocoloId && <label>Vincular protocolo<select value="" disabled={saving} onChange={(e) => void linkPoint(p, e.target.value)}><option value="">Selecionar</option>{protocolos.map((item) => <option key={item.id} value={item.id}>{item.titulo} · {item.rodovia}</option>)}</select></label>}<Link to={`/gestao-contratos/${contratoId}/mapa?ponto=${p.id}`}>Ver no mapa ↗</Link>{p.protocoloId && <Link to={`/gestao-contratos/${contratoId}/protocolos/${p.protocoloId}?ponto=${p.id}`}>Ver protocolo ↗</Link>}</div></li> })}</ul> : <div className="gestao-empty"><h3>Nenhum ponto neste recorte</h3><p>Adicione ponto a protocolo existente; localização permanece individual.</p></div>}
  </section>
}
