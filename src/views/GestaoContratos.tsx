import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  atualizarContrato,
  criarContrato,
  criarProtocoloComPontos,
  excluirContrato,
  listContratos,
  type Contrato,
  type ContratoInput,
} from '../services/gestaoContratos'
import ModalGestao from '../components/gestao/ModalGestao'
import GestaoLoadingSkeleton from '../components/gestao/GestaoLoadingSkeleton'
import GestaoImportacaoPontosPlanilha from '../components/gestao/GestaoImportacaoPontosPlanilha'
import GestaoPontosRascunhoLista from '../components/gestao/GestaoPontosRascunhoLista'
import {
  baixarModeloPlanilha,
  enriquecerPreviewImportacao,
  exportarRelatorioErrosImportacao,
  importarProtocolosEPontos,
  parsePlanilha,
  type ImportPreview,
} from '../services/gestaoImportacao'
import type { PontoInput } from '../services/gestaoValidacao'
import { ContratoFormFields } from './gestaoContratoForm'
import { contratoFromModel, contratoVazio, tituloContratoGestao } from './gestaoContratoHelpers'
import { nomeGestao } from './gestaoUi'
import './GestaoContratos.css'

type ModoImportacaoContrato = 'nenhum' | 'planilha_completa' | 'protocolo_inicial'

