import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  Brain,
  Clock3,
  Download,
  FileText,
  FileWarning,
  Percent,
  RefreshCw,
  ShieldCheck,
  Target,
} from 'lucide-react'
import type { SolicitacaoWithFiles } from '../models/Solicitacao'
import { listFeedbacks } from '../services/feedback/feedbackService'
import { listGoldenCases } from '../services/goldenCase/goldenCaseService'
import { getAllSolicitacoes } from '../services/solicitacao/solicitacaoService'
import './MetricasIA.css'

type TipoMetricas = {
  tipo: string
  analises: number
  reanalises: number
  feedbacksAprovados: number
  goldensAprovados: number
  goldensInjetados: number
  documentChunksInjetados: number
  documentRagPdfsPulados: number
  falhas: number
  falhasLimite: number
  falhasTimeout: number
  duracaoMediaMs: number
  tokensMedios: number
  lotesMedios: number
  normasCustomPdf: number
  assertividadeComScore: number
  assertividadeMedia: number
  criticosOkPct: number
  evidenciaComScore: number
  evidenciaCompletaMedia: number
  itensFrageis: number
  complementosHumanos: number
}

const tipoDaSolicitacao = (s: SolicitacaoWithFiles) =>
  s.tipoAnaliseIdUsado || s.tipoAnaliseId || 'sem-tipo'

