import { useEffect, useMemo, useState } from 'react'
import { useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { criarPonto, pontoStatus, type Ponto } from '../services/gestaoContratos'
import type { GestaoContext } from './GestaoContratoDetalhe'
import ModalGestao from '../components/gestao/ModalGestao'
import GestaoLoadingSkeleton from '../components/gestao/GestaoLoadingSkeleton'
import PontoIconBar from '../components/gestao/PontoIconBar'
import PontoPainelModal from '../components/gestao/PontoPainelModal'
import type { PontoPainelTab } from '../components/gestao/pontoPainelTypes'
import { ordenarPontos, type GestaoOrdemPonto } from '../services/gestaoLista'
import { nomeGestao } from './gestaoUi'
import SelectDropdown from '../components/ui/selectDropdown'

export default function GestaoPontos() {
  const { contratoId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { protocolos, pontos, loading, refresh } = useOutletContext<GestaoContext>()
  const [ordem, setOrdem] = useState<GestaoOrdemPonto>('codigo')
  const busca = searchParams.get('q') ?? ''
  const pontosLista = useMemo(() => ordenarPontos(pontos, ordem), [pontos, ordem])
  const setBusca = (value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value.trim()) next.set('q', value)
    else next.delete('q')
    setSearchParams(next)
  }
  const [protocoloId, setProtocoloId] = useState('')
  const [codigo, setCodigo] = useState('')
  const [estado, setEstado] = useState('')
  const [km, setKm] = useState('')
  const [tipo, setTipo] = useState<Ponto['tipo']>('nova_implantacao')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [precisao, setPrecisao] = useState<Ponto['precisao']>('confirmada')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [painel, setPainel] = useState<{ ponto: Ponto; tab: PontoPainelTab } | null>(null)

  const painelPonto = painel ? pontos.find((item) => item.id === painel.ponto.id) ?? painel.ponto : null
  const requestedPointId = searchParams.get('ponto')

  const openPainel = (ponto: Ponto, tab: PontoPainelTab = 'dados') => {
    setPainel({ ponto, tab })
    setError('')
    const next = new URLSearchParams(searchParams)
    next.set('ponto', ponto.id)
    setSearchParams(next)
  }

  const closePainel = () => {
    setPainel(null)
    const next = new URLSearchParams(searchParams)
    next.delete('ponto')
    setSearchParams(next)
  }

  useEffect(() => {
    if (!requestedPointId) return
    const ponto = pontos.find((item) => item.id === requestedPointId)
    if (!ponto) return
    setPainel((atual) => atual?.ponto.id === ponto.id ? atual : { ponto, tab: 'dados' })
  }, [pontos, requestedPointId])

  const resetCreateForm = () => {
    setProtocoloId('')
    setCodigo('')
    setEstado('')
    setKm('')
    setTipo('nova_implantacao')
    setLatitude('')
    setLongitude('')
    setPrecisao('confirmada')
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    const proc = protocolos.find((p) => p.id === protocoloId)
    if (!proc) {
      setError('Selecione o protocolo do ponto.')
      return
    }
    if (Boolean(latitude) !== Boolean(longitude)) {
      setError('Informe latitude e longitude juntas.')
      return
    }
    setSaving(true)
    try {
      await criarPonto(contratoId, proc.id, {
        codigo,
        estado,
        km,
        tipo,
        concessionaria: proc.concessionaria,
        rodovia: proc.rodovia,
        ...(latitude && longitude ? { latitude: Number(latitude), longitude: Number(longitude), precisao } : {}),
      })
      resetCreateForm()
      setCreating(false)
      await refresh()
      setError('')
      setSuccess(`Ponto ${codigo} criado no protocolo ${proc.titulo}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar ponto.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <GestaoLoadingSkeleton variant="lista" label="Carregando pontos" />

  return (
    <section>
      <div className="gestao-section-head">
        <div>
          <h2>Pontos</h2>
          <p>
            {pontos.length} {pontos.length === 1 ? 'ponto no recorte' : 'pontos no recorte'}
          </p>
        </div>
        <button type="button" aria-haspopup="dialog" onClick={() => { resetCreateForm(); setCreating(true) }}>
          Novo ponto
        </button>
      </div>
      <div className="gestao-list-controls">
        <label>
          Busca
          <input type="search" value={busca} placeholder="Código, estado, rodovia…" onChange={(event) => setBusca(event.target.value)} />
        </label>
        <SelectDropdown label="Ordenar por" value={ordem} onChange={(value) => setOrdem(value as GestaoOrdemPonto)} options={[{ value: 'codigo', label: 'Código' }, { value: 'km', label: 'Quilômetro' }]} />
      </div>
      {error && <p className="gestao-error" role="alert">{error}</p>}
      {success && <p className="gestao-success" role="status">{success}</p>}

      <ModalGestao
        open={creating}
        title="Novo ponto"
        description="Cadastre a localização e vincule o ponto a um protocolo."
        labelledBy="gestao-novo-ponto-title"
        onClose={() => setCreating(false)}
      >
        <form className="gestao-form gestao-form-grid" onSubmit={(event) => void save(event)}>
          <label>
            Protocolo
            <select name="protocolo" required value={protocoloId} onChange={(e) => setProtocoloId(e.target.value)}>
              <option value="">Selecione um protocolo</option>
              {protocolos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.titulo} · {p.rodovia}
                </option>
              ))}
            </select>
          </label>
          {protocolos.length === 0 && <p className="gestao-error">Crie um protocolo antes de cadastrar pontos.</p>}
          <label>
            Código
            <input name="codigo" required value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </label>
          <label>
            Estado
            <input name="estado" required value={estado} onChange={(e) => setEstado(e.target.value)} />
          </label>
          <label>
            Quilômetro
            <input name="km" required value={km} onChange={(e) => setKm(e.target.value)} />
          </label>
          <label>
            Classificação
            <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as Ponto['tipo'])}>
              <option value="nova_implantacao">Nova implantação</option>
              <option value="regularizacao">Regularização (já instalado)</option>
            </select>
          </label>
          <label>
            Latitude
            <input name="latitude" type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
          </label>
          <label>
            Longitude
            <input name="longitude" type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
          </label>
          <label>
            Precisão
            <select name="precisao" value={precisao} onChange={(e) => setPrecisao(e.target.value as Ponto['precisao'])}>
              <option value="confirmada">Confirmada</option>
              <option value="aproximada">Aproximada</option>
            </select>
          </label>
          <div className="gestao-form-footer">
            <button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Criar ponto'}</button>
          </div>
        </form>
      </ModalGestao>

      <PontoPainelModal
        open={Boolean(painelPonto)}
        contratoId={contratoId}
        ponto={painelPonto}
        protocolos={protocolos}
        initialTab={painel?.tab ?? 'dados'}
        onClose={closePainel}
        refresh={refresh}
        onNotice={(message) => { setSuccess(message); setError('') }}
        onError={(message) => { if (message) setError(message); else setError('') }}
      />

      {pontosLista.length ? (
        <ul className="gestao-point-list">
          {pontosLista.map((p) => {
            const proc = protocolos.find((item) => item.id === p.protocoloId)
            const situacao = pontoStatus(p, proc)
            return (
              <li className="gestao-point-row" key={p.id}>
                <div className="gestao-point-row-meta">
                  <strong>{p.codigo}</strong>
                  <span>
                    {p.estado} · {p.rodovia} km {p.km} · {p.concessionaria}
                  </span>
                  <small>
                    {p.tipo === 'regularizacao' ? 'Regularização' : 'Nova implantação'} ·{' '}
                    {!Number.isFinite(p.latitude) || !Number.isFinite(p.longitude)
                      ? 'Coordenadas pendentes'
                      : `${p.latitude}, ${p.longitude} (${p.precisao || 'precisão não informada'})`}
                  </small>
                </div>
                <div className="gestao-point-row-aside">
                  <span className={`gestao-status gestao-point-status-pill${p.resultado ? ' gestao-point-status-pill-ok' : ''}`}>
                    {nomeGestao(situacao.valor)}
                    {situacao.herdado && p.protocoloId ? ' · protocolo' : ''}
                  </span>
                  <PontoIconBar
                    contratoId={contratoId}
                    ponto={p}
                    protocolo={proc}
                    onOpenPainel={(tab) => openPainel(p, tab)}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="gestao-empty">
          <h3>Nenhum ponto neste recorte</h3>
          <p>Adicione ponto a protocolo existente; localização permanece individual.</p>
        </div>
      )}
    </section>
  )
}
