import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Square, Check, Loader2, AlertCircle, RotateCcw, Mic,
  AlertTriangle, List, ArrowLeft, ArrowRight, Clock, ChevronRight,
  CheckCircle2, Headphones,
} from 'lucide-react'
import { useRecorder } from '../hooks/use-recorder'
import { useAuth } from '../hooks/use-auth'
import { useWallet } from '../hooks/use-wallet'
import { getRejectionInfo } from '../lib/qc-translations'
import { supabase } from '../lib/supabase'
import { Waveform } from '../components/ui/waveform'
import { SpeakerRecordingDetailModal } from '../components/speaker-recording-detail-modal'
import type { Phrase } from '../types/database'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

type View = 'record' | 'list' | 'done' | 'loading' | 'error'

interface PhraseStatus {
  recorded: boolean
  recordingId: string | null
  qcStatus: 'pending' | 'processing' | 'completed' | 'failed' | null
  isValid: boolean | null
  reasons: string[]
  /** Timestamp de soumission, pour détecter les recordings stuck */
  submittedAt?: number
}


interface SessionData {
  session: { id: string; project_id: string; speaker_name: string | null; status: string }
  phrases: Phrase[]
  recorded_phrase_ids: string[]
  upload_url: string
  project: { name: string; rate_per_hour_fcfa: number; language_label: string | null }
}

