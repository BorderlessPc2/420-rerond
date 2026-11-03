import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { criarProtocoloComPontos, descreverTransicao, getProtocolo, listMovimentos, registrarMovimento, atualizarProtocolo, type Etapa, type Movimento, type Ponto, type Protocolo, type Situacao } from '../services/gestaoContratos'
import GestaoEtapaStepper from '../components/gestao/GestaoEtapaStepper'
import GestaoTransicaoComposer from '../components/gestao/GestaoTransicaoComposer'
import { baixarModeloPlanilha, baixarModeloPlanilhaPontos, enriquecerPreviewImportacao, exportarRelatorioErrosImportacao, extrairPontosRascunho, importarProtocolosEPontos, labelCampoPlanilha, mesclarPontosRascunho, parsePlanilha, parsePlanilhaParaRascunhoProtocolo, type ImportPreview, type ResultadoPlanilhaRascunho } from '../services/gestaoImportacao'
import type { PontoInput } from '../services/gestaoValidacao'
import type { GestaoContext } from './GestaoContratoDetalhe'
import { classificarPrazo } from '../utils/gestaoPrioridades'
import { ordenarProtocolos, type GestaoOrdemProtocolo } from '../services/gestaoLista'
import MapaLeaflet from '../components/gestao/MapaLeaflet'
import ModalGestao from '../components/gestao/ModalGestao'
import { formatarDataGestao, nomeGestao } from './gestaoUi'