export default function GestaoContratos() {
  const navigate = useNavigate()
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [draft, setDraft] = useState<ContratoInput>(contratoVazio())
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Contrato | null>(null)
  const [deleting, setDeleting] = useState<Contrato | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [modoImportacao, setModoImportacao] = useState<ModoImportacaoContrato>('nenhum')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [parsing, setParsing] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [concessionaria, setConcessionaria] = useState('')
  const [rodovia, setRodovia] = useState('')
  const [numero, setNumero] = useState('')
  const [processoAnaliseId, setProcessoAnaliseId] = useState('')
  const [points, setPoints] = useState<PontoInput[]>([])

  const importEnriquecido = useMemo(
    () => (preview ? enriquecerPreviewImportacao(preview, [], []) : null),
    [preview],
  )

  const load = async () => {
    try {
      setContratos(await listContratos())
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar contratos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const close = () => setMenuOpen(null)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', close)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const resetCriacao = () => {
    setDraft(contratoVazio())
    setModoImportacao('nenhum')
    setPreview(null)
    setTitulo('')
    setConcessionaria('')
    setRodovia('')
    setNumero('')
    setProcessoAnaliseId('')
    setPoints([])
    setError('')
  }

  const openCriacao = () => {
    resetCriacao()
    setCreating(true)
  }

  const closeCriacao = () => {
    setCreating(false)
    resetCriacao()
  }

  const readPlanilhaCompleta = async (file: File) => {
    setParsing(true)
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

  const podeImportarCompleta = Boolean(
    importEnriquecido?.grupos.some((group) => (group.pontosNovos > 0 || !group.protocoloExistente) && !group.excedeLimite),
  )

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (modoImportacao === 'planilha_completa' && !preview) {
      setError('Escolha uma planilha com protocolos e pontos ou altere a opção de importação.')
      return
    }
    if (modoImportacao === 'planilha_completa' && !podeImportarCompleta) {
      setError('A planilha não tem grupos válidos para importar. Revise erros e limites.')
      return
    }
    if (modoImportacao === 'protocolo_inicial') {
      if (!titulo.trim() || !concessionaria.trim() || !rodovia.trim()) {
        setError('Informe título, concessionária e rodovia do protocolo inicial.')
        return
      }
      if (!points.length) {
        setError('Adicione ao menos um ponto (manualmente ou pela planilha) no protocolo inicial.')
        return
      }
    }

    setSaving(true)
    try {
      const contratoId = await criarContrato(draft)
      let notice = 'Contrato criado.'

      if (modoImportacao === 'planilha_completa' && preview) {
        const result = await importarProtocolosEPontos(contratoId, preview)
        notice = `Contrato criado · ${result.importados} protocolo(s) · ${result.pontosCriados} ponto(s) novos.`
      } else if (modoImportacao === 'protocolo_inicial') {
        await criarProtocoloComPontos(
          contratoId,
          { titulo, concessionaria, rodovia, numero, processoAnaliseId },
          points.map((point) => ({ ...point, concessionaria, rodovia })),
        )
        notice = `Contrato criado com protocolo “${titulo.trim()}” e ${points.length} ponto(s).`
      }

      closeCriacao()
      await load()
      navigate(`/gestao-contratos/${contratoId}/protocolos`, { state: { notice } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar contrato.')
    } finally {
      setSaving(false)
    }
  }

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editing) return
    setSaving(true)
    try {
      await atualizarContrato(editing.id, contratoFromModel(editing))
      setEditing(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao editar contrato.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!deleting) return
    setSaving(true)
    try {
      await excluirContrato(deleting.id)
      setDeleting(null)
      setMenuOpen(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir contrato.')
    } finally {
      setSaving(false)
    }
  }

  const submitLabel =
    modoImportacao === 'nenhum'
      ? saving
        ? 'Salvando…'
        : 'Criar contrato'
      : saving
        ? 'Criando…'
        : 'Criar contrato e importar'

  return (
    <div className="gestao-page">
      <header className="gestao-header">
        <div>
          <span className="gestao-eyebrow">Operação por contrato</span>
          <h1>Gestão de Contratos</h1>
          <p>Selecione um contrato para acompanhar aprovações, pontos e entregas.</p>
        </div>
        <button type="button" onClick={openCriacao} aria-haspopup="dialog">
          Novo contrato
        </button>
      </header>
      {error && !creating && <p className="gestao-error" role="alert">{error}</p>}
      <ModalGestao
        open={creating}
        title="Novo contrato"
        description="Cadastre o contrato e, se quiser, já traga protocolos e pontos por planilha."
        labelledBy="gestao-criar-contrato-title"
        onClose={closeCriacao}
      >
        <form onSubmit={(event) => void save(event)} className="gestao-form gestao-form-grid gestao-form-contrato-criar">
          <ContratoFormFields idPrefix="gestao-criar" value={draft} onChange={setDraft} />

          <fieldset className="gestao-import-mode gestao-panel">
            <legend>Conteúdo inicial (opcional)</legend>
            <p className="gestao-import-limit-hint">
              Planilha só de pontos exige um protocolo de referência — use a opção abaixo e preencha os dados do protocolo
              antes de aplicar a planilha.
            </p>
            <label className="gestao-import-mode-option">
              <input
                type="radio"
                name="gestao-modo-importacao"
                checked={modoImportacao === 'nenhum'}
                onChange={() => setModoImportacao('nenhum')}
              />
              Apenas cadastrar o contrato
            </label>
            <label className="gestao-import-mode-option">
              <input
                type="radio"
                name="gestao-modo-importacao"
                checked={modoImportacao === 'planilha_completa'}
                onChange={() => setModoImportacao('planilha_completa')}
              />
              Importar planilha com protocolos e pontos
            </label>
            <label className="gestao-import-mode-option">
              <input
                type="radio"
                name="gestao-modo-importacao"
                checked={modoImportacao === 'protocolo_inicial'}
                onChange={() => setModoImportacao('protocolo_inicial')}
              />
              Criar um protocolo inicial com planilha de pontos
            </label>
          </fieldset>

          {modoImportacao === 'planilha_completa' && (
            <section className="gestao-sheet-import gestao-pontos-draft">
              <div className="gestao-draft-heading">
                <div>
                  <strong>Planilha completa</strong>
                  <small>Mesmo formato da importação em Protocolos (título, concessionária, rodovia e pontos por linha).</small>
                </div>
              </div>
              <div className="gestao-sheet-actions">
                <button type="button" className="gestao-button-secondary" onClick={baixarModeloPlanilha}>
                  Baixar modelo
                </button>
                <button
                  type="button"
                  className="gestao-button-secondary"
                  onClick={() => document.getElementById('gestao-criar-planilha-completa')?.click()}
                  disabled={parsing}
                >
                  {parsing ? 'Processando…' : 'Escolher planilha'}
                </button>
                <input
                  id="gestao-criar-planilha-completa"
                  hidden
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void readPlanilhaCompleta(file)
                    event.target.value = ''
                  }}
                />
              </div>
              {importEnriquecido && (
                <div className="gestao-sheet-detect" role="status">
                  <p>
                    {importEnriquecido.totais.protocolos} protocolos · {importEnriquecido.totais.pontos} pontos na
                    planilha · {importEnriquecido.totais.protocolosNovos} novos ·{' '}
                    {importEnriquecido.totais.linhasInvalidas} linhas com erro
                  </p>
                  <p className="gestao-import-limit-hint">
                    Limites: até 499 pontos em protocolo novo e 500 em protocolo existente por gravação.
                  </p>
                  {importEnriquecido.grupos.map((group) => (
                    <div className="gestao-import-group" key={group.key}>
                      <strong>{group.input.titulo}</strong>
                      <span>
                        {group.input.concessionaria} · {group.input.rodovia} · {group.pontos.length} pontos ·{' '}
                        {group.pontosNovos} novos
                      </span>
                      {group.excedeLimite && (
                        <small className="gestao-error">Excede limite de {group.limitePontos} pontos por gravação</small>
                      )}
                    </div>
                  ))}
                  {importEnriquecido.linhasInvalidas.map((item) => (
                    <p className="gestao-error" key={item.linha}>
                      Linha {item.linha}: {item.erros.join(' ')}
                    </p>
                  ))}
                  <div className="gestao-form-footer">
                    {importEnriquecido.linhasInvalidas.length > 0 && (
                      <button
                        type="button"
                        className="gestao-button-secondary"
                        onClick={() => exportarRelatorioErrosImportacao(importEnriquecido.linhasInvalidas)}
                      >
                        Exportar erros (XLSX)
                      </button>
                    )}
                    <button type="button" className="gestao-button-secondary" onClick={() => setPreview(null)}>
                      Trocar planilha
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {modoImportacao === 'protocolo_inicial' && (
            <>
              <label>
                Título do protocolo
                <input name="titulo" required value={titulo} onChange={(e) => setTitulo(e.target.value)} />
              </label>
              <label>
                Concessionária
                <input name="concessionaria" required value={concessionaria} onChange={(e) => setConcessionaria(e.target.value)} />
              </label>
              <label>
                Rodovia
                <input name="rodovia" required value={rodovia} onChange={(e) => setRodovia(e.target.value)} />
              </label>
              <label>
                Número do protocolo
                <input name="numero" value={numero} onChange={(e) => setNumero(e.target.value)} />
              </label>
              <label>
                ID do processo de análise IA (opcional)
                <input name="processoAnaliseId" value={processoAnaliseId} onChange={(e) => setProcessoAnaliseId(e.target.value)} />
              </label>
              <GestaoImportacaoPontosPlanilha
                idPrefix="gestao-criar"
                contexto={{ titulo, concessionaria, rodovia, numero }}
                points={points}
                onPointsChange={setPoints}
                onSugestaoProtocolo={(patch) => {
                  if (patch.titulo && !titulo.trim()) setTitulo(patch.titulo)
                  if (patch.concessionaria && !concessionaria.trim()) setConcessionaria(patch.concessionaria)
                  if (patch.rodovia && !rodovia.trim()) setRodovia(patch.rodovia)
                  if (patch.numero && !numero.trim()) setNumero(patch.numero)
                }}
                onError={setError}
                onClearError={() => setError('')}
              />
              <GestaoPontosRascunhoLista
                points={points}
                onChange={setPoints}
                concessionaria={concessionaria}
                rodovia={rodovia}
              />
            </>
          )}

          {error && creating && <p className="gestao-error" role="alert">{error}</p>}

          <div className="gestao-form-footer">
            <button type="button" className="gestao-button-secondary" onClick={closeCriacao}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}>
              {submitLabel}
            </button>
          </div>
        </form>
      </ModalGestao>
      <ModalGestao
        open={Boolean(editing)}
        title="Editar contrato"
        description="Atualize dados cadastrais usados na operação."
        labelledBy="gestao-editar-contrato-title"
        onClose={() => setEditing(null)}
      >
        {editing && (
          <form onSubmit={(event) => void saveEdit(event)} className="gestao-form gestao-contract-edit-form gestao-form-grid">
            <ContratoFormFields idPrefix="gestao-editar" value={contratoFromModel(editing)} onChange={(next) => setEditing({ ...editing, ...next })} />
            <div className="gestao-form-footer">
              <button type="button" className="gestao-button-secondary" onClick={() => setEditing(null)}>
                Cancelar
              </button>
              <button type="submit" disabled={saving}>
                {saving ? 'Salvando…' : 'Salvar alterações'}
              </button>
            </div>
          </form>
        )}
      </ModalGestao>
      <section>
        <div className="gestao-section-head">
          <div>
            <h2>Contratos</h2>
            <p>
              {contratos.length} {contratos.length === 1 ? 'contrato disponível' : 'contratos disponíveis'}
            </p>
          </div>
        </div>
        {loading ? (
          <GestaoLoadingSkeleton variant="contratos" label="Carregando contratos" />
        ) : contratos.length ? (
          <ul className="gestao-grid">
            {contratos.map((contrato) => (
              <li className="gestao-contract-item" key={contrato.id}>
                <Link className="gestao-card gestao-contract-card" to={`/gestao-contratos/${contrato.id}`}>
                  <span className="gestao-eyebrow">{contrato.numero?.trim() ? `Contrato ${contrato.numero}` : 'Contrato'}</span>
                  <strong className="gestao-contract-card-title">{contrato.nome}</strong>
                  {contrato.situacao && <small className="gestao-status">{nomeGestao(contrato.situacao)}</small>}
                  <span className="gestao-contract-card-cta">
                    Abrir visão geral <span aria-hidden="true">↗</span>
                  </span>
                </Link>
                <div className="gestao-contract-menu">
                  <button
                    type="button"
                    className="gestao-menu-trigger"
                    aria-label={`Ações de ${contrato.nome}`}
                    aria-expanded={menuOpen === contrato.id}
                    aria-controls={`gestao-menu-${contrato.id}`}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => setMenuOpen(menuOpen === contrato.id ? null : contrato.id)}
                  >
                    <span />
                    <span />
                    <span />
                  </button>
                  {menuOpen === contrato.id && (
                    <div id={`gestao-menu-${contrato.id}`} className="gestao-menu-panel" onPointerDown={(event) => event.stopPropagation()}>
                      <button type="button" onClick={() => { setEditing(contrato); setMenuOpen(null) }}>
                        Editar contrato
                      </button>
                      <button type="button" className="gestao-menu-danger" onClick={() => { setDeleting(contrato); setMenuOpen(null) }}>
                        Excluir contrato
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="gestao-empty">
            <h3>Nenhum contrato cadastrado</h3>
            <p>Crie o primeiro contrato para organizar protocolos e pontos sem misturar operações.</p>
            <button type="button" onClick={openCriacao} aria-haspopup="dialog">
              Criar contrato
            </button>
          </div>
        )}
        <ModalGestao
          open={Boolean(deleting)}
          title="Excluir contrato?"
          description="Esta ação remove o contrato e todos os protocolos, pontos e movimentações vinculados."
          labelledBy="gestao-excluir-contrato-title"
          onClose={() => setDeleting(null)}
        >
          {deleting && (
            <div className="gestao-delete-confirm">
              <strong>{tituloContratoGestao(deleting.nome, deleting.numero)}</strong>
              <p>Não será possível recuperar esses dados depois da exclusão.</p>
              <div className="gestao-form-footer">
                <button type="button" className="gestao-button-secondary" onClick={() => setDeleting(null)}>
                  Cancelar
                </button>
                <button type="button" className="gestao-danger-button" onClick={() => void remove()} disabled={saving}>
                  {saving ? 'Excluindo…' : 'Excluir contrato'}
                </button>
              </div>
            </div>
          )}
        </ModalGestao>
      </section>
    </div>
  )
}