const formatMs = (ms: number) => {
  if (!ms) return '-'
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}min ${seconds % 60}s`
}

const formatNumber = (value: number) => (value ? value.toLocaleString('pt-BR') : '-')

const formatPct = (value: number, hasData: boolean) =>
  hasData ? `${Math.round(value * 10) / 10}%` : '-'

const downloadCsv = (rows: TipoMetricas[]) => {
  const header = [
    'tipo',
    'analises',
    'reanalises',
    'feedbacks_aprovados',
    'goldens_aprovados',
    'goldens_injetados',
    'document_chunks_injetados',
    'document_rag_pdfs_pulados',
    'falhas',
    'falhas_429_timeout',
    'duracao_media_ms',
    'tokens_medios',
    'lotes_medios',
    'normas_custom_pdf',
    'assertividade_n_scored',
    'assertividade_media_pct',
    'criticos_ok_pct',
    'evidencia_n_scored',
    'evidencia_completa_pct',
    'itens_frageis',
    'complementos_humanos',
  ]
  const lines = rows.map((row) =>
    [
      row.tipo,
      row.analises,
      row.reanalises,
      row.feedbacksAprovados,
      row.goldensAprovados,
      row.goldensInjetados,
      row.documentChunksInjetados,
      row.documentRagPdfsPulados,
      row.falhas,
      row.falhasLimite + row.falhasTimeout,
      Math.round(row.duracaoMediaMs),
      Math.round(row.tokensMedios),
      Math.round(row.lotesMedios * 10) / 10,
      row.normasCustomPdf,
      row.assertividadeComScore,
      row.assertividadeComScore ? Math.round(row.assertividadeMedia * 10) / 10 : '',
      row.assertividadeComScore ? Math.round(row.criticosOkPct * 10) / 10 : '',
      row.evidenciaComScore,
      row.evidenciaComScore ? Math.round(row.evidenciaCompletaMedia * 10) / 10 : '',
      row.itensFrageis,
      row.complementosHumanos,
    ]
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(','),
  )
  const blob = new Blob([[header.join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `metricas-assertividade-${new Date().toISOString().slice(0, 10)}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function MetricasIA() {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoWithFiles[]>([])
  const [feedbacks, setFeedbacks] = useState<Awaited<ReturnType<typeof listFeedbacks>>>([])
  const [goldens, setGoldens] = useState<Awaited<ReturnType<typeof listGoldenCases>>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true)
        setError(null)
        const [sol, fb, gc] = await Promise.all([
          getAllSolicitacoes(),
          listFeedbacks(),
          listGoldenCases({ includeInactive: true }),
        ])
        setSolicitacoes(sol)
        setFeedbacks(fb)
        setGoldens(gc)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar métricas.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const metricas = useMemo(() => {
    const tipos = new Set<string>()
    solicitacoes.forEach((s) => tipos.add(tipoDaSolicitacao(s)))
    feedbacks.forEach((f) => tipos.add(f.tipoAnaliseId || 'sem-tipo'))
    goldens.forEach((g) => tipos.add(g.tipoAnaliseId || 'sem-tipo'))

    return [...tipos]
      .sort((a, b) => a.localeCompare(b))
      .map<TipoMetricas>((tipo) => {
        const porTipo = solicitacoes.filter((s) => tipoDaSolicitacao(s) === tipo)
        const comTelemetry = porTipo.filter((s) => s.analiseTelemetry)
        const comScore = porTipo.filter((s) => s.assertividadeScore)
        const comEvidencia = porTipo.filter((s) => s.evidenceVerification)
        const sum = (selector: (s: SolicitacaoWithFiles) => number | undefined | null) =>
          comTelemetry.reduce((acc, s) => acc + (selector(s) ?? 0), 0)
        const avg = (selector: (s: SolicitacaoWithFiles) => number | undefined | null) =>
          comTelemetry.length ? sum(selector) / comTelemetry.length : 0
        const falhas = porTipo.filter((s) => s.analiseJobStatus === 'failed' || s.analiseErroCodigo)
        const falhaCodigo = (code: string) =>
          falhas.filter((s) => (s.analiseErroCodigo || s.analiseTelemetry?.errorCode) === code)
            .length

        const assertividadeMedia = comScore.length
          ? comScore.reduce((acc, s) => acc + (s.assertividadeScore?.percentual ?? 0), 0) /
            comScore.length
          : 0
        const criticosOkPct = comScore.length
          ? (comScore.filter((s) => s.assertividadeScore?.passouCriticos).length /
              comScore.length) *
            100
          : 0
        const evidenciaCompletaMedia = comEvidencia.length
          ? (comEvidencia.reduce(
              (acc, s) =>
                acc + (s.evidenceVerification?.percentualComEvidenciaCompleta ?? 0),
              0,
            ) /
              comEvidencia.length) *
            100
          : 0

        return {
          tipo,
          analises: porTipo.filter((s) => s.analisadoPorIA).length,
          reanalises: porTipo.filter((s) => (s.analiseVersaoAtual ?? 0) > 1).length,
          feedbacksAprovados: feedbacks.filter(
            (f) => f.tipoAnaliseId === tipo && f.status === 'aprovado',
          ).length,
          goldensAprovados: goldens.filter(
            (g) => g.tipoAnaliseId === tipo && g.status === 'aprovado' && g.ativo,
          ).length,
          goldensInjetados: porTipo.reduce(
            (acc, s) => acc + (s.goldenCaseIdsInjetados?.length ?? 0),
            0,
          ),
          documentChunksInjetados: porTipo.reduce(
            (acc, s) =>
              acc + (s.analiseTelemetry?.documentRag?.chunks ?? s.documentRagChunkIds?.length ?? 0),
            0,
          ),
          documentRagPdfsPulados: porTipo.reduce(
            (acc, s) => acc + (s.analiseTelemetry?.documentRag?.pdfsSkipped ?? 0),
            0,
          ),
          falhas: falhas.length,
          falhasLimite: falhaCodigo('rate_limit_or_tokens'),
          falhasTimeout: falhaCodigo('context_window'),
          duracaoMediaMs: avg((s) => s.analiseTelemetry?.durationMs),
          tokensMedios: avg((s) => s.analiseTelemetry?.tokensUsed),
          lotesMedios: avg((s) => s.analiseTelemetry?.batchCount),
          normasCustomPdf: porTipo.reduce(
            (acc, s) => acc + (s.analiseTelemetry?.normasCustomPdfIds?.length ?? 0),
            0,
          ),
          assertividadeComScore: comScore.length,
          assertividadeMedia,
          criticosOkPct,
          evidenciaComScore: comEvidencia.length,
          evidenciaCompletaMedia,
          itensFrageis: comEvidencia.reduce(
            (acc, s) => acc + (s.evidenceVerification?.itensFrageis.length ?? 0),
            0,
          ),
          complementosHumanos: porTipo.filter((s) => Boolean(s.complementosChecklist?.trim()))
            .length,
        }
      })
  }, [feedbacks, goldens, solicitacoes])

  const totalAnalises = metricas.reduce((acc, row) => acc + row.analises, 0)
  const totalReanalises = metricas.reduce((acc, row) => acc + row.reanalises, 0)
  const totalFalhas = metricas.reduce((acc, row) => acc + row.falhas, 0)
  const totalGoldens = metricas.reduce((acc, row) => acc + row.goldensInjetados, 0)
  const totalDocumentChunks = metricas.reduce(
    (acc, row) => acc + row.documentChunksInjetados,
    0,
  )
  const totalDocumentRagPdfsPulados = metricas.reduce(
    (acc, row) => acc + row.documentRagPdfsPulados,
    0,
  )
  const duracaoMedia =
    metricas.length > 0
      ? metricas.reduce((acc, row) => acc + row.duracaoMediaMs, 0) / metricas.length
      : 0
  const falhasCriticas = metricas.reduce(
    (acc, row) => acc + row.falhasLimite + row.falhasTimeout,
    0,
  )

  const scoredAll = solicitacoes.filter((s) => s.assertividadeScore)
  const assertividadeGlobal = scoredAll.length
    ? scoredAll.reduce((acc, s) => acc + (s.assertividadeScore?.percentual ?? 0), 0) /
      scoredAll.length
    : 0
  const criticosOkGlobal = scoredAll.length
    ? (scoredAll.filter((s) => s.assertividadeScore?.passouCriticos).length / scoredAll.length) *
      100
    : 0
  const evidenceAll = solicitacoes.filter((s) => s.evidenceVerification)
  const evidenciaCompletaGlobal = evidenceAll.length
    ? (evidenceAll.reduce(
        (acc, s) => acc + (s.evidenceVerification?.percentualComEvidenciaCompleta ?? 0),
        0,
      ) /
        evidenceAll.length) *
      100
    : 0
  const itensFrageisGlobal = evidenceAll.reduce(
    (acc, s) => acc + (s.evidenceVerification?.itensFrageis.length ?? 0),
    0,
  )
  const complementosHumanosGlobal = solicitacoes.filter((s) =>
    Boolean(s.complementosChecklist?.trim()),
  ).length

  if (loading) {
    return (
      <div className="metricas-ia">
        <div className="metricas-ia-loading">Carregando métricas...</div>
      </div>
    )
  }

  return (
    <div className="metricas-ia">
      <header className="metricas-ia-header">
        <div>
          <h1>Métricas IA</h1>
          <p>Assertividade, aprendizado injetado, falhas e custo operacional por tipo.</p>
        </div>
        <button type="button" className="metricas-ia-btn" onClick={() => downloadCsv(metricas)}>
          <Download size={16} />
          Exportar CSV
        </button>
      </header>

      {error && (
        <div className="metricas-ia-error">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      <section className="metricas-ia-cards">
        <div className="metricas-ia-card">
          <FileText size={20} />
          <span>{totalAnalises}</span>
          <p>Análises IA</p>
        </div>
        <div className="metricas-ia-card">
          <RefreshCw size={20} />
          <span>{totalReanalises}</span>
          <p>Reanálises</p>
        </div>
        <div className="metricas-ia-card accent">
          <Percent size={20} />
          <span>{formatPct(assertividadeGlobal, scoredAll.length > 0)}</span>
          <p>Score interno medio</p>
        </div>
        <div className="metricas-ia-card accent">
          <Target size={20} />
          <span>{formatPct(criticosOkGlobal, scoredAll.length > 0)}</span>
          <p>Criticos OK internos</p>
        </div>
        <div className="metricas-ia-card">
          <ShieldCheck size={20} />
          <span>
            {scoredAll.length}/{totalAnalises || 0}
          </span>
          <p>Com score eval</p>
        </div>
        <div className="metricas-ia-card">
          <Brain size={20} />
          <span>{totalGoldens}</span>
          <p>Goldens usados</p>
        </div>
        <div className="metricas-ia-card">
          <FileText size={20} />
          <span>{totalDocumentChunks}</span>
          <p>Chunks RAG</p>
        </div>
        <div className="metricas-ia-card">
          <FileWarning size={20} />
          <span>{totalDocumentRagPdfsPulados}</span>
          <p>PDFs fora do RAG auxiliar</p>
        </div>
        <div className="metricas-ia-card">
          <ShieldCheck size={20} />
          <span>{formatPct(evidenciaCompletaGlobal, evidenceAll.length > 0)}</span>
          <p>Campos de evidencia</p>
        </div>
        <div className="metricas-ia-card">
          <AlertTriangle size={20} />
          <span>{itensFrageisGlobal}</span>
          <p>Itens frágeis</p>
        </div>
        <div className="metricas-ia-card">
          <AlertTriangle size={20} />
          <span>{complementosHumanosGlobal}</span>
          <p>Proxy revisao humana</p>
        </div>
        <div className="metricas-ia-card">
          <AlertTriangle size={20} />
          <span>{totalFalhas}</span>
          <p>Falhas</p>
        </div>
        <div className="metricas-ia-card">
          <ShieldCheck size={20} />
          <span>{falhasCriticas}</span>
          <p>429/contexto</p>
        </div>
        <div className="metricas-ia-card">
          <Clock3 size={20} />
          <span>{formatMs(duracaoMedia)}</span>
          <p>Duração média</p>
        </div>
      </section>

      <section className="metricas-ia-table-wrap">
        <div className="metricas-ia-section-head">
          <h2>
            <BarChart3 size={18} />
            Por tipo de análise
          </h2>
        </div>
        <div className="metricas-ia-table-scroll">
          <table className="metricas-ia-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Análises</th>
                <th>Reanálises</th>
                <th>Feedbacks</th>
                <th>Goldens aprov.</th>
                <th>Goldens usados</th>
                <th>Chunks RAG</th>
                <th>PDFs fora RAG</th>
                <th>Score n</th>
                <th>Compl. humanos</th>
                <th>Evid. completa</th>
                <th>Itens frÃ¡geis</th>
                <th>Assert. média</th>
                <th>Críticos OK</th>
                <th>Falhas</th>
                <th>Duração</th>
                <th>Tokens</th>
                <th>Lotes</th>
                <th>Normas custom PDF</th>
              </tr>
            </thead>
            <tbody>
              {metricas.map((row) => (
                <tr key={row.tipo}>
                  <td>{row.tipo}</td>
                  <td>{row.analises}</td>
                  <td>{row.reanalises}</td>
                  <td>{row.feedbacksAprovados}</td>
                  <td>{row.goldensAprovados}</td>
                  <td>{row.goldensInjetados}</td>
                  <td>{row.documentChunksInjetados || '-'}</td>
                  <td>{row.documentRagPdfsPulados || '-'}</td>
                  <td>{row.assertividadeComScore || '-'}</td>
                  <td>{row.complementosHumanos || '-'}</td>
                  <td>{formatPct(row.evidenciaCompletaMedia, row.evidenciaComScore > 0)}</td>
                  <td className={row.itensFrageis > 0 ? 'metricas-ia-danger' : undefined}>
                    {row.itensFrageis}
                  </td>
                  <td>{formatPct(row.assertividadeMedia, row.assertividadeComScore > 0)}</td>
                  <td
                    className={
                      row.assertividadeComScore > 0 && row.criticosOkPct < 100
                        ? 'metricas-ia-danger'
                        : undefined
                    }
                  >
                    {formatPct(row.criticosOkPct, row.assertividadeComScore > 0)}
                  </td>
                  <td className={row.falhas > 0 ? 'metricas-ia-danger' : undefined}>
                    {row.falhas}
                  </td>
                  <td>{formatMs(row.duracaoMediaMs)}</td>
                  <td>{formatNumber(Math.round(row.tokensMedios))}</td>
                  <td>{row.lotesMedios ? row.lotesMedios.toFixed(1) : '-'}</td>
                  <td>{row.normasCustomPdf}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

