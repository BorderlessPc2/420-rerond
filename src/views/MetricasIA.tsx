import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  Brain,
  Clock3,
  Download,
  FileText,
  RefreshCw,
  ShieldCheck,
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
  falhas: number
  falhasLimite: number
  falhasTimeout: number
  duracaoMediaMs: number
  tokensMedios: number
  lotesMedios: number
  normasCustomPdf: number
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

const downloadCsv = (rows: TipoMetricas[]) => {
  const header = [
    'tipo',
    'analises',
    'reanalises',
    'feedbacks_aprovados',
    'goldens_aprovados',
    'goldens_injetados',
    'falhas',
    'falhas_429_timeout',
    'duracao_media_ms',
    'tokens_medios',
    'lotes_medios',
    'normas_custom_pdf',
  ]
  const lines = rows.map((row) =>
    [
      row.tipo,
      row.analises,
      row.reanalises,
      row.feedbacksAprovados,
      row.goldensAprovados,
      row.goldensInjetados,
      row.falhas,
      row.falhasLimite + row.falhasTimeout,
      Math.round(row.duracaoMediaMs),
      Math.round(row.tokensMedios),
      Math.round(row.lotesMedios * 10) / 10,
      row.normasCustomPdf,
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
        const sum = (selector: (s: SolicitacaoWithFiles) => number | undefined | null) =>
          comTelemetry.reduce((acc, s) => acc + (selector(s) ?? 0), 0)
        const avg = (selector: (s: SolicitacaoWithFiles) => number | undefined | null) =>
          comTelemetry.length ? sum(selector) / comTelemetry.length : 0
        const falhas = porTipo.filter((s) => s.analiseJobStatus === 'failed' || s.analiseErroCodigo)
        const falhaCodigo = (code: string) =>
          falhas.filter((s) => (s.analiseErroCodigo || s.analiseTelemetry?.errorCode) === code)
            .length

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
        }
      })
  }, [feedbacks, goldens, solicitacoes])

  const totalAnalises = metricas.reduce((acc, row) => acc + row.analises, 0)
  const totalReanalises = metricas.reduce((acc, row) => acc + row.reanalises, 0)
  const totalFalhas = metricas.reduce((acc, row) => acc + row.falhas, 0)
  const totalGoldens = metricas.reduce((acc, row) => acc + row.goldensInjetados, 0)
  const duracaoMedia =
    metricas.length > 0
      ? metricas.reduce((acc, row) => acc + row.duracaoMediaMs, 0) / metricas.length
      : 0
  const falhasCriticas = metricas.reduce(
    (acc, row) => acc + row.falhasLimite + row.falhasTimeout,
    0,
  )

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
        <div className="metricas-ia-card">
          <Brain size={20} />
          <span>{totalGoldens}</span>
          <p>Goldens usados</p>
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