export function SpeakerRecordPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { user } = useAuth()
  const { refetch: refetchWallet } = useWallet(user?.id)
  const recorder = useRecorder()
  const navigate = useNavigate()

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

  const [view, setView] = useState<View>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const sessionDataRef = useRef<SessionData | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [phraseStatuses, setPhraseStatuses] = useState<Record<string, PhraseStatus>>({})
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [unseenRejections, setUnseenRejections] = useState(0)
  const [todayEarnings, setTodayEarnings] = useState(0)
  const [detailModal, setDetailModal] = useState<{ phrase: Phrase; recordingId: string } | null>(null)

  const pendingChecks = useRef<{ recordingId: string; phraseId: string }[]>([])
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Chargement session
  useEffect(() => {
    if (!sessionId || !user) return
    const load = async () => {
      try {
        type SessionRow = { id: string; project_id: string; speaker_name: string | null; status: string; speaker_id: string | null }
        type RecordingRow = {
          id: string
          phrase_id: string
          processing_status: string
          is_valid: boolean | null
          rejection_reasons: string[] | null
        }
        type ProjectRow = { name: string; rate_per_hour_fcfa: number; language_label: string | null }

        const { data: session, error: sErr } = await (supabase
          .from('recording_sessions')
          .select('id, project_id, speaker_name, status, speaker_id')
          .eq('id', sessionId)
          .eq('speaker_id', user.id)
          .single() as unknown as Promise<{ data: SessionRow | null; error: unknown }>)

        if (sErr || !session) throw new Error('Session introuvable ou expirée')

        const [{ data: phrases }, { data: recordings }, { data: project }] = await Promise.all([
          supabase.from('phrases').select('*').eq('project_id', session.project_id).order('position'),
          supabase.from('recordings')
            .select('id, phrase_id, processing_status, is_valid, rejection_reasons')
            .eq('session_id', sessionId) as unknown as Promise<{ data: RecordingRow[] | null; error: unknown }>,
          supabase.from('projects').select('name, rate_per_hour_fcfa, language_label').eq('id', session.project_id).single() as unknown as Promise<{ data: ProjectRow | null; error: unknown }>,
        ])

        const uploadUrl = `${supabaseUrl}/storage/v1/upload/resumable`
        const data: SessionData = {
          session: { id: session.id, project_id: session.project_id, speaker_name: session.speaker_name, status: session.status },
          phrases: phrases ?? [],
          recorded_phrase_ids: (recordings ?? []).map((r: RecordingRow) => r.phrase_id),
          upload_url: uploadUrl,
          project: project ?? { name: 'Projet', rate_per_hour_fcfa: 0, language_label: null },
        }
        sessionDataRef.current = data
        setSessionData(data)

        // Index des recordings par phrase_id pour récupérer ID + statut QC déjà connu
        const recByPhrase = new Map<string, RecordingRow>()
        for (const r of recordings ?? []) recByPhrase.set(r.phrase_id, r)

        const statuses: Record<string, PhraseStatus> = {}
        for (const phrase of data.phrases) {
          const existing = recByPhrase.get(phrase.id)
          statuses[phrase.id] = existing
            ? {
                recorded: true,
                recordingId: existing.id,
                qcStatus: existing.processing_status as PhraseStatus['qcStatus'],
                isValid: existing.is_valid,
                reasons: existing.rejection_reasons ?? [],
              }
            : { recorded: false, recordingId: null, qcStatus: null, isValid: null, reasons: [] }
        }
        setPhraseStatuses(statuses)

        const firstUnrecorded = data.phrases.findIndex((p) => !data.recorded_phrase_ids.includes(p.id))
        setCurrentIndex(firstUnrecorded >= 0 ? firstUnrecorded : 0)
        setView('record')
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Erreur de chargement')
        setView('error')
      }
    }
    load()
  }, [sessionId, user, supabaseUrl])

  // Polling QC
  useEffect(() => {
    interface QcRow {
      processing_status: string
      is_valid: boolean | null
      rejection_reasons: string[] | null
      duration_seconds: number | null
    }

    const poll = async () => {
      if (pendingChecks.current.length === 0) return
      const stillPending: typeof pendingChecks.current = []
      for (const check of pendingChecks.current) {
        try {
          const { data: rec } = await (supabase
            .from('recordings')
            .select('processing_status, is_valid, rejection_reasons, duration_seconds')
            .eq('id', check.recordingId)
            .single() as unknown as Promise<{ data: QcRow | null; error: unknown }>)
          if (!rec) { stillPending.push(check); continue }

          if (rec.processing_status === 'completed' || rec.processing_status === 'failed') {
            setPhraseStatuses((prev) => ({
              ...prev,
              [check.phraseId]: {
                ...prev[check.phraseId],
                qcStatus: rec.processing_status as PhraseStatus['qcStatus'],
                isValid: rec.is_valid ?? null,
                reasons: rec.rejection_reasons ?? [],
              } as PhraseStatus,
            }))
            if (rec.is_valid === false || rec.processing_status === 'failed') {
              setUnseenRejections((n) => n + 1)
            }
            if (rec.is_valid === true && rec.duration_seconds && sessionData?.project.rate_per_hour_fcfa) {
              const earned = Math.round((rec.duration_seconds / 3600) * sessionData.project.rate_per_hour_fcfa)
              setTodayEarnings((n) => n + earned)
              refetchWallet()
            }
          } else {
            stillPending.push(check)
          }
        } catch { stillPending.push(check) }
      }
      pendingChecks.current = stillPending
    }
    pollIntervalRef.current = setInterval(poll, 3000)
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current) }
  }, [sessionData, refetchWallet])

  const phrases = useMemo(() => sessionData?.phrases ?? [], [sessionData])
  const totalPhrases = phrases.length
  const totalRecorded = useMemo(
    () => Object.values(phraseStatuses).filter((s) => s.recorded).length,
    [phraseStatuses],
  )
  const rejectedPhrases = useMemo(
    () => phrases.filter((p) => phraseStatuses[p.id]?.isValid === false),
    [phrases, phraseStatuses],
  )
  const currentPhrase = phrases[currentIndex] ?? null
  const currentStatus = currentPhrase ? phraseStatuses[currentPhrase.id] : null
  const isRecording = recorder.state === 'recording'
  const progressPct = totalPhrases > 0 ? (totalRecorded / totalPhrases) * 100 : 0

  const goTo = useCallback((index: number) => {
    if (index >= 0 && index < phrases.length) {
      setCurrentIndex(index); setView('record'); setUploadError('')
    }
  }, [phrases.length])

  const handleStart = useCallback(async () => {
    setUploadError('')
    await recorder.start()
  }, [recorder])

  const handleStop = useCallback(async () => {
    if (!currentPhrase || !sessionData) return
    const blob = await recorder.stop()
    if (!blob) return

    setIsUploading(true); setUploadProgress(0); setUploadError('')

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession) throw new Error('Session expirée')

      const storagePath = `${sessionData.session.project_id}/${sessionData.session.id}/${currentPhrase.id}.webm`
      const tus = await import('tus-js-client')
      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(blob, {
          endpoint: sessionData.upload_url,
          retryDelays: [0, 1000, 3000, 5000],
          chunkSize: 6 * 1024 * 1024,
          headers: {
            authorization: `Bearer ${authSession.access_token}`,
            apikey: supabaseAnonKey,
            'x-upsert': 'true',
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: 'audio-raw',
            objectName: storagePath,
            contentType: 'audio/webm',
            cacheControl: '3600',
          },
          onError: reject,
          onProgress: (u, t) => setUploadProgress(Math.round((u / t) * 100)),
          onSuccess: () => resolve(),
        })
        upload.start()
      })

      const res = await fetch(`${supabaseUrl}/functions/v1/submit-recording`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authSession.access_token}`,
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({
          session_id: sessionData.session.id,
          phrase_id: currentPhrase.id,
          storage_path: storagePath,
        }),
      })
      const json = await res.json() as { data?: { recording_id: string }; error?: string }
      if (!res.ok || json.error) throw new Error(json.error ?? 'Erreur lors de la soumission')

      const recordingId = json.data?.recording_id
      setPhraseStatuses((prev) => ({
        ...prev,
        [currentPhrase.id]: {
          ...prev[currentPhrase.id], recorded: true, recordingId: recordingId ?? null,
          qcStatus: 'pending', isValid: null, reasons: [], submittedAt: Date.now(),
        },
      }))
      if (recordingId) {
        pendingChecks.current = [
          ...pendingChecks.current.filter((c) => c.phraseId !== currentPhrase.id),
          { recordingId, phraseId: currentPhrase.id },
        ]
      }

      const newTotalRecorded = totalRecorded + 1
      if (newTotalRecorded >= totalPhrases) { setView('done'); return }

      const nextIdx = phrases.findIndex((p, i) => i > currentIndex && !phraseStatuses[p.id]?.recorded && p.id !== currentPhrase.id)
      setCurrentIndex(nextIdx >= 0 ? nextIdx : currentIndex + 1 < totalPhrases ? currentIndex + 1 : currentIndex)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erreur d'envoi")
    } finally {
      setIsUploading(false)
    }
  }, [currentPhrase, sessionData, recorder, supabaseUrl, supabaseAnonKey, phrases, currentIndex, totalRecorded, totalPhrases, phraseStatuses])

  useEffect(() => {
    if (view !== 'record') return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault(); isRecording ? handleStop() : (!isUploading && handleStart())
      } else if (e.code === 'ArrowRight' && !isRecording && !isUploading) goTo(currentIndex + 1)
      else if (e.code === 'ArrowLeft' && !isRecording && !isUploading) goTo(currentIndex - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view, isRecording, isUploading, currentIndex, handleStart, handleStop, goTo])

  // Tick toutes les 5s pour réévaluer si un recording est "stuck" (> 30s en pending)
  const [, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(t)
  }, [])

  const handleRetryRecording = useCallback(async () => {
    if (!currentPhrase) return
    const status = phraseStatuses[currentPhrase.id]
    if (!status?.recordingId) return
    setUploadError('')
    try {
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string, args: Record<string, unknown>,
      ) => Promise<{ data: { success?: boolean; error?: string } | null; error: { message: string } | null }>)(
        'retry_recording', { p_recording_id: status.recordingId },
      )
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      setPhraseStatuses((prev) => ({
        ...prev,
        [currentPhrase.id]: { ...prev[currentPhrase.id]!, submittedAt: Date.now() },
      }))
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erreur lors du retry')
    }
  }, [currentPhrase, phraseStatuses])

  const handleDeleteRecording = useCallback(async () => {
    if (!currentPhrase) return
    const status = phraseStatuses[currentPhrase.id]
    if (!status?.recordingId) return
    if (!confirm('Supprimer cet enregistrement ? Tu pourras le refaire ensuite.')) return
    setUploadError('')
    try {
      const { data, error } = await (supabase.rpc as unknown as (
        fn: string, args: Record<string, unknown>,
      ) => Promise<{ data: { success?: boolean; error?: string } | null; error: { message: string } | null }>)(
        'delete_recording', { p_recording_id: status.recordingId },
      )
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      setPhraseStatuses((prev) => ({
        ...prev,
        [currentPhrase.id]: {
          recorded: false, recordingId: null, qcStatus: null, isValid: null, reasons: [],
        },
      }))
      pendingChecks.current = pendingChecks.current.filter((c) => c.phraseId !== currentPhrase.id)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    }
  }, [currentPhrase, phraseStatuses])

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  /* ---------- LOADING ---------- */
  if (view === 'loading') {
    return (
      <div className="h-dvh flex flex-col items-center justify-center bg-[var(--t-bg)] gap-4">
        <div
          className="w-12 h-12 rounded-md flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, var(--t-border), var(--t-surface))',
            border: '1px solid var(--t-border)',
          }}
        >
          <Mic className="w-5 h-5 text-[var(--t-fg-2)]" strokeWidth={1.75} />
        </div>
        <p className="text-[13px] text-[var(--t-fg-3)]" style={sans}>
          Chargement de la session…
        </p>
        <Loader2 className="w-4 h-4 animate-spin text-[var(--t-fg-4)]" />
      </div>
    )
  }

  /* ---------- ERROR ---------- */
  if (view === 'error') {
    return (
      <div className="h-dvh flex flex-col items-center justify-center bg-[var(--t-bg)] px-6">
        <div
          className="w-12 h-12 rounded-md flex items-center justify-center mb-5"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.22)',
          }}
        >
          <AlertCircle className="w-5 h-5 text-[#fca5a5]" strokeWidth={1.75} />
        </div>
        <h1 className="text-[18px] text-[var(--t-fg)] mb-2" style={{ ...sans, fontWeight: 590 }}>
          Session inaccessible
        </h1>
        <p className="text-[13px] text-[var(--t-fg-3)] text-center max-w-[28rem] leading-relaxed mb-5" style={sans}>
          {errorMessage}
        </p>
        <button
          onClick={() => navigate('/speaker/dashboard')}
          className="inline-flex items-center gap-1.5 h-[32px] px-3.5 text-[13px] rounded-md text-[var(--t-fg-2)] hover:bg-[var(--t-surface-2)] transition-colors"
          style={{ ...sans, fontWeight: 510 }}
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
          Retour au dashboard
        </button>
      </div>
    )
  }

  /* ---------- DONE ---------- */
  if (view === 'done') {
    return (
      <div className="h-dvh flex flex-col items-center justify-center bg-[var(--t-bg)] px-6 overflow-y-auto">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
          style={{
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.22)',
          }}
        >
          <CheckCircle2 className="w-7 h-7 text-[#10b981]" strokeWidth={1.75} />
        </div>
        <h1
          className="text-[28px] text-[var(--t-fg)] m-0 text-center"
          style={{ ...sans, fontWeight: 510, letterSpacing: '-0.5px' }}
        >
          Session terminée
        </h1>
        <p className="text-[14px] text-[var(--t-fg-3)] mt-2 text-center" style={sans}>
          <span className="text-[var(--t-fg)]" style={{ fontWeight: 510 }}>{totalPhrases} phrases</span> enregistrées.
        </p>

        {todayEarnings > 0 && (
          <div
            className="mt-5 inline-flex items-center gap-1.5 px-3 h-[28px] rounded-full text-[12px]"
            style={{
              ...sans,
              fontWeight: 510,
              color: '#10b981',
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.22)',
            }}
          >
            +{new Intl.NumberFormat('fr-SN').format(todayEarnings)} FCFA gagnés
          </div>
        )}

        {rejectedPhrases.length > 0 && (
          <div
            className="mt-6 w-full max-w-[420px] rounded-[10px] overflow-hidden"
            style={{
              background: 'rgba(245,158,11,0.04)',
              border: '1px solid rgba(245,158,11,0.18)',
            }}
          >
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-[rgba(245,158,11,0.15)]">
              <AlertTriangle className="w-3.5 h-3.5 text-[#fbbf24]" strokeWidth={1.75} />
              <span className="text-[12px] text-[#fbbf24]" style={{ ...sans, fontWeight: 510 }}>
                {rejectedPhrases.length} phrase{rejectedPhrases.length > 1 ? 's' : ''} à corriger
              </span>
            </div>
            {rejectedPhrases.map((p) => (
              <button
                key={p.id}
                onClick={() => goTo(phrases.findIndex((ph) => ph.id === p.id))}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-[rgba(245,158,11,0.06)] transition-colors"
              >
                <span className="text-[11px] text-[var(--t-fg-4)] w-8 shrink-0" style={mono}>
                  #{p.position}
                </span>
                <span className="text-[12px] text-[var(--t-fg-2)] truncate flex-1" style={sans}>
                  {p.content}
                </span>
                <RotateCcw className="w-3 h-3 text-[var(--t-fg-3)] shrink-0" strokeWidth={1.75} />
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 mt-8">
          <button
            onClick={() => setView('list')}
            className="inline-flex items-center gap-1.5 h-[34px] px-3.5 text-[13px] rounded-md text-[var(--t-fg-2)] transition-colors"
            style={{
              ...sans,
              fontWeight: 510,
              background: 'var(--t-surface)',
              border: '1px solid var(--t-border)',
            }}
          >
            <List className="w-3.5 h-3.5" strokeWidth={1.75} />
            Voir les phrases
          </button>
          <button
            onClick={() => navigate('/speaker/dashboard')}
            className="inline-flex items-center gap-1.5 h-[34px] px-3.5 text-[13px] rounded-md text-[var(--t-fg)] transition-colors"
            style={{ ...sans, fontWeight: 510, background: '#5e6ad2' }}
          >
            Mon dashboard
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    )
  }

  /* ---------- LIST ---------- */
  if (view === 'list') {
    return (
      <div className="h-dvh flex flex-col bg-[var(--t-bg)]">
        <header className="flex items-center gap-3 h-[52px] px-5 border-b border-[var(--t-surface-active)] shrink-0">
          <button
            onClick={() => setView(totalRecorded >= totalPhrases ? 'done' : 'record')}
            className="inline-flex items-center gap-1.5 text-[12px] text-[var(--t-fg-3)] hover:text-[var(--t-fg)] transition-colors"
            style={{ ...sans, fontWeight: 510 }}
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
            Retour
          </button>
          <span className="text-[var(--t-fg-5)]">/</span>
          <span className="text-[13px] text-[var(--t-fg)] truncate flex-1" style={{ ...sans, fontWeight: 510 }}>
            {sessionData?.project.name}
          </span>
          <span className="text-[11px] text-[var(--t-fg-4)] tabular-nums" style={mono}>
            {totalRecorded}/{totalPhrases}
          </span>
        </header>
        <div className="flex-1 overflow-y-auto">
          {phrases.map((phrase, idx) => {
            const status = phraseStatuses[phrase.id]
            const isRejected = status?.isValid === false
            const isValid = status?.isValid === true
            const isPending = status?.recorded && status.qcStatus === 'pending'
            const isCurrent = idx === currentIndex

            let statusIcon: React.ReactNode
            let statusColor = 'var(--t-fg-4)'
            if (isRejected) { statusIcon = <AlertTriangle className="w-3 h-3" strokeWidth={2} />; statusColor = '#fbbf24' }
            else if (isValid) { statusIcon = <Check className="w-3 h-3" strokeWidth={2.5} />; statusColor = '#10b981' }
            else if (isPending) { statusIcon = <Clock className="w-3 h-3" strokeWidth={2} />; statusColor = 'var(--t-fg-3)' }
            else if (status?.recorded) { statusIcon = <Check className="w-3 h-3" strokeWidth={2} />; statusColor = 'var(--t-fg-3)' }
            else { statusIcon = <span className="w-3 h-3 rounded-full border border-current" />; statusColor = 'var(--t-fg-4)' }

            const recordingId = status?.recordingId ?? null
            return (
              <div
                key={phrase.id}
                className="w-full flex items-center gap-3 px-5 py-3 text-left border-b border-[var(--t-surface-2)] transition-colors"
                style={{ background: isCurrent ? 'rgba(113,112,255,0.06)' : 'transparent' }}
              >
                <button
                  type="button"
                  onClick={() => goTo(idx)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                >
                  <span className="text-[11px] text-[var(--t-fg-4)] w-10 shrink-0 tabular-nums" style={mono}>
                    #{idx + 1}
                  </span>
                  <span style={{ color: statusColor }}>{statusIcon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[var(--t-fg)] truncate" style={sans}>
                      {phrase.content}
                    </p>
                    {isRejected && status?.reasons.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {status.reasons.map((code) => (
                          <span
                            key={code}
                            className="text-[10px] text-[#fbbf24]"
                            style={{ ...sans, fontWeight: 510 }}
                          >
                            {getRejectionInfo(code)?.label ?? code}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
                {recordingId ? (
                  <button
                    type="button"
                    onClick={() => setDetailModal({ phrase, recordingId })}
                    className="w-8 h-8 flex items-center justify-center rounded-md text-[var(--t-fg-3)] hover:text-[var(--t-fg)] hover:bg-[var(--t-surface-2)] transition-colors shrink-0"
                    title="Réécouter et voir le détail"
                  >
                    <Headphones className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </button>
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-[var(--t-fg-4)] shrink-0" strokeWidth={1.75} />
                )}
              </div>
            )
          })}
        </div>

        <SpeakerRecordingDetailModal
          open={detailModal !== null}
          phrase={detailModal?.phrase ?? null}
          recordingId={detailModal?.recordingId ?? null}
          onClose={() => setDetailModal(null)}
        />
      </div>
    )
  }

  /* ---------- RECORD (main) ---------- */
  const isCurrentRecorded = currentStatus?.recorded ?? false
  const isCurrentRejected = currentStatus?.isValid === false
  const isCurrentValid = currentStatus?.isValid === true

  return (
    <div className="h-dvh flex flex-col bg-[var(--t-bg)] text-[var(--t-fg)] overflow-hidden select-none">
      {/* Top bar */}
      <header className="flex items-center gap-3 h-[52px] px-5 border-b border-[var(--t-surface-active)] shrink-0">
        <button
          onClick={() => navigate('/speaker/dashboard')}
          className="inline-flex items-center gap-1.5 text-[12px] text-[var(--t-fg-3)] hover:text-[var(--t-fg)] transition-colors"
          style={{ ...sans, fontWeight: 510 }}
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
          Quitter
        </button>
        <span className="text-[var(--t-fg-5)]">/</span>
        <span className="text-[13px] text-[var(--t-fg)] truncate" style={{ ...sans, fontWeight: 510 }}>
          {sessionData?.project.name}
        </span>
        <span className="text-[11px] text-[var(--t-fg-4)] hidden sm:inline" style={sans}>
          {sessionData?.project.language_label ?? ''}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {todayEarnings > 0 && (
            <span
              className="inline-flex items-center h-[22px] px-2.5 rounded-full text-[11px] tabular-nums"
              style={{
                ...sans,
                fontWeight: 510,
                color: '#10b981',
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.22)',
              }}
            >
              +{new Intl.NumberFormat('fr-SN').format(todayEarnings)} FCFA
            </span>
          )}
          {sessionData?.project.rate_per_hour_fcfa != null && sessionData.project.rate_per_hour_fcfa > 0 && (
            <span className="text-[11px] text-[var(--t-fg-4)] hidden sm:inline tabular-nums" style={mono}>
              {new Intl.NumberFormat('fr-SN').format(sessionData.project.rate_per_hour_fcfa)} FCFA/h
            </span>
          )}
          <button
            onClick={() => { setUnseenRejections(0); setView('list') }}
            className="relative inline-flex items-center gap-1.5 h-[28px] px-2.5 text-[12px] rounded-md transition-colors"
            style={{
              ...sans,
              fontWeight: 510,
              color: 'var(--t-fg-2)',
              background: 'var(--t-surface)',
              border: '1px solid var(--t-border)',
            }}
          >
            <List className="w-3.5 h-3.5" strokeWidth={1.75} />
            Phrases
            {unseenRejections > 0 && (
              <span
                className="min-w-[16px] h-[16px] px-1 rounded-full text-white text-[9px] tabular-nums flex items-center justify-center"
                style={{ ...sans, fontWeight: 590, background: '#fbbf24', color: 'var(--t-bg)' }}
              >
                {unseenRejections}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Progress bar pleine largeur */}
      <div className="h-[3px] bg-[var(--t-surface-2)] shrink-0">
        <div
          className="h-full bg-[var(--t-fg)] transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Meta row (compteur + pagination) */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--t-surface-active)] shrink-0">
        <div className="flex items-center gap-3">
          <span
            className="text-[11px] text-[var(--t-fg-4)] uppercase"
            style={{ ...sans, fontWeight: 510, letterSpacing: '0.08em' }}
          >
            Phrase
          </span>
          <span className="text-[13px] text-[var(--t-fg)] tabular-nums" style={{ ...mono, fontWeight: 510 }}>
            {currentIndex + 1}
          </span>
          <span className="text-[11px] text-[var(--t-fg-4)] tabular-nums" style={mono}>
            / {totalPhrases}
          </span>
          <span className="text-[var(--t-fg-5)]">·</span>
          <span className="text-[11px] text-[#10b981] tabular-nums" style={mono}>
            {totalRecorded} enregistrées
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => goTo(currentIndex - 1)}
            disabled={currentIndex === 0 || isRecording || isUploading}
            className="w-[28px] h-[28px] flex items-center justify-center rounded-md text-[var(--t-fg-3)] hover:text-[var(--t-fg)] hover:bg-[var(--t-surface-2)] transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--t-fg-3)]"
            aria-label="Précédente"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
          <button
            onClick={() => goTo(currentIndex + 1)}
            disabled={currentIndex >= totalPhrases - 1 || isRecording || isUploading}
            className="w-[28px] h-[28px] flex items-center justify-center rounded-md text-[var(--t-fg-3)] hover:text-[var(--t-fg)] hover:bg-[var(--t-surface-2)] transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--t-fg-3)]"
            aria-label="Suivante"
          >
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Zone centrale : phrase + statut */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative min-h-0">
        {/* Status pill */}
        <div className="mb-6">
          {isCurrentRejected ? (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 h-[22px] rounded-full text-[11px]"
              style={{
                ...sans,
                fontWeight: 510,
                color: '#fbbf24',
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.22)',
              }}
            >
              <AlertTriangle className="w-3 h-3" strokeWidth={2} />
              À corriger
            </span>
          ) : isCurrentValid ? (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 h-[22px] rounded-full text-[11px]"
              style={{
                ...sans,
                fontWeight: 510,
                color: '#10b981',
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.22)',
              }}
            >
              <Check className="w-3 h-3" strokeWidth={2.5} />
              Validée
            </span>
          ) : isCurrentRecorded && currentStatus?.qcStatus === 'pending' ? (
            (() => {
              const elapsed = currentStatus.submittedAt ? (Date.now() - currentStatus.submittedAt) / 1000 : 0
              const isStuck = elapsed > 30
              return (
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 h-[22px] rounded-full text-[11px]"
                    style={{
                      ...sans,
                      fontWeight: 510,
                      color: isStuck ? '#fbbf24' : 'var(--t-fg-3)',
                      background: isStuck ? 'rgba(245,158,11,0.08)' : 'var(--t-surface-hover)',
                      border: `1px solid ${isStuck ? 'rgba(245,158,11,0.22)' : 'var(--t-border)'}`,
                    }}
                  >
                    <Clock className="w-3 h-3" strokeWidth={2} />
                    {isStuck ? 'Traitement plus long que prévu' : 'Analyse en cours'}
                  </span>
                  {isStuck && (
                    <>
                      <button
                        onClick={handleRetryRecording}
                        className="inline-flex items-center gap-1 px-2.5 h-[22px] text-[11px] rounded-full transition-colors"
                        style={{
                          ...sans,
                          fontWeight: 510,
                          color: 'var(--t-fg-2)',
                          background: 'var(--t-surface-2)',
                          border: '1px solid var(--t-border)',
                        }}
                      >
                        Relancer
                      </button>
                      <button
                        onClick={handleDeleteRecording}
                        className="inline-flex items-center gap-1 px-2.5 h-[22px] text-[11px] rounded-full transition-colors"
                        style={{
                          ...sans,
                          fontWeight: 510,
                          color: '#fca5a5',
                          background: 'rgba(239,68,68,0.06)',
                          border: '1px solid rgba(239,68,68,0.22)',
                        }}
                      >
                        Supprimer
                      </button>
                    </>
                  )}
                </div>
              )
            })()
          ) : null}
        </div>

        {/* Phrase */}
        <p
          className="max-w-[760px] text-center text-[var(--t-fg)] leading-[1.2]"
          style={{
            ...sans,
            fontSize: 'clamp(28px, 5vw, 42px)',
            fontWeight: 510,
            letterSpacing: '-0.5px',
          }}
        >
          {currentPhrase?.content ?? '…'}
        </p>

        {/* Error */}
        {(recorder.error || uploadError) && (
          <div
            className="mt-8 max-w-[420px] flex items-start gap-2 px-3 py-2.5 rounded-md text-[12px] text-[#fca5a5]"
            style={{
              ...sans,
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.22)',
            }}
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{recorder.error || uploadError}</span>
          </div>
        )}
      </div>

      {/* Zone basse : waveform + controls */}
      <div className="border-t border-[var(--t-surface-active)] shrink-0">
        {/* Waveform (visible en enregistrement) */}
        {isRecording && (
          <div className="px-5 pt-4 pb-2">
            <Waveform height={32} bars={96} playing />
          </div>
        )}

        {/* Upload progress */}
        {isUploading && (
          <div className="px-5 pt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-[var(--t-fg-3)]" style={sans}>
                Envoi en cours…
              </span>
              <span className="text-[11px] text-[var(--t-fg-2)] tabular-nums" style={mono}>
                {uploadProgress}%
              </span>
            </div>
            <div className="h-[3px] bg-[var(--t-surface-2)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#7170ff] rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 px-5 py-5">
          {/* Left : chrono */}
          <div className="w-[120px] flex items-center gap-2">
            {isRecording && (
              <>
                <span className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse" />
                <span
                  className="text-[15px] text-[var(--t-fg)] tabular-nums"
                  style={{ ...mono, fontWeight: 510 }}
                >
                  {formatDuration(recorder.duration)}
                </span>
              </>
            )}
            {!isRecording && !isUploading && (
              <span className="text-[11px] text-[var(--t-fg-4)]" style={mono}>
                {isCurrentRecorded ? '● enregistrée' : '○ prête'}
              </span>
            )}
          </div>

          {/* Center : bouton record */}
          <div className="flex items-center gap-2">
            {/* Retenter (si déjà enregistrée) */}
            {isCurrentRecorded && !isRecording && !isUploading && (
              <button
                onClick={handleStart}
                className="w-[44px] h-[44px] flex items-center justify-center rounded-full text-[var(--t-fg-2)] hover:text-[var(--t-fg)] hover:bg-[var(--t-surface-2)] transition-colors"
                style={{ border: '1px solid var(--t-border)' }}
                aria-label="Refaire"
                title="Refaire"
              >
                <RotateCcw className="w-4 h-4" strokeWidth={1.75} />
              </button>
            )}

            {/* Bouton principal */}
            <button
              onClick={isRecording ? handleStop : handleStart}
              disabled={isUploading}
              className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              style={{
                background: isRecording ? '#ef4444' : 'var(--t-fg)',
                color: isRecording ? 'var(--t-fg)' : 'var(--t-bg)',
                boxShadow: isRecording
                  ? '0 0 0 6px rgba(239,68,68,0.12), 0 0 0 12px rgba(239,68,68,0.06)'
                  : '0 4px 16px -4px var(--t-border-strong)',
              }}
              aria-label={isRecording ? "Arrêter l'enregistrement" : 'Commencer à enregistrer'}
            >
              {isUploading ? (
                <Loader2 className="w-7 h-7 animate-spin" />
              ) : isRecording ? (
                <Square className="w-5 h-5" fill="currentColor" />
              ) : (
                <Mic className="w-7 h-7" strokeWidth={1.75} />
              )}
            </button>

            {/* Continuer (si validée ou en attente) */}
            {isCurrentRecorded && !isCurrentRejected && !isRecording && !isUploading && currentIndex < totalPhrases - 1 && (
              <button
                onClick={() => goTo(currentIndex + 1)}
                className="w-[44px] h-[44px] flex items-center justify-center rounded-full text-[var(--t-fg-2)] hover:text-[var(--t-fg)] hover:bg-[var(--t-surface-2)] transition-colors"
                style={{ border: '1px solid var(--t-border)' }}
                aria-label="Suivante"
                title="Suivante"
              >
                <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
              </button>
            )}
          </div>

          {/* Right : hint clavier */}
          <div className="w-[120px] text-right">
            <span
              className="inline-flex items-center gap-1 text-[10px] text-[var(--t-fg-4)]"
              style={{ ...sans, fontWeight: 510 }}
            >
              <kbd
                className="inline-flex items-center justify-center min-w-[20px] h-[18px] px-1.5 rounded-sm text-[10px]"
                style={{
                  ...mono,
                  color: 'var(--t-fg-2)',
                  background: 'var(--t-surface-2)',
                  border: '1px solid var(--t-border)',
                }}
              >
                Space
              </kbd>
              <span className="hidden sm:inline">pour {isRecording ? 'stopper' : 'démarrer'}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
