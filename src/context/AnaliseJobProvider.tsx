import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import AnaliseProgressOverlay from '../components/AnaliseProgressOverlay'
import { getAllSolicitacoes, getSolicitacaoById } from '../services/solicitacao/solicitacaoService'
import { subscribeAnaliseJob } from '../services/solicitacao/analiseJobService'
import { humanizeAnaliseErrorMessage } from '../utils/analiseErrorMessage'
import { isActiveJobState, type AnaliseJob } from '../models/AnaliseJob'

type SolicitacaoOverlayMeta = {
  titulo?: string
  nomeConcessionaria?: string | null
  concessionariaId?: string | null
  analiseJobStatus?: AnaliseJob['state'] | null
  analiseJobProgress?: number | null
  analiseRetryBlockedUntil?: Date | null
}

type AnaliseJobContextValue = {
  analisandoId: string | null
  activeJobId: string | null
  overlayActive: boolean
  activeJob: AnaliseJob | null
  jobError: string | null
  retryCooldownSeconds: number
  isTracking: (solicitacaoId: string) => boolean
  beginJob: (
    solicitacaoId: string,
    jobId: string,
    meta: SolicitacaoOverlayMeta,
    initialJob?: AnaliseJob,
  ) => void
  attachActiveJob: (solicitacao: SolicitacaoOverlayMeta & { id?: string; activeAnaliseJobId?: string | null }) => void
  dismissOverlay: () => void
  clearJobError: () => void
  setRetryCooldownUntil: (until: number | null) => void
  registerOnJobCompleted: (handler: (solicitacaoId: string) => void | Promise<void>) => () => void
  registerOnJobUpdate: (handler: (solicitacaoId: string, job: AnaliseJob) => void) => () => void
}

const AnaliseJobContext = createContext<AnaliseJobContextValue | null>(null)

const OVERLAY_UI_STORAGE_KEY = 'rerond-analise-overlay-ui'

type OverlayUiPrefs = {
  oculto: boolean
  minimizado: boolean
  chipIndicadorOculto: boolean
}

function overlayUiStorageKey(solicitacaoId: string, jobId: string) {
  return `${solicitacaoId}:${jobId}`
}

function readOverlayUiPrefs(solicitacaoId: string, jobId: string): OverlayUiPrefs | null {
  try {
    const raw = sessionStorage.getItem(OVERLAY_UI_STORAGE_KEY)
    if (!raw) return null
    const all = JSON.parse(raw) as Record<string, OverlayUiPrefs>
    return all[overlayUiStorageKey(solicitacaoId, jobId)] ?? null
  } catch {
    return null
  }
}

