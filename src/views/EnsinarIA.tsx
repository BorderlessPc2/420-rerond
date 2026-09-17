import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookMarked,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Eye,
  GraduationCap,
  Hourglass,
  MessageSquareWarning,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import type { TipoAnalise } from '../models/TipoAnalise'
import type {
  GoldenCase,
  GoldenCaseDocumentoRef,
  GoldenCasePar,
  GoldenCaseValidacaoStatus,
} from '../models/GoldenCase'
import type { FeedbackAprendizado } from '../models/FeedbackAprendizado'
import { listTiposAnalise } from '../services/tipoAnalise/tipoAnaliseService'
import {
  createFeedback,
  isFeedbacksMockMode,
  listFeedbacks,
  setFeedbackStatus,
} from '../services/feedback/feedbackService'
import {
  createGoldenCase,
  deleteGoldenCase,
  isGoldenCasesMockMode,
  listGoldenCases,
  setGoldenCaseAtivo,
  setGoldenCaseStatus,
  suggestGoldenCodigo,
  updateGoldenCase,
} from '../services/goldenCase/goldenCaseService'
import {
  buildGoldenCasesPromptBlockFromCases,
  filterGoldenCasesAprovadosParaPreview,
  newParId,
} from '../utils/goldenCasePrompt'
import './EnsinarIA.css'

type HubTab = 'casos' | 'novo' | 'feedback' | 'preview'
type WizardStep = 1 | 2 | 3 | 4

const STATUS_LABEL: Record<GoldenCaseValidacaoStatus, string> = {
  rascunho: 'Rascunho',
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
}

const emptyPar = (): GoldenCasePar => ({
  id: newParId(),
  regraOuItem: '',
  original: '',
  correto: '',
  justificativa: '',
})

const WIZARD_LABELS = ['Tipo', 'Errado × certo', 'Documentos', 'Revisão'] as const