const nome = nomeGestao
export function GestaoProtocolos() {
  const { contratoId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { protocolos, pontos, refresh } = useOutletContext<GestaoContext>()
  const [ordem, setOrdem] = useState<GestaoOrdemProtocolo>('prazo')
  const busca = searchParams.get('q') ?? ''
  const protocolosLista = useMemo(() => ordenarProtocolos(protocolos, ordem), [protocolos, ordem])
  const setBusca = (value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value.trim()) next.set('q', value)
    else next.delete('q')
    setSearchParams(next)
  }
  const vazio: PontoInput = { codigo: '', estado: '', km: '', tipo: 'nova_implantacao', concessionaria: '', rodovia: '' }
  const [titulo, setTitulo] = useState(''), [concessionaria, setConcessionaria] = useState(''), [rodovia, setRodovia] = useState(''), [numero, setNumero] = useState(''), [processoAnaliseId, setProcessoAnaliseId] = useState(''), [error, setError] = useState('')
  const [creating, setCreating] = useState(false), [saving, setSaving] = useState(false), [points, setPoints] = useState<PontoInput[]>([]), [preview, setPreview] = useState<ImportPreview | null>(null), [parsing, setParsing] = useState(false), [importing, setImporting] = useState(false), [importResult, setImportResult] = useState(''), [importValidateOnly, setImportValidateOnly] = useState(false)
  const [draftPlanilha, setDraftPlanilha] = useState<ResultadoPlanilhaRascunho | null>(null), [draftParsing, setDraftParsing] = useState(false), [draftMessage, setDraftMessage] = useState('')
  const importEnriquecido = useMemo(() => (preview ? enriquecerPreviewImportacao(preview, protocolos, pontos) : null), [preview, protocolos, pontos])
  const updatePoint = (index: number, patch: Partial<PontoInput>) => setPoints((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch, concessionaria, rodovia } : item))
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true)
    try { await criarProtocoloComPontos(contratoId, { titulo, concessionaria, rodovia, numero, processoAnaliseId }, points.map((point) => ({ ...point, concessionaria, rodovia }))); setTitulo(''); setConcessionaria(''); setRodovia(''); setNumero(''); setProcessoAnaliseId(''); setPoints([]); closeCreating(); await refresh(); setError('') } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao criar protocolo.') } finally { setSaving(false) }
  }
  const readFile = async (file: File, validateOnly = false) => {
    setParsing(true)
    setImportResult('')
    setImportValidateOnly(validateOnly)
    try {
      setPreview(await parsePlanilha(file))
      setError('')
    } catch (err) {
      setPreview(null)
      setError(err instanceof Error ? err.message : 'Erro ao ler planilha.')
    } finally {
      setParsing(false)
    }
  }
  const confirmImport = async () => {
    if (!preview) return
    setImporting(true)
    try {
      const result = await importarProtocolosEPontos(contratoId, preview)
      setImportResult(`${result.importados} grupos importados · ${result.pontosCriados} pontos novos · ${result.pontosIgnorados} ignorados (já existiam)${result.erros.length ? `. ${result.erros.map((item) => `${item.protocolo}: ${item.erro}`).join(' ')}` : '.'}`)
      setPreview(null)
      setImportValidateOnly(false)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao importar planilha.')
    } finally {
      setImporting(false)
    }
  }
  const pickImportFile = (validateOnly: boolean) => {
    const input = document.getElementById(validateOnly ? 'gestao-validar-planilha' : 'gestao-importar-planilha') as HTMLInputElement | null
    input?.click()
  }
  const closeCreating = () => {
    setCreating(false)
    setDraftPlanilha(null)
    setDraftMessage('')
  }
  const readDraftSheet = async (file: File) => {
    setDraftParsing(true)
    setDraftMessage('')
    try {
      setDraftPlanilha(await parsePlanilhaParaRascunhoProtocolo(file, { titulo, concessionaria, rodovia, numero }))
      setError('')
    } catch (err) {
      setDraftPlanilha(null)
      setError(err instanceof Error ? err.message : 'Erro ao ler planilha de pontos.')
    } finally {
      setDraftParsing(false)
    }
  }
  const applyDraftSheet = () => {
    if (!draftPlanilha) return
    const sugestao = draftPlanilha.sugestaoProtocolo
    const nextConcessionaria = concessionaria.trim() || sugestao?.concessionaria || ''
    const nextRodovia = rodovia.trim() || sugestao?.rodovia || ''
    if (draftPlanilha.analise.perfil === 'somente_pontos' && (!nextConcessionaria || !nextRodovia)) {
      setError('Informe concessionária e rodovia antes de aplicar a planilha de pontos.')
      return
    }
    let pontosImportados = draftPlanilha.pontos
    let linhasInvalidas = draftPlanilha.linhasInvalidas
    if (draftPlanilha.analise.perfil === 'somente_pontos' && !pontosImportados.length) {
      const extraido = extrairPontosRascunho(draftPlanilha.linhas, nextConcessionaria, nextRodovia)
      pontosImportados = extraido.pontos
      linhasInvalidas = extraido.linhasInvalidas
    }
    if (!pontosImportados.length) {
      setError('Nenhum ponto válido para aplicar. Revise a planilha e os campos do protocolo.')
      return
    }
    if (sugestao) {
      if (!titulo.trim() && sugestao.titulo) setTitulo(sugestao.titulo)
      if (!concessionaria.trim() && sugestao.concessionaria) setConcessionaria(sugestao.concessionaria)
      if (!rodovia.trim() && sugestao.rodovia) setRodovia(sugestao.rodovia)
      if (!numero.trim() && sugestao.numero) setNumero(sugestao.numero)
    }
    const merged = mesclarPontosRascunho(points, pontosImportados.map((point) => ({ ...point, concessionaria: nextConcessionaria, rodovia: nextRodovia })))
    setPoints(merged.pontos)
    setDraftMessage(`${pontosImportados.length} linha(s) importada(s) · ${merged.pontos.length} ponto(s) no rascunho${merged.duplicadosIgnorados ? ` · ${merged.duplicadosIgnorados} código(s) atualizado(s)` : ''}${linhasInvalidas.length ? ` · ${linhasInvalidas.length} linha(s) ignorada(s) por erro` : ''}.`)
    setDraftPlanilha(null)
    setError('')
  }
  return <section><div className="gestao-section-head"><div><h2>Protocolos</h2><p>{protocolos.length} {protocolos.length === 1 ? 'protocolo no recorte' : 'protocolos no recorte'}</p></div><div className="gestao-actions"><button type="button" className="gestao-button-secondary" onClick={baixarModeloPlanilha}>Baixar modelo</button><button type="button" className="gestao-button-secondary" onClick={() => pickImportFile(true)}>Validar planilha</button><button type="button" className="gestao-button-secondary" onClick={() => pickImportFile(false)}>Importar planilha</button><input id="gestao-validar-planilha" hidden type="file" accept=".xlsx,.csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) void readFile(file, true); event.target.value = '' }} /><input id="gestao-importar-planilha" hidden type="file" accept=".xlsx,.csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) void readFile(file, false); event.target.value = '' }} /><button type="button" aria-haspopup="dialog" onClick={() => { setDraftPlanilha(null); setDraftMessage(''); setCreating(true) }}>Novo protocolo</button></div></div><div className="gestao-list-controls"><label>Busca<input type="search" value={busca} placeholder="Título, rodovia, concessionária…" onChange={(event) => setBusca(event.target.value)} /></label><label>Ordenar por<select value={ordem} onChange={(event) => setOrdem(event.target.value as GestaoOrdemProtocolo)}><option value="prazo">Prazo</option><option value="titulo">Título</option></select></label></div>{error && <p className="gestao-error" role="alert">{error}</p>}
    <ModalGestao open={creating} title="Novo protocolo" description="Cadastre protocolo e pontos juntos, mantendo o contexto da rodovia." labelledBy="gestao-novo-protocolo-title" onClose={closeCreating}><form className="gestao-form gestao-form-grid" onSubmit={(event) => void save(event)}><label>Título<input name="titulo" required value={titulo} onChange={(e) => setTitulo(e.target.value)} /></label><label>Concessionária<input name="concessionaria" required value={concessionaria} onChange={(e) => setConcessionaria(e.target.value)} /></label><label>Rodovia<input name="rodovia" required value={rodovia} onChange={(e) => setRodovia(e.target.value)} /></label><label>Número do protocolo<input name="numero" value={numero} onChange={(e) => setNumero(e.target.value)} /></label><label>ID do processo de análise IA (opcional)<input name="processoAnaliseId" value={processoAnaliseId} onChange={(e) => setProcessoAnaliseId(e.target.value)} /></label><div className="gestao-sheet-import gestao-pontos-draft"><div className="gestao-draft-heading"><div><strong>Importar pontos da planilha</strong><small>O sistema detecta se a planilha traz só pontos ou protocolo completo antes de aplicar ao rascunho.</small></div></div><div className="gestao-sheet-actions"><button type="button" className="gestao-button-secondary" onClick={baixarModeloPlanilhaPontos}>Modelo só pontos</button><button type="button" className="gestao-button-secondary" onClick={() => document.getElementById('gestao-draft-planilha')?.click()} disabled={draftParsing}>{draftParsing ? 'Analisando…' : 'Escolher planilha'}</button><input id="gestao-draft-planilha" hidden type="file" accept=".xlsx,.csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) void readDraftSheet(file); event.target.value = '' }} /></div>{draftPlanilha && <div className="gestao-sheet-detect" role="status"><p><strong>{draftPlanilha.analise.descricaoPerfil}</strong></p><p>{draftPlanilha.nomeArquivo} · {draftPlanilha.analise.totalLinhas} linha(s) · {draftPlanilha.pontos.length} ponto(s) válido(s){draftPlanilha.linhasInvalidas.length ? ` · ${draftPlanilha.linhasInvalidas.length} linha(s) com erro` : ''}</p><ul className="gestao-sheet-fields">{draftPlanilha.analise.camposDetectados.map((item) => <li key={item.campo}><span>{labelCampoPlanilha(item.campo)}</span><small>{item.coluna}</small></li>)}</ul>{draftPlanilha.analise.colunasNaoMapeadas.length > 0 && <p className="gestao-import-limit-hint">Colunas ignoradas: {draftPlanilha.analise.colunasNaoMapeadas.join(', ')}</p>}{draftPlanilha.analise.perfil === 'somente_pontos' && (!concessionaria.trim() || !rodovia.trim()) && <p className="gestao-error" role="alert">Preencha concessionária e rodovia acima antes de aplicar pontos.</p>}{draftPlanilha.avisos.map((item) => <p className="gestao-import-limit-hint" key={item}>{item}</p>)}{draftPlanilha.linhasInvalidas.slice(0, 5).map((item) => <p className="gestao-error" key={item.linha}>Linha {item.linha}: {item.erros.join(' ')}</p>)}{draftPlanilha.linhasInvalidas.length > 5 && <p className="gestao-import-limit-hint">… e mais {draftPlanilha.linhasInvalidas.length - 5} linha(s) com erro.</p>}<div className="gestao-form-footer"><button type="button" className="gestao-button-secondary" onClick={() => setDraftPlanilha(null)}>Descartar análise</button><button type="button" onClick={applyDraftSheet} disabled={!draftPlanilha.pontos.length && !(draftPlanilha.analise.perfil === 'somente_pontos' && draftPlanilha.linhas.length > 0)}>Aplicar ao rascunho</button></div></div>}{draftMessage && <p className="gestao-success" role="status">{draftMessage}</p>}</div><div className="gestao-pontos-draft"><div className="gestao-draft-heading"><div><strong>Pontos deste protocolo</strong><small>Cadastre os pontos que já fazem parte deste protocolo.</small></div><span>{points.length} {points.length === 1 ? 'ponto' : 'pontos'}</span></div>{points.map((point, index) => <div className="gestao-point-draft" key={index}><span className="gestao-point-index">{String(index + 1).padStart(2, '0')}</span><input aria-label={`Código do ponto ${index + 1}`} placeholder="Código" required value={point.codigo} onChange={(e) => updatePoint(index, { codigo: e.target.value })} /><input aria-label={`Estado do ponto ${index + 1}`} placeholder="Estado" required value={point.estado} onChange={(e) => updatePoint(index, { estado: e.target.value })} /><input aria-label={`Km do ponto ${index + 1}`} placeholder="Km" required value={point.km} onChange={(e) => updatePoint(index, { km: e.target.value })} /><input aria-label={`Latitude do ponto ${index + 1}`} placeholder="Latitude (opcional)" type="number" step="any" value={point.latitude ?? ''} onChange={(e) => updatePoint(index, { latitude: e.target.value ? Number(e.target.value) : undefined })} /><input aria-label={`Longitude do ponto ${index + 1}`} placeholder="Longitude (opcional)" type="number" step="any" value={point.longitude ?? ''} onChange={(e) => updatePoint(index, { longitude: e.target.value ? Number(e.target.value) : undefined })} /><select aria-label={`Classificação do ponto ${index + 1}`} value={point.tipo} onChange={(e) => updatePoint(index, { tipo: e.target.value as Ponto['tipo'] })}><option value="nova_implantacao">Nova implantação</option><option value="regularizacao">Regularização</option></select><button type="button" className="gestao-button-secondary" onClick={() => setPoints((items) => items.filter((_, itemIndex) => itemIndex !== index))}>Remover</button></div>)}<button type="button" className="gestao-button-secondary" onClick={() => setPoints((items) => [...items, { ...vazio, concessionaria, rodovia }])}>Adicionar ponto</button></div><button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Criar protocolo'}</button></form></ModalGestao>
    {parsing && <p aria-live="polite">Processando planilha…</p>}{importResult && <p className="gestao-success" role="status">{importResult}</p>}{importEnriquecido && <section className="gestao-panel"><h3>{importValidateOnly ? 'Resultado da validação' : 'Prévia da importação'}</h3><p>{importEnriquecido.totais.protocolos} protocolos · {importEnriquecido.totais.pontos} pontos na planilha · {importEnriquecido.totais.protocolosNovos} novos · {importEnriquecido.totais.protocolosExistentes} existentes · {importEnriquecido.totais.pontosIgnorados} códigos já cadastrados · {importEnriquecido.totais.linhasInvalidas} linhas com erro</p><p className="gestao-import-limit-hint">Limites por gravação: até 499 pontos em protocolo novo e 500 pontos novos em protocolo existente. Divida a planilha se exceder.</p>{importValidateOnly && <p className="gestao-success" role="status">Nenhum dado foi gravado nesta validação.</p>}{importEnriquecido.grupos.map((group) => <div className="gestao-import-group" key={group.key}><strong>{group.input.titulo}</strong><span>{group.input.concessionaria} · {group.input.rodovia} · {group.pontos.length} pontos na planilha · {group.pontosNovos} novos</span><small>{group.protocoloExistente ? 'Protocolo existente — pontos serão adicionados' : 'Protocolo novo'}{group.codigosIgnorados.length ? ` · Ignorados: ${group.codigosIgnorados.join(', ')}` : ''}{group.excedeLimite ? ` · Excede limite de ${group.limitePontos} pontos por gravação` : ''}</small></div>)}{importEnriquecido.linhasInvalidas.map((item) => <p className="gestao-error" key={item.linha}>Linha {item.linha}: {item.erros.join(' ')}</p>)}<div className="gestao-form-footer">{importEnriquecido.linhasInvalidas.length > 0 && <button type="button" className="gestao-button-secondary" onClick={() => exportarRelatorioErrosImportacao(importEnriquecido.linhasInvalidas)}>Exportar erros (XLSX)</button>}{importValidateOnly ? <><button type="button" className="gestao-button-secondary" onClick={() => { setPreview(null); setImportValidateOnly(false) }}>Fechar</button><button type="button" onClick={() => setImportValidateOnly(false)} disabled={importing || !importEnriquecido.grupos.some((group) => group.pontosNovos > 0 && !group.excedeLimite)}>Importar dados validados</button></> : <><button type="button" className="gestao-button-secondary" onClick={() => { setPreview(null); setImportValidateOnly(false) }}>Cancelar</button><button type="button" onClick={() => void confirmImport()} disabled={importing || !importEnriquecido.grupos.some((group) => (group.pontosNovos > 0 || !group.protocoloExistente) && !group.excedeLimite)}>{importing ? 'Importando…' : importEnriquecido.linhasInvalidas.length ? 'Importar linhas válidas' : 'Confirmar importação'}</button></>}</div></section>}
    {protocolosLista.length ? <ul className="gestao-list">{protocolosLista.map((p) => <li key={p.id}><Link className="gestao-list-link" to={`/gestao-contratos/${contratoId}/protocolos/${p.id}`}><span className="gestao-list-main"><strong>{p.titulo}</strong><small>{p.concessionaria} · {p.rodovia}{p.numero ? ` · ${p.numero}` : ''}</small></span><span className={`gestao-status gestao-status-${p.status}`}>{nome(p.status)}</span><span className={`gestao-deadline gestao-deadline-${p.status === 'concluido' ? 'normal' : classificarPrazo(p.previsao).prioridade}`}>{p.status === 'concluido' ? 'Concluído' : classificarPrazo(p.previsao).rotulo}<small>{pontos.filter((item) => item.protocoloId === p.id).length} pontos · {nome(p.etapa)}</small></span><span aria-hidden="true">↗</span></Link></li>)}</ul> : <div className="gestao-empty"><h3>Nenhum protocolo neste recorte</h3><p>Cadastre protocolo para reunir pontos da mesma rodovia e concessionária.</p></div>}
  </section>
}
export function GestaoProtocoloDetalhe() {
  const { contratoId = '', protocoloId = '' } = useParams()
  const { pontos, refresh } = useOutletContext<GestaoContext>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [protocolo, setProtocolo] = useState<Protocolo | null>(null), [movimentos, setMovimentos] = useState<Movimento[]>([]), [error, setError] = useState('')
  const protocolPoints = pontos.filter((ponto) => ponto.protocoloId === protocoloId)
  const requestedPointId = searchParams.get('ponto')
  const selectedPointId = requestedPointId && protocolPoints.some((ponto) => ponto.id === requestedPointId) ? requestedPointId : null
  const [tipo, setTipo] = useState(''), [observacao, setObservacao] = useState(''), [em, setEm] = useState(() => new Date().toISOString().slice(0, 10)), [etapa, setEtapa] = useState<Etapa>('planejamento'), [status, setStatus] = useState<Situacao>('nao_iniciado'), [files, setFiles] = useState<File[]>([]), [numero, setNumero] = useState(''), [previsao, setPrevisao] = useState('')
  const [showMovement, setShowMovement] = useState(false), [saving, setSaving] = useState(false), [stepperPulse, setStepperPulse] = useState(false)
  const transicao = protocolo ? descreverTransicao(protocolo.etapa, protocolo.status, etapa, status, observacao, protocolPoints) : null
  const [showEdit, setShowEdit] = useState(false), [editTitulo, setEditTitulo] = useState(''), [editConcessionaria, setEditConcessionaria] = useState(''), [editRodovia, setEditRodovia] = useState(''), [editNumero, setEditNumero] = useState(''), [editPrevisao, setEditPrevisao] = useState(''), [editRealizado, setEditRealizado] = useState(''), [success, setSuccess] = useState('')
  const openEdit = () => {
    if (!protocolo) return
    setEditTitulo(protocolo.titulo)
    setEditConcessionaria(protocolo.concessionaria)
    setEditRodovia(protocolo.rodovia)
    setEditNumero(protocolo.numero ?? '')
    setEditPrevisao(protocolo.previsao ?? '')
    setEditRealizado(protocolo.realizadoEm ?? '')
    setShowEdit(true)
  }
  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setSuccess('')
    try {
      await atualizarProtocolo(contratoId, protocoloId, { titulo: editTitulo, concessionaria: editConcessionaria, rodovia: editRodovia, numero: editNumero, previsao: editPrevisao, realizadoEm: editRealizado })
      setShowEdit(false)
      setSuccess('Protocolo atualizado.')
      await load()
      await refresh()
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao editar protocolo.')
    } finally {
      setSaving(false)
    }
  }
  const lockRodoviaFields = protocolPoints.length > 0
  const load = async () => {
    try { const [p, ms] = await Promise.all([getProtocolo(contratoId, protocoloId), listMovimentos(contratoId, protocoloId)]); setProtocolo(p); setMovimentos(ms); if (p) { setEtapa(p.etapa); setStatus(p.status); setNumero(p.numero ?? ''); setPrevisao(p.previsao ?? '') } setError('') } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao carregar protocolo.') }
  }
  useEffect(() => { void load() }, [contratoId, protocoloId])
  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      await registrarMovimento(contratoId, protocoloId, { tipo, observacao, em, etapa, status, files, numero, previsao })
      setTipo('')
      setObservacao('')
      setFiles([])
      setShowMovement(false)
      setStepperPulse(true)
      window.setTimeout(() => setStepperPulse(false), 1200)
      await load()
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar movimentação.')
    } finally {
      setSaving(false)
    }
  }
  const movimentosTimeline = useMemo(() => [...movimentos].reverse(), [movimentos])
  if (!protocolo) return <p role="alert">{error || 'Carregando protocolo...'}</p>
  return <section><Link className="gestao-back" to={`/gestao-contratos/${contratoId}/protocolos`}>← Todos os protocolos</Link><div className="gestao-section-head"><div><span className="gestao-eyebrow">Protocolo operacional</span><h2>{protocolo.titulo}</h2><p>{protocolo.concessionaria} · {protocolo.rodovia} · {protocolo.numero || 'Sem número externo'}</p></div><div className="gestao-actions"><button type="button" className="gestao-button-secondary" aria-haspopup="dialog" onClick={openEdit}>Editar protocolo</button><span className={`gestao-status gestao-status-${protocolo.status}`}>{nome(protocolo.status)}</span></div></div>{success && <p className="gestao-success gestao-flash-in" role="status">{success}</p>}<GestaoEtapaStepper etapa={protocolo.etapa} status={protocolo.status} pulse={stepperPulse} />
    <div className="gestao-summary"><div><span>Etapa atual</span><strong>{nome(protocolo.etapa)}</strong></div><div><span>Próxima entrega</span><strong>{protocolo.status === 'concluido' ? 'Concluído' : classificarPrazo(protocolo.previsao).rotulo}</strong>{protocolo.previsao && <small>{formatarDataGestao(protocolo.previsao)}</small>}</div><div><span>Pontos vinculados</span><strong>{pontos.filter((p) => p.protocoloId === protocoloId).length}</strong></div></div>
    <div className="gestao-next-action"><div><span className="gestao-eyebrow">Próximo passo</span><strong>{protocolo.status === 'em_correcao' ? 'Corrigir projeto e registrar reenvio' : protocolo.status === 'aguardando_terceiros' || protocolo.status === 'em_analise' ? 'Acompanhar retorno da concessionária' : protocolo.status === 'paralisado' ? 'Revisar motivo da paralisação' : protocolo.status === 'concluido' ? 'Processo concluído' : 'Registrar próxima movimentação'}</strong><p>Atualize andamento manualmente e preserve observações e documentos no histórico.</p></div><button type="button" aria-expanded={showMovement} aria-controls="gestao-movimentacao" onClick={() => setShowMovement(true)}>Registrar movimentação</button></div>
    {protocolo.processoAnaliseId && <p><Link to={`/processos/${protocolo.processoAnaliseId}`}>Abrir processo de análise IA vinculado ↗</Link></p>}
    <section className="gestao-dashboard-map gestao-protocol-map"><div className="gestao-section-head"><div><span className="gestao-eyebrow">Visão territorial</span><h3>Mapa do protocolo</h3><p>Somente pontos vinculados a este protocolo.</p></div></div><MapaLeaflet pontos={protocolPoints} protocolos={[protocolo]} selectedPointId={selectedPointId ?? undefined} onSelectPoint={(ponto) => setSearchParams({ ponto: ponto.id })} fitBoundsOnChange /><div className="gestao-map-legend"><strong>Legenda</strong><span><i className="gestao-legend-dot gestao-legend-success" /> Concluído</span><span><i className="gestao-legend-dot gestao-legend-attention" /> Atenção</span><span><i className="gestao-legend-dot gestao-legend-progress" /> Em andamento</span></div></section>
    <div id="gestao-protocolo-pontos" className="gestao-section-head"><div><h3>Pontos vinculados</h3><p>Localizações incluídas neste protocolo.</p></div><Link to={`/gestao-contratos/${contratoId}/pontos`}>Gerenciar pontos ↗</Link></div><ul className="gestao-simple-list gestao-protocol-points">{protocolPoints.map((p) => <li key={p.id}><Link to={`?ponto=${p.id}`}><strong>{p.codigo}</strong></Link><span>{p.estado} · {p.rodovia} · km {p.km}</span><small>{p.tipo === 'regularizacao' ? 'Regularização' : 'Nova implantação'}{p.resultado ? ` · ${nome(p.resultado)}` : ' · Resultado pendente'}</small></li>)}</ul>
    <div className="gestao-section-head"><div><h3>Histórico e documentos</h3><p>{movimentos.length} movimentações registradas.</p></div><button type="button" aria-haspopup="dialog" onClick={() => setShowMovement(true)}>Registrar movimentação</button></div>{error && <p className="gestao-error" role="alert">{error}</p>}
    <ModalGestao open={showEdit} title="Editar protocolo" description="Atualize os dados cadastrais sem recriar o protocolo." labelledBy="gestao-editar-protocolo-title" onClose={() => setShowEdit(false)}><form className="gestao-form gestao-form-grid" onSubmit={(event) => void saveEdit(event)}><label>Título<input name="titulo" required value={editTitulo} onChange={(e) => setEditTitulo(e.target.value)} /></label><label>Concessionária<input name="concessionaria" required value={editConcessionaria} disabled={lockRodoviaFields} onChange={(e) => setEditConcessionaria(e.target.value)} />{lockRodoviaFields && <small>Com pontos vinculados, concessionária e rodovia não podem mudar.</small>}</label><label>Rodovia<input name="rodovia" required value={editRodovia} disabled={lockRodoviaFields} onChange={(e) => setEditRodovia(e.target.value)} /></label><label>Número do protocolo<input name="numero" value={editNumero} onChange={(e) => setEditNumero(e.target.value)} /></label><label>Previsão<input name="previsao" type="date" value={editPrevisao} onChange={(e) => setEditPrevisao(e.target.value)} /></label><label>Realizado<input name="realizadoEm" type="date" value={editRealizado} onChange={(e) => setEditRealizado(e.target.value)} /></label><div className="gestao-form-footer"><button type="button" className="gestao-button-secondary" onClick={() => setShowEdit(false)}>Cancelar</button><button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar alterações'}</button></div></form></ModalGestao>
    <ModalGestao open={showMovement} title="Nova movimentação" description="Registre o próximo evento e preserve documentos no histórico." labelledBy="gestao-movimentacao-title" onClose={() => setShowMovement(false)}><form id="gestao-movimentacao" className="gestao-form gestao-form-grid" onSubmit={(event) => void save(event)}><label>Movimentação<input name="tipo" required placeholder="Envio, devolução, correção, reenvio, aprovação…" value={tipo} onChange={(e) => setTipo(e.target.value)} /></label><label>Data<input name="em" required type="date" value={em} onChange={(e) => setEm(e.target.value)} /></label>{protocolo && <GestaoTransicaoComposer etapaAtual={protocolo.etapa} statusAtual={protocolo.status} etapa={etapa} status={status} observacao={observacao} pontosVinculados={protocolPoints} onEtapaChange={setEtapa} onStatusChange={setStatus} pontosPendentesHref={`#gestao-protocolo-pontos`} observacaoInputId="gestao-movimentacao-observacao" />}<label>Número externo<input name="numero" value={numero} onChange={(e) => setNumero(e.target.value)} /></label><label>Próxima entrega prevista<input name="previsao" type="date" value={previsao} onChange={(e) => setPrevisao(e.target.value)} /></label><label htmlFor="gestao-movimentacao-observacao">Observação<textarea id="gestao-movimentacao-observacao" name="observacao" value={observacao} onChange={(e) => setObservacao(e.target.value)} /></label><label>Documentos e pareceres (até 20 MB por arquivo)<input name="files" type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} /></label><button type="submit" disabled={saving || !transicao?.valido}>{saving ? 'Registrando…' : 'Registrar no histórico'}</button></form></ModalGestao>
    {movimentosTimeline.length ? <ol className="gestao-timeline">{movimentosTimeline.map((m, index) => { const anterior = movimentosTimeline[index + 1]; const mudouEtapa = anterior && anterior.etapa !== m.etapa; const mudouStatus = anterior && anterior.status !== m.status; return <li key={m.id} className="gestao-timeline-item-in"><time dateTime={m.em}>{formatarDataGestao(m.em)}</time><strong>{m.tipo}</strong><span className={`gestao-status gestao-status-${m.status}`}>{nome(m.status)}</span>{(mudouEtapa || mudouStatus) && <p className="gestao-timeline-diff"><span className="gestao-eyebrow">Transição</span>{mudouEtapa && <span>{nome(anterior!.etapa)} → {nome(m.etapa)}</span>}{mudouStatus && <span>{nome(anterior!.status)} → {nome(m.status)}</span>}</p>}<p>{nome(m.etapa)} · {m.autor || 'Autor não informado'}</p>{m.observacao && <p>{m.observacao}</p>}{m.anexos.length ? m.anexos.map((file) => <a key={file.url} href={file.url} target="_blank" rel="noopener noreferrer">Documento: {file.nome} ↗</a>) : <small>Sem anexos nesta movimentação</small>}</li> })}</ol> : <div className="gestao-empty"><h3>Sem movimentações</h3><p>Registre envio, devolução ou atualização para iniciar histórico deste protocolo.</p></div>}
  </section>
}