function writeOverlayUiPrefs(solicitacaoId: string, jobId: string, prefs: OverlayUiPrefs) {
  try {
    const raw = sessionStorage.getItem(OVERLAY_UI_STORAGE_KEY)
    const all: Record<string, OverlayUiPrefs> = raw ? JSON.parse(raw) : {}
    all[overlayUiStorageKey(solicitacaoId, jobId)] = prefs
    sessionStorage.setItem(OVERLAY_UI_STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* sessionStorage indisponível */
  }
}

function clearOverlayUiPrefs(solicitacaoId: string, jobId: string) {
  try {
    const raw = sessionStorage.getItem(OVERLAY_UI_STORAGE_KEY)
    if (!raw) return
    const all = JSON.parse(raw) as Record<string, OverlayUiPrefs>
    delete all[overlayUiStorageKey(solicitacaoId, jobId)]
    sessionStorage.setItem(OVERLAY_UI_STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* sessionStorage indisponível */
  }
}

function applyOverlayUiPrefs(
  prefs: OverlayUiPrefs,
  setters: {
    setOverlayOculto: (v: boolean) => void
    setOverlayMinimizado: (v: boolean) => void
    setChipIndicadorOculto: (v: boolean) => void
  },
) {
  setters.setOverlayOculto(prefs.oculto)
  setters.setOverlayMinimizado(prefs.minimizado)
  setters.setChipIndicadorOculto(prefs.chipIndicadorOculto)
}

export function useAnaliseJob() {
  const ctx = useContext(AnaliseJobContext)
  if (!ctx) throw new Error('useAnaliseJob deve ser usado dentro de AnaliseJobProvider')
  return ctx
}

export default function AnaliseJobProvider() {
  const navigate = useNavigate()
  const [analisandoId, setAnalisandoId] = useState<string | null>(null)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [activeJob, setActiveJob] = useState<AnaliseJob | null>(null)
  const [jobError, setJobError] = useState<string | null>(null)
  const [meta, setMeta] = useState<SolicitacaoOverlayMeta>({})
  const [retryCooldownUntil, setRetryCooldownUntil] = useState<number | null>(null)
  const [retryCooldownSeconds, setRetryCooldownSeconds] = useState(0)
  const [overlayOculto, setOverlayOculto] = useState(false)
  const [overlayMinimizado, setOverlayMinimizado] = useState(false)
  const [chipIndicadorOculto, setChipIndicadorOculto] = useState(false)
  const trackingRef = useRef<{ solicitacaoId: string | null; jobId: string | null }>({
    solicitacaoId: null,
    jobId: null,
  })
  const onJobCompletedRef = useRef<((solicitacaoId: string) => void | Promise<void>) | null>(null)
  const onJobUpdateRef = useRef<((solicitacaoId: string, job: AnaliseJob) => void) | null>(null)
  const syncedOnMountRef = useRef(false)

  const dismissOverlay = useCallback(() => {
    const { solicitacaoId, jobId } = trackingRef.current
    if (solicitacaoId && jobId) clearOverlayUiPrefs(solicitacaoId, jobId)
    setAnalisandoId(null)
    setActiveJobId(null)
    setActiveJob(null)
    setJobError(null)
    setOverlayOculto(false)
    setOverlayMinimizado(false)
    setChipIndicadorOculto(false)
    trackingRef.current = { solicitacaoId: null, jobId: null }
  }, [])

  const beginJob = useCallback((
    solicitacaoId: string,
    jobId: string,
    nextMeta: SolicitacaoOverlayMeta,
    initialJob?: AnaliseJob,
  ) => {
    setJobError(null)
    setMeta(nextMeta)
    setOverlayOculto(false)
    setOverlayMinimizado(false)
    setChipIndicadorOculto(false)
    writeOverlayUiPrefs(solicitacaoId, jobId, {
      oculto: false,
      minimizado: false,
      chipIndicadorOculto: false,
    })
    trackingRef.current = { solicitacaoId, jobId }
    setAnalisandoId(solicitacaoId)
    setActiveJobId(jobId)
    setActiveJob(initialJob ?? {
      id: jobId,
      solicitacaoId,
      state: 'queued',
      progress: nextMeta.analiseJobProgress ?? 12,
    })
  }, [])

  const attachActiveJob = useCallback((solicitacao: SolicitacaoOverlayMeta & { id?: string; activeAnaliseJobId?: string | null }) => {
    if (!solicitacao.id || !solicitacao.activeAnaliseJobId) return
    if (!isActiveJobState(solicitacao.analiseJobStatus)) return

    const solicitacaoId = solicitacao.id
    const jobId = solicitacao.activeAnaliseJobId
    const jaRastreando =
      (trackingRef.current.solicitacaoId === solicitacaoId && trackingRef.current.jobId === jobId)
      || (analisandoId === solicitacaoId && activeJobId === jobId)

    setMeta({
      titulo: solicitacao.titulo,
      nomeConcessionaria: solicitacao.nomeConcessionaria,
      concessionariaId: solicitacao.concessionariaId,
      analiseJobStatus: solicitacao.analiseJobStatus,
      analiseJobProgress: solicitacao.analiseJobProgress,
      analiseRetryBlockedUntil: solicitacao.analiseRetryBlockedUntil ?? null,
    })

    if (jaRastreando) {
      const saved = readOverlayUiPrefs(solicitacaoId, jobId)
      if (saved) {
        applyOverlayUiPrefs(saved, {
          setOverlayOculto,
          setOverlayMinimizado,
          setChipIndicadorOculto,
        })
      }
      trackingRef.current = { solicitacaoId, jobId }
      return
    }

    const saved = readOverlayUiPrefs(solicitacaoId, jobId)
    if (saved) {
      applyOverlayUiPrefs(saved, {
        setOverlayOculto,
        setOverlayMinimizado,
        setChipIndicadorOculto,
      })
    } else {
      setOverlayOculto(false)
      setOverlayMinimizado(false)
      setChipIndicadorOculto(false)
    }

    trackingRef.current = { solicitacaoId, jobId }
    setAnalisandoId(solicitacaoId)
    setActiveJobId(jobId)
    setJobError(null)
  }, [analisandoId, activeJobId])

  const registerOnJobCompleted = useCallback((handler: (solicitacaoId: string) => void | Promise<void>) => {
    onJobCompletedRef.current = handler
    return () => {
      if (onJobCompletedRef.current === handler) onJobCompletedRef.current = null
    }
  }, [])

  const registerOnJobUpdate = useCallback((handler: (solicitacaoId: string, job: AnaliseJob) => void) => {
    onJobUpdateRef.current = handler
    return () => {
      if (onJobUpdateRef.current === handler) onJobUpdateRef.current = null
    }
  }, [])

  useEffect(() => {
    if (syncedOnMountRef.current) return
    syncedOnMountRef.current = true
    void getAllSolicitacoes()
      .then((data) => {
        const emProcessamento = data.find(
          (item) => item.id && item.activeAnaliseJobId && isActiveJobState(item.analiseJobStatus),
        )
        if (emProcessamento?.id && emProcessamento.activeAnaliseJobId) {
          attachActiveJob(emProcessamento)
        }
      })
      .catch((error) => {
        console.error('Erro ao sincronizar análise ativa:', error)
      })
  }, [attachActiveJob])

  useEffect(() => {
    if (!analisandoId || !activeJobId) return

    const unsubscribe = subscribeAnaliseJob(
      analisandoId,
      activeJobId,
      async (job) => {
        setActiveJob(job)
        onJobUpdateRef.current?.(analisandoId, job)
        setMeta((prev) => ({
          ...prev,
          analiseJobStatus: job.state,
          analiseJobProgress: job.progress,
          analiseRetryBlockedUntil: job.retryBlockedUntil ?? prev.analiseRetryBlockedUntil ?? null,
        }))
        setJobError(
          job.state === 'failed' || job.state === 'blocked' || job.state === 'stale'
            ? humanizeAnaliseErrorMessage(job.error?.message ?? 'Falha na análise.')
            : null,
        )
        if (job.state === 'failed' || job.state === 'blocked' || job.state === 'stale') {
          setOverlayOculto(false)
          setOverlayMinimizado(false)
          setChipIndicadorOculto(false)
        }

        if (job.state === 'completed') {
          const id = analisandoId
          try {
            if (onJobCompletedRef.current) await onJobCompletedRef.current(id)
            else await getSolicitacaoById(id)
          } catch (error) {
            console.error('Erro ao finalizar análise:', error)
          }
          dismissOverlay()
        }
      },
      (error) => {
        setJobError(humanizeAnaliseErrorMessage(error.message))
        setActiveJob((prev) => (prev ? { ...prev, state: 'failed', progress: 0 } : prev))
      },
    )

    return unsubscribe
  }, [analisandoId, activeJobId, dismissOverlay])

  useEffect(() => {
    if (!retryCooldownUntil) {
      setRetryCooldownSeconds(0)
      return
    }
    const update = () => {
      const seconds = Math.max(0, Math.ceil((retryCooldownUntil - Date.now()) / 1000))
      setRetryCooldownSeconds(seconds)
      if (seconds === 0) setRetryCooldownUntil(null)
    }
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [retryCooldownUntil])

  useEffect(() => {
    const solicitacaoId = trackingRef.current.solicitacaoId
    const jobId = trackingRef.current.jobId
    if (!solicitacaoId || !jobId) return
    writeOverlayUiPrefs(solicitacaoId, jobId, {
      oculto: overlayOculto,
      minimizado: overlayMinimizado,
      chipIndicadorOculto,
    })
  }, [overlayOculto, overlayMinimizado, chipIndicadorOculto])

  const overlayActive = Boolean(analisandoId && activeJobId)
  const jobState = activeJob?.state ?? meta.analiseJobStatus ?? null
  const isFailed =
    jobState === 'failed' || jobState === 'blocked' || jobState === 'stale'

  const retryFailedAnalysis = () => {
    if (!analisandoId) return
    const blockedUntil =
      activeJob?.retryBlockedUntil?.getTime()
      ?? meta.analiseRetryBlockedUntil?.getTime()
      ?? 0
    if (blockedUntil > Date.now()) {
      setRetryCooldownUntil(blockedUntil)
      return
    }
    const id = analisandoId
    dismissOverlay()
    navigate('/solicitacoes', { state: { abrirAnaliseId: id } })
  }

  const value: AnaliseJobContextValue = {
    analisandoId,
    activeJobId,
    overlayActive,
    activeJob,
    jobError,
    retryCooldownSeconds,
    isTracking: (solicitacaoId) => analisandoId === solicitacaoId,
    beginJob,
    attachActiveJob,
    dismissOverlay,
    clearJobError: () => setJobError(null),
    setRetryCooldownUntil,
    registerOnJobCompleted,
    registerOnJobUpdate,
  }

  return (
    <AnaliseJobContext.Provider value={value}>
      <Outlet />
      <AnaliseProgressOverlay
        active={overlayActive && !(overlayOculto && chipIndicadorOculto)}
        titulo={meta.titulo}
        nomeConcessionaria={meta.nomeConcessionaria}
        concessionariaId={meta.concessionariaId}
        jobState={jobState}
        progress={activeJob?.progress ?? meta.analiseJobProgress ?? null}
        errorMessage={jobError}
        onDismiss={isFailed ? dismissOverlay : undefined}
        onRetry={isFailed ? retryFailedAnalysis : undefined}
        retryCooldownSeconds={retryCooldownSeconds}
        minimized={overlayMinimizado}
        uiHidden={overlayOculto && !chipIndicadorOculto}
        onMinimize={() => {
          setOverlayMinimizado(true)
          setOverlayOculto(false)
        }}
        onExpand={() => setOverlayMinimizado(false)}
        onHide={() => {
          setOverlayOculto(true)
          setOverlayMinimizado(false)
          setChipIndicadorOculto(false)
        }}
        onShow={() => {
          setOverlayOculto(false)
          setOverlayMinimizado(false)
          setChipIndicadorOculto(false)
        }}
        onDismissChip={() => setChipIndicadorOculto(true)}
      />
    </AnaliseJobContext.Provider>
  )
}