export default function EnsinarIA() {
  const [tab, setTab] = useState<HubTab>('casos')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [tipos, setTipos] = useState<TipoAnalise[]>([])
  const [goldens, setGoldens] = useState<GoldenCase[]>([])
  const [feedbacks, setFeedbacks] = useState<FeedbackAprendizado[]>([])
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<GoldenCaseValidacaoStatus | ''>('')
  const [busca, setBusca] = useState('')
  const [selecionado, setSelecionado] = useState<GoldenCase | null>(null)

  const [wizardStep, setWizardStep] = useState<WizardStep>(1)
  const [gcTipoId, setGcTipoId] = useState('')
  const [gcCodigo, setGcCodigo] = useState('')
  const [gcTitulo, setGcTitulo] = useState('')
  const [gcDescricao, setGcDescricao] = useState('')
  const [gcObservacoes, setGcObservacoes] = useState('')
  const [gcPares, setGcPares] = useState<GoldenCasePar[]>([emptyPar()])
  const [gcDocs, setGcDocs] = useState<GoldenCaseDocumentoRef[]>([])
  const [docNome, setDocNome] = useState('')
  const [docUrl, setDocUrl] = useState('')

  const [fbTipoId, setFbTipoId] = useState('')
  const [fbRegra, setFbRegra] = useState('')
  const [fbOriginal, setFbOriginal] = useState('')
  const [fbCorrecao, setFbCorrecao] = useState('')
  const [fbJustificativa, setFbJustificativa] = useState('')

  const [previewTipoId, setPreviewTipoId] = useState('')
  const prevWizardTipoRef = useRef('')

  const tipoNome = (id: string) => tipos.find((t) => t.id === id)?.nome || id

  const reload = async () => {
    const [t, g, f] = await Promise.all([
      listTiposAnalise(),
      listGoldenCases({ includeInactive: true }),
      listFeedbacks(),
    ])
    setTipos(t)
    setGoldens(g)
    setFeedbacks(f)
  }

  useEffect(() => {
    void reload().catch((err) =>
      setError(err instanceof Error ? err.message : 'Erro ao carregar hub Ensinar a IA.'),
    )
  }, [])

  // Sugere código só quando o tipo do wizard muda (não a cada reload da lista).
  useEffect(() => {
    if (!gcTipoId) {
      prevWizardTipoRef.current = ''
      return
    }
    if (gcTipoId === prevWizardTipoRef.current) return
    prevWizardTipoRef.current = gcTipoId
    const tipo = tipos.find((t) => t.id === gcTipoId)
    const slug = tipo?.slug || tipo?.id || gcTipoId
    setGcCodigo(suggestGoldenCodigo(slug, goldens.filter((g) => g.tipoAnaliseId === gcTipoId)))
  }, [gcTipoId, tipos, goldens])

  const filtrados = useMemo(() => {
    return goldens.filter((item) => {
      if (filtroTipo && item.tipoAnaliseId !== filtroTipo) return false
      if (filtroStatus && item.status !== filtroStatus) return false
      if (busca.trim()) {
        const q = busca.trim().toLowerCase()
        const hay = `${item.codigo} ${item.titulo} ${item.descricao ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [goldens, filtroTipo, filtroStatus, busca])

  const preview = useMemo(() => {
    const tipo = previewTipoId || filtroTipo
    if (!tipo) return { block: '', ids: [] as string[], items: [] as GoldenCase[] }
    const items = filterGoldenCasesAprovadosParaPreview(goldens, tipo, 3)
    const built = buildGoldenCasesPromptBlockFromCases(items)
    return { ...built, items }
  }, [goldens, previewTipoId, filtroTipo])

  const resetWizard = () => {
    setWizardStep(1)
    setGcTipoId('')
    setGcCodigo('')
    setGcTitulo('')
    setGcDescricao('')
    setGcObservacoes('')
    setGcPares([emptyPar()])
    setGcDocs([])
    setDocNome('')
    setDocUrl('')
  }

  const validateWizardStep = (step: WizardStep): string | null => {
    if (step === 1) {
      if (!gcTipoId) return 'Selecione o tipo de análise.'
      if (!gcTitulo.trim()) return 'Informe o título.'
      if (!gcCodigo.trim()) return 'Informe o código.'
    }
    if (step === 2) {
      const ok = gcPares.some(
        (p) => p.original.trim() && p.correto.trim() && p.justificativa.trim(),
      )
      if (!ok) return 'Preencha ao menos um par completo (errado, certo e justificativa).'
    }
    return null
  }

  const handleSalvarCaso = async (status: GoldenCaseValidacaoStatus) => {
    setError(null)
    const err = validateWizardStep(1) || validateWizardStep(2)
    if (err) {
      setError(err)
      return
    }
    try {
      const pares = gcPares.filter(
        (p) => p.original.trim() && p.correto.trim() && p.justificativa.trim(),
      )
      await createGoldenCase({
        codigo: gcCodigo,
        titulo: gcTitulo,
        tipoAnaliseId: gcTipoId,
        descricao: gcDescricao || undefined,
        observacoes: gcObservacoes || undefined,
        pares,
        documentosRef: gcDocs,
        analiseCorreta: pares.map((p) => p.correto).join('\n\n'),
        erroIa: pares[0]?.original,
        status,
      })
      setSuccess(
        status === 'pendente'
          ? 'Caso enviado para validação. Após aprovação, entra no acervo de ensino do tipo.'
          : 'Caso salvo.',
      )
      resetWizard()
      setTab('casos')
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar caso.')
    }
  }

  const mockBanner = isGoldenCasesMockMode() || isFeedbacksMockMode()

  const stats = useMemo(() => {
    const aprovados = goldens.filter((g) => g.status === 'aprovado' && g.ativo).length
    const pendentes = goldens.filter((g) => g.status === 'pendente').length
    const clientePendentes = goldens.filter(
      (g) => g.status === 'pendente' && g.id.startsWith('cliente-'),
    ).length
    const feedbackAprovados = feedbacks.filter((f) => f.status === 'aprovado').length
    const coberturaTipos = [
      'poc',
      'ppu',
      'pac-viabilidade',
      'pac-executivo',
      'pan',
      'acesso',
    ].map((id) => ({
      id,
      nome: tipos.find((t) => t.id === id)?.nome || id,
      total: goldens.filter((g) => g.tipoAnaliseId === id).length,
      aprovados: goldens.filter(
        (g) => g.tipoAnaliseId === id && g.status === 'aprovado' && g.ativo,
      ).length,
      pendentes: goldens.filter((g) => g.tipoAnaliseId === id && g.status === 'pendente')
        .length,
    }))
    const taxaAprovacao =
      goldens.length === 0 ? 0 : Math.round((aprovados / goldens.length) * 100)
    return {
      total: goldens.length,
      aprovados,
      pendentes,
      clientePendentes,
      feedbackAprovados,
      coberturaTipos,
      taxaAprovacao,
    }
  }, [goldens, feedbacks, tipos])

  return (
    <div className="ensinar-ia">
      <header className="ensinar-ia-hero">
        <div className="ensinar-ia-hero-glow" aria-hidden />
        <div className="ensinar-ia-hero-inner">
          <div className="ensinar-ia-header-main">
            <div className="ensinar-ia-brand-mark" aria-hidden>
              <GraduationCap size={26} strokeWidth={2.1} />
            </div>
            <div className="ensinar-ia-hero-copy">
              <p className="ensinar-ia-eyebrow">
                <Sparkles size={14} strokeWidth={2.2} aria-hidden />
                Centro de aprendizado · BaseInfra
              </p>
              <h1>Ensinar a IA</h1>
              <p>
                Aqui o time valida o que a análise deve repetir. Cada caso aprovado vira
                memória do domínio — sem fine-tune, com controle humano.
              </p>
            </div>
          </div>

          <ol className="ensinar-ia-journey" aria-label="Como o ensino funciona">
            <li>
              <span className="ensinar-ia-journey-icon" aria-hidden>
                <BookMarked size={18} />
              </span>
              <div>
                <strong>1. Casos modelo</strong>
                <span>Errado × certo por tipologia</span>
              </div>
            </li>
            <li>
              <span className="ensinar-ia-journey-icon" aria-hidden>
                <ClipboardCheck size={18} />
              </span>
              <div>
                <strong>2. Você aprova</strong>
                <span>Só entra o que o cliente valida</span>
              </div>
            </li>
            <li>
              <span className="ensinar-ia-journey-icon" aria-hidden>
                <Brain size={18} />
              </span>
              <div>
                <strong>3. Próximas análises</strong>
                <span>Injetado no prompt do mesmo tipo</span>
              </div>
            </li>
          </ol>
        </div>

        <div className="ensinar-ia-stats" aria-label="Resumo do acervo">
          <div className="ensinar-ia-stat accent-ok">
            <span className="ensinar-ia-stat-icon" aria-hidden>
              <ShieldCheck size={16} />
            </span>
            <span className="ensinar-ia-stat-value">{stats.aprovados}</span>
            <span className="ensinar-ia-stat-label">Aprovados ativos</span>
          </div>
          <div className="ensinar-ia-stat accent-wait">
            <span className="ensinar-ia-stat-icon" aria-hidden>
              <Hourglass size={16} />
            </span>
            <span className="ensinar-ia-stat-value">{stats.pendentes}</span>
            <span className="ensinar-ia-stat-label">Aguardando validação</span>
          </div>
          <div className="ensinar-ia-stat">
            <span className="ensinar-ia-stat-icon" aria-hidden>
              <BookMarked size={16} />
            </span>
            <span className="ensinar-ia-stat-value">{stats.total}</span>
            <span className="ensinar-ia-stat-label">Casos no acervo</span>
          </div>
          <div className="ensinar-ia-stat">
            <span className="ensinar-ia-stat-icon" aria-hidden>
              <MessageSquareWarning size={16} />
            </span>
            <span className="ensinar-ia-stat-value">{stats.feedbackAprovados}</span>
            <span className="ensinar-ia-stat-label">Correções pontuais</span>
          </div>
        </div>

        <div className="ensinar-ia-progress-block" aria-label="Taxa de aprovação do acervo">
          <div className="ensinar-ia-progress-head">
            <span>Taxa de aprovação no acervo</span>
            <strong>{stats.taxaAprovacao}%</strong>
          </div>
          <div
            className="ensinar-ia-progress-track"
            role="progressbar"
            aria-valuenow={stats.taxaAprovacao}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="ensinar-ia-progress-fill"
              style={{ width: `${stats.taxaAprovacao}%` }}
            />
          </div>
        </div>

        <div className="ensinar-ia-coverage" aria-label="Cobertura por tipo crítico">
          <p className="ensinar-ia-coverage-title">Cobertura por tipo crítico</p>
          <div className="ensinar-ia-coverage-chips">
            {stats.coberturaTipos.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`ensinar-ia-coverage-chip ${t.pendentes > 0 ? 'has-pending' : ''} ${t.aprovados > 0 ? 'has-approved' : ''}`}
                onClick={() => {
                  setFiltroTipo(t.id)
                  setFiltroStatus('')
                  setTab('casos')
                }}
                title={`${t.aprovados} aprovado(s), ${t.pendentes} pendente(s)`}
              >
                <span className="ensinar-ia-coverage-name">{t.nome}</span>
                <span className="ensinar-ia-coverage-count">
                  {t.aprovados}/{t.total}
                </span>
              </button>
            ))}
          </div>
        </div>

        {mockBanner && (
          <p className="ensinar-ia-mock" role="status">
            Modo local: Firestore sem permissão. Dados ficam no navegador até o deploy.
          </p>
        )}
        {stats.clientePendentes > 0 && (
          <div className="ensinar-ia-callout" role="status">
            <div className="ensinar-ia-callout-icon" aria-hidden>
              <ClipboardCheck size={20} />
            </div>
            <div className="ensinar-ia-callout-body">
              <strong>
                {stats.clientePendentes} caso(s) do material do cliente prontos para validar
              </strong>
              <p>
                Seed a partir dos checklists e gabaritos. Só entram no prompt depois da
                aprovação — o cliente decide o que a IA aprende.
              </p>
            </div>
            <button
              type="button"
              className="ensinar-ia-btn"
              onClick={() => {
                setFiltroStatus('pendente')
                setFiltroTipo('')
                setTab('casos')
              }}
            >
              Revisar pendentes
            </button>
          </div>
        )}
      </header>

      <nav className="ensinar-ia-tabs" aria-label="Seções do hub">
        <button
          type="button"
          className={tab === 'casos' ? 'active' : ''}
          onClick={() => setTab('casos')}
          aria-current={tab === 'casos' ? 'page' : undefined}
        >
          <BookMarked size={16} />
          Casos modelo
          <span className="ensinar-ia-tab-count">{stats.total}</span>
        </button>
        <button
          type="button"
          className={tab === 'novo' ? 'active' : ''}
          onClick={() => {
            resetWizard()
            setTab('novo')
          }}
          aria-current={tab === 'novo' ? 'page' : undefined}
        >
          <Plus size={16} />
          Novo caso
        </button>
        <button
          type="button"
          className={tab === 'feedback' ? 'active' : ''}
          onClick={() => setTab('feedback')}
          aria-current={tab === 'feedback' ? 'page' : undefined}
        >
          <MessageSquareWarning size={16} />
          Correção pontual
        </button>
        <button
          type="button"
          className={tab === 'preview' ? 'active' : ''}
          onClick={() => setTab('preview')}
          aria-current={tab === 'preview' ? 'page' : undefined}
        >
          <Eye size={16} />
          Preview do prompt
        </button>
      </nav>

      {error && (
        <div className="ensinar-ia-error" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="ensinar-ia-success" role="status">
          {success}
        </div>
      )}

      {tab === 'casos' && (
        <section className="ensinar-ia-card ensinar-ia-panel">
          <div className="ensinar-ia-panel-head">
            <div>
              <h2>Acervo por tipo</h2>
              <p className="ensinar-ia-hint">
                Abra um caso para aprovar, revogar ou revisar os pares errado × certo.
                Casos com selo <strong>Material cliente</strong> vieram dos checklists e
                gabaritos — valide antes de liberar o ensino.
              </p>
            </div>
            <button
              type="button"
              className="ensinar-ia-btn"
              onClick={() => {
                resetWizard()
                setTab('novo')
              }}
            >
              <Plus size={16} /> Novo caso
            </button>
          </div>

          <div className="ensinar-ia-filters">
            <label>
              Tipo
              <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                <option value="">Todos</option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value as GoldenCaseValidacaoStatus | '')}
              >
                <option value="">Todos</option>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Busca
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Código ou título…"
              />
            </label>
          </div>

          {filtrados.length === 0 ? (
            <div className="ensinar-ia-empty">
              <div className="ensinar-ia-empty-icon" aria-hidden>
                <BookMarked size={28} />
              </div>
              <h3>Nenhum caso neste filtro</h3>
              <p>
                Cadastre um caso completo (tipo + pares). Em poucos minutos o acervo fica pronto
                para ensinar análises do mesmo domínio.
              </p>
              <button
                type="button"
                className="ensinar-ia-btn"
                onClick={() => {
                  resetWizard()
                  setTab('novo')
                }}
              >
                Cadastrar caso modelo
              </button>
            </div>
          ) : (
            <div className="ensinar-ia-grid-cards">
              {filtrados.map((item) => {
                const par0 = item.pares[0]
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="ensinar-ia-case-card"
                    onClick={() => setSelecionado(item)}
                  >
                    <div className="ensinar-ia-case-card-top">
                      <span className={`ensinar-ia-badge status-${item.status}`}>
                        {STATUS_LABEL[item.status]}
                      </span>
                      {!item.ativo && <span className="ensinar-ia-badge inactive">Inativo</span>}
                      {item.id.startsWith('cliente-') && (
                        <span className="ensinar-ia-badge client">Material cliente</span>
                      )}
                      <span className="ensinar-ia-case-meta">{tipoNome(item.tipoAnaliseId)}</span>
                    </div>
                    <strong className="ensinar-ia-case-title">
                      <span className="ensinar-ia-case-code">{item.codigo}</span>
                      {item.titulo}
                    </strong>
                    {par0 && (
                      <div className="ensinar-ia-pair-split">
                        <div className="ensinar-ia-pair-col wrong-col">
                          <span className="ensinar-ia-pair-label">Errado</span>
                          <p>
                            {par0.original.slice(0, 90)}
                            {par0.original.length > 90 ? '…' : ''}
                          </p>
                        </div>
                        <div className="ensinar-ia-pair-col right-col">
                          <span className="ensinar-ia-pair-label">Certo</span>
                          <p>
                            {par0.correto.slice(0, 90)}
                            {par0.correto.length > 90 ? '…' : ''}
                          </p>
                        </div>
                      </div>
                    )}
                    <span className="ensinar-ia-case-footer">
                      {item.pares.length} par{item.pares.length === 1 ? '' : 'es'} · abrir detalhe
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      )}

      {tab === 'novo' && (
        <section className="ensinar-ia-card ensinar-ia-panel">
          <ol className="ensinar-ia-steps" aria-label="Etapas do wizard">
            {WIZARD_LABELS.map((label, idx) => {
              const step = (idx + 1) as WizardStep
              const state =
                wizardStep === step ? 'active' : wizardStep > step ? 'done' : 'todo'
              return (
                <li key={label} className={state}>
                  <span className="ensinar-ia-step-index">{step}</span>
                  <span className="ensinar-ia-step-label">{label}</span>
                </li>
              )
            })}
          </ol>

          {wizardStep === 1 && (
            <>
              <h2>Tipo e metadados</h2>
              <p className="ensinar-ia-hint">
                O caso só ensina análises do <strong>mesmo tipo</strong>. O código é sugerido ao
                escolher o tipo.
              </p>
              <label>
                Tipo de análise *
                <select value={gcTipoId} onChange={(e) => setGcTipoId(e.target.value)}>
                  <option value="">Selecione…</option>
                  {tipos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                    </option>
                  ))}
                </select>
              </label>
              <div className="ensinar-ia-grid">
                <label>
                  Código *
                  <input value={gcCodigo} onChange={(e) => setGcCodigo(e.target.value)} />
                </label>
                <label>
                  Título *
                  <input value={gcTitulo} onChange={(e) => setGcTitulo(e.target.value)} />
                </label>
              </div>
              <label>
                Descrição (opcional)
                <textarea value={gcDescricao} onChange={(e) => setGcDescricao(e.target.value)} rows={2} />
              </label>
            </>
          )}

          {wizardStep === 2 && (
            <>
              <h2>Pares errado × certo</h2>
              <p className="ensinar-ia-hint">
                Cada par ensina um erro típico e a correção esperada, com justificativa.
              </p>
              {gcPares.map((par, index) => (
                <div key={par.id} className="ensinar-ia-par">
                  <div className="ensinar-ia-par-head">
                    <strong>Par {index + 1}</strong>
                    {gcPares.length > 1 && (
                      <button
                        type="button"
                        className="ensinar-ia-linkish"
                        onClick={() => setGcPares((prev) => prev.filter((p) => p.id !== par.id))}
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  <label>
                    Item / regra (opcional)
                    <input
                      value={par.regraOuItem ?? ''}
                      onChange={(e) =>
                        setGcPares((prev) =>
                          prev.map((p) =>
                            p.id === par.id ? { ...p, regraOuItem: e.target.value } : p,
                          ),
                        )
                      }
                    />
                  </label>
                  <div className="ensinar-ia-pair-fields">
                    <label className="ensinar-ia-field-wrong">
                      Errado (o que a IA fez/disse) *
                      <textarea
                        value={par.original}
                        onChange={(e) =>
                          setGcPares((prev) =>
                            prev.map((p) =>
                              p.id === par.id ? { ...p, original: e.target.value } : p,
                            ),
                          )
                        }
                        rows={3}
                      />
                    </label>
                    <label className="ensinar-ia-field-right">
                      Correto *
                      <textarea
                        value={par.correto}
                        onChange={(e) =>
                          setGcPares((prev) =>
                            prev.map((p) =>
                              p.id === par.id ? { ...p, correto: e.target.value } : p,
                            ),
                          )
                        }
                        rows={3}
                      />
                    </label>
                  </div>
                  <label className="ensinar-ia-field-why">
                    Justificativa *
                    <textarea
                      value={par.justificativa}
                      onChange={(e) =>
                        setGcPares((prev) =>
                          prev.map((p) =>
                            p.id === par.id ? { ...p, justificativa: e.target.value } : p,
                          ),
                        )
                      }
                      rows={2}
                    />
                  </label>
                </div>
              ))}
              <button
                type="button"
                className="ensinar-ia-btn secondary"
                onClick={() => setGcPares((prev) => [...prev, emptyPar()])}
              >
                <Plus size={16} /> Adicionar par
              </button>
            </>
          )}

          {wizardStep === 3 && (
            <>
              <h2>Documentos de referência</h2>
              <p className="ensinar-ia-hint">
                Nome e URL opcionais. Upload nativo no Storage pode vir depois.
              </p>
              <div className="ensinar-ia-grid">
                <label>
                  Nome do arquivo
                  <input value={docNome} onChange={(e) => setDocNome(e.target.value)} />
                </label>
                <label>
                  URL (opcional)
                  <input value={docUrl} onChange={(e) => setDocUrl(e.target.value)} />
                </label>
              </div>
              <button
                type="button"
                className="ensinar-ia-btn secondary"
                onClick={() => {
                  if (!docNome.trim()) return
                  setGcDocs((prev) => [
                    ...prev,
                    { nome: docNome.trim(), url: docUrl.trim() || null, storagePath: null },
                  ])
                  setDocNome('')
                  setDocUrl('')
                }}
              >
                Adicionar documento
              </button>
              <ul className="ensinar-ia-doc-list">
                {gcDocs.map((d, i) => (
                  <li key={`${d.nome}-${i}`}>
                    {d.nome}
                    {d.url ? ` — ${d.url}` : ''}
                    <button
                      type="button"
                      onClick={() => setGcDocs((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              <label>
                Observações (opcional)
                <textarea
                  value={gcObservacoes}
                  onChange={(e) => setGcObservacoes(e.target.value)}
                  rows={2}
                />
              </label>
            </>
          )}

          {wizardStep === 4 && (
            <>
              <h2>Revisão</h2>
              <p className="ensinar-ia-hint">
                Ao enviar, o caso fica <strong>pendente</strong> até aprovação.
              </p>
              <dl className="ensinar-ia-review">
                <div>
                  <dt>Tipo</dt>
                  <dd>{tipoNome(gcTipoId)}</dd>
                </div>
                <div>
                  <dt>Código</dt>
                  <dd>{gcCodigo}</dd>
                </div>
                <div>
                  <dt>Título</dt>
                  <dd>{gcTitulo}</dd>
                </div>
                <div>
                  <dt>Pares</dt>
                  <dd>{gcPares.filter((p) => p.original && p.correto && p.justificativa).length}</dd>
                </div>
                <div>
                  <dt>Documentos</dt>
                  <dd>{gcDocs.length}</dd>
                </div>
              </dl>
              <div className="ensinar-ia-actions">
                <button
                  type="button"
                  className="ensinar-ia-btn"
                  onClick={() => void handleSalvarCaso('pendente')}
                >
                  <CheckCircle2 size={16} /> Enviar para validação
                </button>
              </div>
            </>
          )}

          <div className="ensinar-ia-wizard-nav">
            <button
              type="button"
              className="ensinar-ia-btn secondary"
              disabled={wizardStep === 1}
              onClick={() => setWizardStep((s) => (s > 1 ? ((s - 1) as WizardStep) : s))}
            >
              <ChevronLeft size={16} /> Voltar
            </button>
            {wizardStep < 4 && (
              <button
                type="button"
                className="ensinar-ia-btn"
                onClick={() => {
                  const err = validateWizardStep(wizardStep)
                  if (err) {
                    setError(err)
                    return
                  }
                  setError(null)
                  setWizardStep((s) => (s < 4 ? ((s + 1) as WizardStep) : s))
                }}
              >
                Continuar <ChevronRight size={16} />
              </button>
            )}
          </div>
        </section>
      )}

      {tab === 'feedback' && (
        <section className="ensinar-ia-card ensinar-ia-panel">
          <div className="ensinar-ia-panel-head">
            <div>
              <h2>Correção pontual</h2>
              <p className="ensinar-ia-hint">
                Um único item (regra → errado → certo). Para vários pares, use{' '}
                <button type="button" className="ensinar-ia-linkish" onClick={() => setTab('novo')}>
                  Novo caso modelo
                </button>
                .
              </p>
            </div>
          </div>
          <div className="ensinar-ia-feedback-layout">
            <div className="ensinar-ia-feedback-form">
              <label>
                Tipo *
                <select value={fbTipoId} onChange={(e) => setFbTipoId(e.target.value)}>
                  <option value="">Selecione…</option>
                  {tipos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Item / regra *
                <input value={fbRegra} onChange={(e) => setFbRegra(e.target.value)} />
              </label>
              <div className="ensinar-ia-pair-fields">
                <label className="ensinar-ia-field-wrong">
                  Original (errado) *
                  <textarea
                    value={fbOriginal}
                    onChange={(e) => setFbOriginal(e.target.value)}
                    rows={3}
                  />
                </label>
                <label className="ensinar-ia-field-right">
                  Correção (certo) *
                  <textarea
                    value={fbCorrecao}
                    onChange={(e) => setFbCorrecao(e.target.value)}
                    rows={3}
                  />
                </label>
              </div>
              <label className="ensinar-ia-field-why">
                Justificativa *
                <textarea
                  value={fbJustificativa}
                  onChange={(e) => setFbJustificativa(e.target.value)}
                  rows={2}
                />
              </label>
              <button
                type="button"
                className="ensinar-ia-btn"
                onClick={() => {
                  void (async () => {
                    setError(null)
                    if (!fbTipoId.trim()) {
                      setError('Selecione o tipo.')
                      return
                    }
                    try {
                      await createFeedback({
                        tipoAnaliseId: fbTipoId,
                        regraOuItem: fbRegra,
                        original: fbOriginal,
                        correcao: fbCorrecao,
                        justificativa: fbJustificativa,
                        status: 'pendente',
                      })
                      setFbRegra('')
                      setFbOriginal('')
                      setFbCorrecao('')
                      setFbJustificativa('')
                      setSuccess('Correção pontual enviada para validação.')
                      await reload()
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Erro ao registrar feedback.')
                    }
                  })()
                }}
              >
                Enviar para validação
              </button>
            </div>

            <div className="ensinar-ia-feedback-queue">
              <h3>Fila de validação</h3>
              {feedbacks.length === 0 ? (
                <div className="ensinar-ia-empty compact">
                  <p>Nenhuma correção pontual ainda.</p>
                </div>
              ) : (
                <ul className="ensinar-ia-list">
                  {feedbacks.map((item) => (
                    <li key={item.id}>
                      <div className="ensinar-ia-list-head">
                        <span className={`ensinar-ia-badge status-${item.status}`}>
                          {STATUS_LABEL[item.status] ?? item.status}
                        </span>
                        <strong>{item.regraOuItem}</strong>
                      </div>
                      <div className="ensinar-ia-pair-split">
                        <div className="ensinar-ia-pair-col wrong-col">
                          <span className="ensinar-ia-pair-label">Errado</span>
                          <p>
                            {item.original.slice(0, 120)}
                            {item.original.length > 120 ? '…' : ''}
                          </p>
                        </div>
                        <div className="ensinar-ia-pair-col right-col">
                          <span className="ensinar-ia-pair-label">Certo</span>
                          <p>
                            {item.correcao.slice(0, 120)}
                            {item.correcao.length > 120 ? '…' : ''}
                          </p>
                        </div>
                      </div>
                      {(item.status === 'pendente' || item.status === 'rascunho') && (
                        <div className="ensinar-ia-row-actions">
                          <button
                            type="button"
                            className="ensinar-ia-btn-sm success"
                            onClick={() =>
                              void setFeedbackStatus(item.id, 'aprovado').then(reload)
                            }
                          >
                            Aprovar
                          </button>
                          <button
                            type="button"
                            className="ensinar-ia-btn-sm danger"
                            onClick={() =>
                              void setFeedbackStatus(item.id, 'rejeitado').then(reload)
                            }
                          >
                            Rejeitar
                          </button>
                        </div>
                      )}
                      {item.status === 'aprovado' && (
                        <div className="ensinar-ia-row-actions">
                          <button
                            type="button"
                            className="ensinar-ia-btn-sm"
                            onClick={() =>
                              void setFeedbackStatus(item.id, 'rejeitado', 'Revogado').then(reload)
                            }
                          >
                            Revogar
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

      {tab === 'preview' && (
        <section className="ensinar-ia-card ensinar-ia-panel">
          <h2>Preview do prompt</h2>
          <p className="ensinar-ia-hint">
            Bloco que a análise receberia para o tipo (casos <strong>aprovados</strong>, máx. 3).
            A execução real depende de OpenAI + deploy das functions.
          </p>
          <label>
            Tipo para preview
            <select value={previewTipoId} onChange={(e) => setPreviewTipoId(e.target.value)}>
              <option value="">Selecione…</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </label>
          {preview.ids.length > 0 ? (
            <>
              <p className="ensinar-ia-muted">
                {preview.ids.length} caso{preview.ids.length === 1 ? '' : 's'} no bloco · IDs:{' '}
                {preview.ids.join(', ')}
              </p>
              <pre className="ensinar-ia-preview-block">{preview.block}</pre>
            </>
          ) : (
            <div className="ensinar-ia-empty compact">
              <h3>Nada para injetar ainda</h3>
              <p>Aprove casos modelo deste tipo na aba Casos para ver o bloco aqui.</p>
            </div>
          )}
        </section>
      )}

      <p className="ensinar-ia-footer-link">
        Tipos de análise e cadastros técnicos:{' '}
        <Link to="/configuracoes">Configurações</Link>
      </p>

      {selecionado && (
        <div
          className="ensinar-ia-drawer-overlay"
          onClick={() => setSelecionado(null)}
          role="presentation"
        >
          <aside
            className="ensinar-ia-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ensinar-ia-drawer-title"
          >
            <header>
              <div>
                <p className="ensinar-ia-drawer-kicker">{tipoNome(selecionado.tipoAnaliseId)}</p>
                <h2 id="ensinar-ia-drawer-title">
                  <span className="ensinar-ia-case-code">{selecionado.codigo}</span>
                  {selecionado.titulo}
                </h2>
                <div className="ensinar-ia-drawer-meta">
                  <span className={`ensinar-ia-badge status-${selecionado.status}`}>
                    {STATUS_LABEL[selecionado.status]}
                  </span>
                  {!selecionado.ativo && (
                    <span className="ensinar-ia-badge inactive">Inativo</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="ensinar-ia-icon-btn"
                aria-label="Fechar"
                onClick={() => setSelecionado(null)}
              >
                <X size={20} />
              </button>
            </header>

            {selecionado.descricao && (
              <p className="ensinar-ia-drawer-desc">{selecionado.descricao}</p>
            )}

            <h3>Pares errado × certo</h3>
            {selecionado.pares.length === 0 && <p className="ensinar-ia-muted">Sem pares.</p>}
            {selecionado.pares.map((par, i) => (
              <div key={par.id} className="ensinar-ia-par-view">
                <strong>
                  Par {i + 1}
                  {par.regraOuItem ? ` — ${par.regraOuItem}` : ''}
                </strong>
                <div className="ensinar-ia-pair-split">
                  <div className="ensinar-ia-pair-col wrong-col">
                    <span className="ensinar-ia-pair-label">Errado</span>
                    <p>{par.original}</p>
                  </div>
                  <div className="ensinar-ia-pair-col right-col">
                    <span className="ensinar-ia-pair-label">Certo</span>
                    <p>{par.correto}</p>
                  </div>
                </div>
                <p className="ensinar-ia-why-line">
                  <span className="why">Por quê:</span> {par.justificativa}
                </p>
              </div>
            ))}

            {selecionado.documentosRef.length > 0 && (
              <>
                <h3>Documentos</h3>
                <ul className="ensinar-ia-doc-list">
                  {selecionado.documentosRef.map((d, i) => (
                    <li key={`${d.nome}-${i}`}>
                      {d.nome}
                      {d.url ? (
                        <>
                          {' '}
                          —{' '}
                          <a href={d.url} target="_blank" rel="noreferrer">
                            link
                          </a>
                        </>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="ensinar-ia-drawer-actions">
              {(selecionado.status === 'pendente' || selecionado.status === 'rascunho') && (
                <>
                  <button
                    type="button"
                    className="ensinar-ia-btn"
                    onClick={() =>
                      void setGoldenCaseStatus(selecionado.id, 'aprovado').then(async () => {
                        await reload()
                        setSelecionado(null)
                        setSuccess('Caso aprovado — entra no ensino do tipo.')
                      })
                    }
                  >
                    <CheckCircle2 size={16} /> Aprovar
                  </button>
                  <button
                    type="button"
                    className="ensinar-ia-btn secondary danger-outline"
                    onClick={() =>
                      void setGoldenCaseStatus(selecionado.id, 'rejeitado').then(async () => {
                        await reload()
                        setSelecionado(null)
                      })
                    }
                  >
                    Rejeitar
                  </button>
                </>
              )}
              {selecionado.status === 'aprovado' && (
                <button
                  type="button"
                  className="ensinar-ia-btn secondary"
                  onClick={() =>
                    void setGoldenCaseStatus(
                      selecionado.id,
                      'rejeitado',
                      'Revogado — deixa de entrar nas análises',
                    ).then(async () => {
                      await reload()
                      setSelecionado(null)
                    })
                  }
                >
                  Revogar
                </button>
              )}
              <button
                type="button"
                className="ensinar-ia-btn secondary"
                onClick={() =>
                  void setGoldenCaseAtivo(selecionado.id, !selecionado.ativo).then(async () => {
                    await reload()
                    setSelecionado(null)
                  })
                }
              >
                {selecionado.ativo ? 'Desativar' : 'Reativar'}
              </button>
              {selecionado.status === 'rejeitado' && (
                <button
                  type="button"
                  className="ensinar-ia-btn secondary"
                  onClick={() =>
                    void updateGoldenCase(selecionado.id, { status: 'pendente' }).then(async () => {
                      await reload()
                      setSelecionado(null)
                    })
                  }
                >
                  Reabrir como pendente
                </button>
              )}
              <button
                type="button"
                className="ensinar-ia-btn secondary danger-outline"
                onClick={() => {
                  const ok = window.confirm(
                    `Remover o caso "${selecionado.codigo} — ${selecionado.titulo}"?\n\nEsta ação não pode ser desfeita. O caso deixa de ensinar a IA.`,
                  )
                  if (!ok) return
                  void (async () => {
                    setError(null)
                    try {
                      await deleteGoldenCase(selecionado.id)
                      setSelecionado(null)
                      setSuccess('Caso modelo removido do acervo.')
                      await reload()
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Erro ao remover o caso.')
                    }
                  })()
                }}
              >
                <Trash2 size={16} /> Remover caso
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
