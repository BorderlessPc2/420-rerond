import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import {
  buildTiposDocumentoOptions,
  getFileKey,
  resolveTipoDocumentoSelection,
} from '../config/tiposDocumento'
import type { TipoDocumentoAnexo } from '../models/Solicitacao'
import type { TipoAnalise } from '../models/TipoAnalise'
import type { ConcessionariaPerfil } from '../models/ConcessionariaPerfil'
import {
  addArquivosSolicitacao,
  getSolicitacaoById,
  reclassifyArquivoSolicitacao,
  removeArquivoSolicitacao,
  replaceArquivoSolicitacao,
  updateSolicitacao,
  appendHistoricoEdicao,
} from '../services/solicitacao/solicitacaoService'
import { getConcessionariaPerfilById } from '../services/concessionaria/concessionariaService'
import { listOrganizacoes } from '../services/organizacao/organizacaoService'
import type { Organizacao } from '../models/Organizacao'
import { listTiposAnalise } from '../services/tipoAnalise/tipoAnaliseService'
import './NovaSolicitacao.css'

export default function EditarSolicitacao() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [tiposAnalise, setTiposAnalise] = useState<TipoAnalise[]>([])
  const [organizacoes, setOrganizacoes] = useState<Organizacao[]>([])
  const [concessionariaId, setConcessionariaId] = useState('')
  const [concessionariaIdInicial, setConcessionariaIdInicial] = useState('')
  const [replaceTargetUrl, setReplaceTargetUrl] = useState<string | null>(null)

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tipoObra, setTipoObra] = useState('')
  const [localizacao, setLocalizacao] = useState('')
  const [tipoAnaliseId, setTipoAnaliseId] = useState('')
  const [tipoAnaliseDescricao, setTipoAnaliseDescricao] = useState('')
  const [cliente, setCliente] = useState('')
  const [rodovia, setRodovia] = useState('')
  const [nomeConcessionaria, setNomeConcessionaria] = useState('')
  const [observacoes, setObservacoes] = useState('')

  const [arquivosMeta, setArquivosMeta] = useState<
    Array<{
      url: string
      nome: string
      tipoDocumento: TipoDocumentoAnexo
      tipoDocumentoLabel?: string
    }>
  >([])
  const [historico, setHistorico] = useState<
    Array<{ em: string; por?: string | null; resumo: string }>
  >([])

  const [novosFiles, setNovosFiles] = useState<File[]>([])
  const [novosTipos, setNovosTipos] = useState<Record<string, TipoDocumentoAnexo>>({})
  const [novosSelectValues, setNovosSelectValues] = useState<Record<string, string>>({})
  const [novosLabels, setNovosLabels] = useState<Record<string, string>>({})
  const [perfil, setPerfil] = useState<ConcessionariaPerfil | null>(null)

  const tiposDocumentoOptions = useMemo(
    () => buildTiposDocumentoOptions(perfil?.documentosCustom),
    [perfil],
  )

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [sol, tipos, orgs] = await Promise.all([
          getSolicitacaoById(id),
          listTiposAnalise(),
          listOrganizacoes(),
        ])
        if (cancelled) return
        if (!sol) {
          setError('Solicitação não encontrada.')
          return
        }
        setTiposAnalise(tipos)
        setOrganizacoes(orgs)
        setTitulo(sol.titulo || '')
        setDescricao(sol.descricao || '')
        setTipoObra(sol.tipoObra || '')
        setLocalizacao(sol.localizacao || '')
        setTipoAnaliseId(sol.tipoAnaliseId || '')
        setTipoAnaliseDescricao(sol.tipoAnaliseDescricao || '')
        setCliente(sol.cliente || '')
        setRodovia(sol.rodovia || '')
        setNomeConcessionaria(sol.nomeConcessionaria || '')
        setConcessionariaId(sol.concessionariaId || '')
        setConcessionariaIdInicial(sol.concessionariaId || '')
        setObservacoes(sol.memorial || '')
        setArquivosMeta(sol.arquivosMeta ?? [])
        setHistorico(sol.historicoEdicoes ?? [])
        if (sol.concessionariaId) {
          const p = await getConcessionariaPerfilById(sol.concessionariaId)
          if (!cancelled) setPerfil(p)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar solicitação.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  const handleSaveDados = async () => {
    if (!id) return
    if (!titulo.trim()) {
      setError('Título é obrigatório.')
      return
    }
    if (!tipoAnaliseId.trim()) {
      setError('Selecione o tipo de análise (ocupação, acesso, PAC ou Outro).')
      return
    }
    if (
      (tipoAnaliseId === 'outro' ||
        tiposAnalise.find((t) => t.id === tipoAnaliseId)?.categoria === 'outro') &&
      !tipoAnaliseDescricao.trim()
    ) {
      setError('Descreva o tipo de análise em Outro.')
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const orgSelecionada = organizacoes.find((o) => o.id === concessionariaId)
      const nomeOrg =
        orgSelecionada?.nome?.trim() ||
        nomeConcessionaria.trim() ||
        undefined
      const mudouOrg = concessionariaIdInicial !== (concessionariaId || '')

      await updateSolicitacao(id, {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        tipoObra: tipoObra.trim(),
        localizacao: localizacao.trim(),
        tipoAnaliseId: tipoAnaliseId || null,
        tipoAnaliseDescricao: tipoAnaliseDescricao.trim() || null,
        cliente: cliente.trim() || undefined,
        rodovia: rodovia.trim() || undefined,
        concessionariaId: concessionariaId || null,
        nomeConcessionaria: nomeOrg,
        memorial: observacoes.trim() || undefined,
      })
      await appendHistoricoEdicao(
        id,
        mudouOrg
          ? `Atualizou dados e organização (${nomeOrg || 'sem org'}).`
          : 'Atualizou dados da solicitação.',
      )
      const refreshed = await getSolicitacaoById(id)
      setHistorico(refreshed?.historicoEdicoes ?? [])
      setConcessionariaIdInicial(concessionariaId || '')
      if (concessionariaId) {
        const p = await getConcessionariaPerfilById(concessionariaId)
        setPerfil(p)
      } else {
        setPerfil(null)
      }
      setSuccess('Dados salvos. A próxima análise usará estas informações.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  const handleAddFiles = async () => {
    if (!id || novosFiles.length === 0) return
    for (const file of novosFiles) {
      const key = getFileKey(file)
      if (novosTipos[key] === 'outro' && !novosLabels[key]?.trim()) {
        setError(`Informe o nome do tipo de documento para "${file.name}" (Outro).`)
        return
      }
    }
    setSaving(true)
    setError(null)
    try {
      const labelsBySizeName: Record<string, string> = {}
      for (const file of novosFiles) {
        const key = getFileKey(file)
        if (novosLabels[key]) {
          labelsBySizeName[`${file.name}-${file.size}`] = novosLabels[key]
        }
      }
      const updated = await addArquivosSolicitacao(id, novosFiles, novosTipos, labelsBySizeName)
      setArquivosMeta(updated.arquivosMeta ?? [])
      setHistorico(updated.historicoEdicoes ?? [])
      setNovosFiles([])
      setNovosTipos({})
      setNovosSelectValues({})
      setNovosLabels({})
      if (fileInputRef.current) fileInputRef.current.value = ''
      setSuccess('Arquivos adicionados.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar arquivos.')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (url: string) => {
    if (!id) return
    if (!confirm('Remover este arquivo da solicitação?')) return
    setSaving(true)
    setError(null)
    try {
      const updated = await removeArquivoSolicitacao(id, url)
      setArquivosMeta(updated.arquivosMeta ?? [])
      setHistorico(updated.historicoEdicoes ?? [])
      setSuccess('Arquivo removido.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover arquivo.')
    } finally {
      setSaving(false)
    }
  }

  const handleReclassify = async (
    url: string,
    tipoDocumento: TipoDocumentoAnexo,
    label?: string,
  ) => {
    if (!id) return
    if (tipoDocumento === 'outro' && !label?.trim()) {
      setError('Informe o nome do documento em Outro.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const updated = await reclassifyArquivoSolicitacao(id, url, tipoDocumento, label)
      setArquivosMeta(updated.arquivosMeta ?? [])
      setHistorico(updated.historicoEdicoes ?? [])
      setSuccess('Tipo de documento atualizado.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao reclassificar.')
    } finally {
      setSaving(false)
    }
  }

  const handleReplaceClick = (url: string) => {
    setReplaceTargetUrl(url)
    replaceInputRef.current?.click()
  }

  const handleReplaceFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const targetUrl = replaceTargetUrl
    e.target.value = ''
    setReplaceTargetUrl(null)
    if (!id || !file || !targetUrl) return
    setSaving(true)
    setError(null)
    try {
      const meta = arquivosMeta.find((m) => m.url === targetUrl)
      const updated = await replaceArquivoSolicitacao(
        id,
        targetUrl,
        file,
        meta?.tipoDocumento,
        meta?.tipoDocumentoLabel,
      )
      setArquivosMeta(updated.arquivosMeta ?? [])
      setHistorico(updated.historicoEdicoes ?? [])
      setSuccess(`Arquivo substituído por "${file.name}".`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao substituir arquivo.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="nova-solicitacao-container">
        <p>Carregando solicitação...</p>
      </div>
    )
  }

  return (
    <div className="nova-solicitacao-container">
      <div className="nova-solicitacao-header" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button type="button" className="link-button" onClick={() => navigate('/solicitacoes')}>
          <ArrowLeft size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Voltar
        </button>
        <h1 style={{ margin: 0 }}>Editar solicitação</h1>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && (
        <div className="success-message" style={{ marginBottom: 12 }}>
          {success}
        </div>
      )}

      <div className="nova-solicitacao-form">
        <div className="form-section">
          <h2 className="section-title">Dados</h2>
          <div className="form-group">
            <label htmlFor="edit-titulo">Título</label>
            <input id="edit-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-tipo-obra">Tipo de obra / projeto</label>
              <input
                id="edit-tipo-obra"
                value={tipoObra}
                onChange={(e) => setTipoObra(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="edit-localizacao">Localização</label>
              <input
                id="edit-localizacao"
                value={localizacao}
                onChange={(e) => setLocalizacao(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
              <label htmlFor="edit-tipo-analise">Tipo de análise *</label>
            <select
              id="edit-tipo-analise"
              value={tipoAnaliseId}
              onChange={(e) => setTipoAnaliseId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {tiposAnalise.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nome}
                </option>
              ))}
            </select>
            {(tipoAnaliseId === 'outro' ||
              tiposAnalise.find((t) => t.id === tipoAnaliseId)?.categoria === 'outro') && (
              <input
                style={{ marginTop: 8 }}
                value={tipoAnaliseDescricao}
                onChange={(e) => setTipoAnaliseDescricao(e.target.value)}
                placeholder="Descreva o tipo de análise (obrigatório para Outro)"
              />
            )}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-cliente">Cliente</label>
              <input id="edit-cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="edit-rodovia">Rodovia</label>
              <input id="edit-rodovia" value={rodovia} onChange={(e) => setRodovia(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="edit-org">Organização / concessionária</label>
              <select
                id="edit-org"
                value={concessionariaId}
                onChange={(e) => {
                  const nextId = e.target.value
                  setConcessionariaId(nextId)
                  const org = organizacoes.find((o) => o.id === nextId)
                  if (org?.nome) setNomeConcessionaria(org.nome)
                }}
              >
                <option value="">Sem organização vinculada</option>
                {organizacoes.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.nome}
                    {org.categoria ? ` (${org.categoria})` : ''}
                  </option>
                ))}
              </select>
              {!concessionariaId && (
                <input
                  style={{ marginTop: 8 }}
                  value={nomeConcessionaria}
                  onChange={(e) => setNomeConcessionaria(e.target.value)}
                  placeholder="Nome livre (opcional se sem perfil)"
                />
              )}
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="edit-desc">Descrição</label>
            <textarea
              id="edit-desc"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
            />
          </div>
          <div className="form-group">
            <label htmlFor="edit-obs">Observações</label>
            <textarea
              id="edit-obs"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
            />
          </div>
          <button
            type="button"
            className="btn-submit"
            onClick={() => void handleSaveDados()}
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar dados'}
          </button>
        </div>

        <div className="form-section">
          <h2 className="section-title">Arquivos</h2>
          <input
            ref={replaceInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.xlsx"
            style={{ display: 'none' }}
            onChange={(e) => void handleReplaceFileSelected(e)}
          />
          <div className="files-list">
            {arquivosMeta.length === 0 && <p>Nenhum arquivo anexado.</p>}
            {arquivosMeta.map((meta) => (
              <div key={meta.url} className="file-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <strong>{meta.nome}</strong>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="link-button"
                      disabled={saving}
                      onClick={() => handleReplaceClick(meta.url)}
                    >
                      Substituir
                    </button>
                    <button type="button" className="link-button" onClick={() => void handleRemove(meta.url)}>
                      <Trash2 size={14} /> Remover
                    </button>
                  </div>
                </div>
                <div className="form-row" style={{ marginTop: 8 }}>
                  <select
                    value={
                      (perfil?.documentosCustom ?? []).find(
                        (d) =>
                          meta.tipoDocumento === 'outro' &&
                          d.label === meta.tipoDocumentoLabel,
                      )?.id ?? meta.tipoDocumento
                    }
                    onChange={(e) => {
                      const resolved = resolveTipoDocumentoSelection(
                        e.target.value,
                        perfil?.documentosCustom,
                      )
                      void handleReclassify(
                        meta.url,
                        resolved.tipoDocumento,
                        resolved.tipoDocumentoLabel ??
                          (resolved.tipoDocumento === 'outro'
                            ? meta.tipoDocumentoLabel
                            : undefined),
                      )
                    }}
                  >
                    {tiposDocumentoOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.fromPerfil ? `${opt.label} (perfil)` : opt.label}
                      </option>
                    ))}
                  </select>
                  {meta.tipoDocumento === 'outro' &&
                    !(perfil?.documentosCustom ?? []).some(
                      (d) => d.label === meta.tipoDocumentoLabel,
                    ) && (
                    <input
                      defaultValue={meta.tipoDocumentoLabel || ''}
                      placeholder="Nome do tipo (Outro)"
                      onBlur={(e) => {
                        if (e.target.value.trim() !== (meta.tipoDocumentoLabel || '')) {
                          void handleReclassify(meta.url, 'outro', e.target.value)
                        }
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.xlsx"
              onChange={(e) => {
                const selected = Array.from(e.target.files || [])
                setNovosFiles(selected)
                const tipos: Record<string, TipoDocumentoAnexo> = {}
                const selects: Record<string, string> = {}
                selected.forEach((file) => {
                  const key = getFileKey(file)
                  tipos[key] = 'desconhecido'
                  selects[key] = 'desconhecido'
                })
                setNovosTipos(tipos)
                setNovosSelectValues(selects)
              }}
            />
            {novosFiles.map((file) => {
              const key = getFileKey(file)
              return (
                <div key={key} className="file-item" style={{ marginTop: 8 }}>
                  <span>{file.name}</span>
                  <select
                    value={novosSelectValues[key] || novosTipos[key] || 'desconhecido'}
                    onChange={(e) => {
                      const resolved = resolveTipoDocumentoSelection(
                        e.target.value,
                        perfil?.documentosCustom,
                      )
                      setNovosSelectValues((prev) => ({ ...prev, [key]: e.target.value }))
                      setNovosTipos((prev) => ({ ...prev, [key]: resolved.tipoDocumento }))
                      if (resolved.tipoDocumentoLabel) {
                        setNovosLabels((prev) => ({
                          ...prev,
                          [key]: resolved.tipoDocumentoLabel!,
                        }))
                      } else if (resolved.tipoDocumento !== 'outro') {
                        setNovosLabels((prev) => {
                          const next = { ...prev }
                          delete next[key]
                          return next
                        })
                      }
                    }}
                  >
                    {tiposDocumentoOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.fromPerfil ? `${opt.label} (perfil)` : opt.label}
                      </option>
                    ))}
                  </select>
                  {novosTipos[key] === 'outro' &&
                    !(perfil?.documentosCustom ?? []).some(
                      (d) => d.id === novosSelectValues[key],
                    ) && (
                    <input
                      placeholder="Nome do documento"
                      value={novosLabels[key] || ''}
                      onChange={(e) =>
                        setNovosLabels((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                    />
                  )}
                </div>
              )
            })}
            {novosFiles.length > 0 && (
              <button
                type="button"
                className="btn-submit"
                style={{ marginTop: 12 }}
                onClick={() => void handleAddFiles()}
                disabled={saving}
              >
                <Plus size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                Adicionar arquivos
              </button>
            )}
          </div>
        </div>

        {historico.length > 0 && (
          <div className="form-section">
            <h2 className="section-title">Histórico de edições</h2>
            <ul style={{ margin: 0, paddingLeft: 18, color: '#4b5563', fontSize: 13 }}>
              {[...historico].reverse().map((item, index) => (
                <li key={`${item.em}-${index}`}>
                  {new Date(item.em).toLocaleString('pt-BR')} — {item.resumo}
                  {item.por ? ` (${item.por})` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
