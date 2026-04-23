import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  Square, Check, Loader2, AlertCircle, RotateCcw, Mic,
  AlertTriangle, List, ArrowLeft, ArrowRight, Clock, ChevronRight,
  CheckCircle2,
} from 'lucide-react'
import { useRecorder } from '../hooks/use-recorder'
import { getRejectionInfo } from '../lib/qc-translations'
import { Waveform } from '../components/ui/waveform'
import { Logo } from '../components/ui/logo'
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
}

interface SessionData {
  session: { id: string; project_id: string; speaker_name: string | null; status: string }
  phrases: Phrase[]
  recorded_phrase_ids: string[]
  upload_url: string
}

export function RecordPage() {
  const { token } = useParams<{ token: string }>()
  const recorder = useRecorder()

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

  const pendingChecks = useRef<{ recordingId: string; phraseId: string }[]>([])
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!token) return
    const load = async () => {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/get-session?token=${token}`)
        const json = await res.json()
        if (!res.ok || json.error) throw new Error(json.error || 'Session invalide ou expirée')

        const data: SessionData = json.data
        sessionDataRef.current = data
        setSessionData(data)

        const statuses: Record<string, PhraseStatus> = {}
        for (const phrase of data.phrases) {
          statuses[phrase.id] = {
            recorded: data.recorded_phrase_ids.includes(phrase.id),
            recordingId: null, qcStatus: null, isValid: null, reasons: [],
          }
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
  }, [token, supabaseUrl])

  useEffect(() => {
    if (!token) return
    const poll = async () => {
      if (pendingChecks.current.length === 0) return
      const stillPending: typeof pendingChecks.current = []
      for (const check of pendingChecks.current) {
        try {
          const res = await fetch(
            `${supabaseUrl}/functions/v1/get-recording-status?token=${token}&recording_id=${check.recordingId}`,
            { headers: { apikey: supabaseAnonKey, authorization: `Bearer ${supabaseAnonKey}` } },
          )
          if (!res.ok) { stillPending.push(check); continue }
          const json = await res.json()
          const rec = json.data
          if (!rec) { stillPending.push(check); continue }

          if (rec.processing_status === 'completed' || rec.processing_status === 'failed') {
            setPhraseStatuses((prev) => {
              const existing = prev[check.phraseId]
              if (!existing) return prev
              return {
                ...prev,
                [check.phraseId]: {
                  ...existing,
                  qcStatus: rec.processing_status as PhraseStatus['qcStatus'],
                  isValid: rec.is_valid ?? null,
                  reasons: rec.rejection_reasons ?? [],
                },
              }
            })
            if (rec.is_valid === false || rec.processing_status === 'failed') {
              setUnseenRejections((n) => n + 1)
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
  }, [token, supabaseUrl, supabaseAnonKey])

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
      const storagePath = `${sessionData.session.project_id}/${sessionData.session.id}/${currentPhrase.id}.webm`
      const tus = await import('tus-js-client')
      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(blob, {
          endpoint: sessionData.upload_url,
          retryDelays: [0, 1000, 3000, 5000],
          chunkSize: 6 * 1024 * 1024,
          headers: { authorization: `Bearer ${supabaseAnonKey}`, apikey: supabaseAnonKey, 'x-upsert': 'true' },
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_token: token, phrase_id: currentPhrase.id, storage_path: storagePath }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error || 'Erreur lors de la soumission')

      const recordingId = json.data?.recording_id as string | undefined
      setPhraseStatuses((prev) => ({
        ...prev,
        [currentPhrase.id]: {
          ...prev[currentPhrase.id], recorded: true, recordingId: recordingId ?? null,
          qcStatus: 'pending', isValid: null, reasons: [],
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

      const nextIdx = phrases.findIndex(
        (p, i) => i > currentIndex && !phraseStatuses[p.id]?.recorded && p.id !== currentPhrase.id,
      )
      setCurrentIndex(nextIdx >= 0 ? nextIdx : currentIndex + 1 < totalPhrases ? currentIndex + 1 : currentIndex)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erreur d'envoi")
    } finally {
      setIsUploading(false)
    }
  }, [
    currentPhrase, sessionData, recorder, token,
    supabaseUrl, supabaseAnonKey, phrases, currentIndex,
    totalRecorded, totalPhrases, phraseStatuses,
  ])

  useEffect(() => {
    if (view !== 'record') return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        if (isRecording) handleStop()
        else if (!isUploading) handleStart()
      } else if (e.code === 'ArrowRight' && !isRecording && !isUploading) {
        goTo(currentIndex + 1)
      } else if (e.code === 'ArrowLeft' && !isRecording && !isUploading) {
        goTo(currentIndex - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view, isRecording, isUploading, currentIndex, handleStart, handleStop, goTo])

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  /* ---------- LOADING ---------- */
  if (view === 'loading') {
    return (
      <div className="h-dvh flex flex-col items-center justify-center bg-[#08090a] gap-4">
        <div
          className="w-12 h-12 rounded-md flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Mic className="w-5 h-5 text-[#d0d6e0]" strokeWidth={1.75} />
        </div>
        <p className="text-[13px] text-[#8a8f98]" style={sans}>
          Chargement de la session…
        </p>
        <Loader2 className="w-4 h-4 animate-spin text-[#62666d]" />
      </div>
    )
  }

  /* ---------- ERROR ---------- */
  if (view === 'error') {
    return (
      <div className="h-dvh flex flex-col items-center justify-center bg-[#08090a] px-6">
        <div
          className="w-12 h-12 rounded-md flex items-center justify-center mb-5"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.22)',
          }}
        >
          <AlertCircle className="w-5 h-5 text-[#fca5a5]" strokeWidth={1.75} />
        </div>
        <h1 className="text-[18px] text-[#f7f8f8] mb-2" style={{ ...sans, fontWeight: 590 }}>
          Session inaccessible
        </h1>
        <p className="text-[13px] text-[#8a8f98] text-center max-w-[28rem] leading-relaxed" style={sans}>
          {errorMessage}
        </p>
      </div>
    )
  }

  /* ---------- DONE ---------- */
  if (view === 'done') {
    return (
      <div className="h-dvh flex flex-col items-center justify-center bg-[#08090a] px-6 overflow-y-auto">
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
          className="text-[28px] text-[#f7f8f8] m-0 text-center"
          style={{ ...sans, fontWeight: 510, letterSpacing: '-0.5px' }}
        >
          Session terminée
        </h1>
        <p className="text-[14px] text-[#8a8f98] mt-2 text-center" style={sans}>
          <span className="text-[#f7f8f8]" style={{ fontWeight: 510 }}>{totalPhrases} phrases</span> enregistrées. Merci.
        </p>

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
                <span className="text-[11px] text-[#62666d] w-8 shrink-0" style={mono}>
                  #{p.position}
                </span>
                <span className="text-[12px] text-[#d0d6e0] truncate flex-1" style={sans}>
                  {p.content}
                </span>
                <RotateCcw className="w-3 h-3 text-[#8a8f98] shrink-0" strokeWidth={1.75} />
              </button>
            ))}
          </div>
        )}

        <div className="mt-8 flex items-center gap-2">
          <Logo size={18} />
          <span className="text-[11px] text-[#62666d]" style={mono}>Powered by Daandé</span>
        </div>
      </div>
    )
  }

  /* ---------- LIST ---------- */
  if (view === 'list') {
    return (
      <div className="h-dvh flex flex-col bg-[#08090a]">
        <header className="flex items-center gap-3 h-[52px] px-5 border-b border-[rgba(255,255,255,0.05)] shrink-0">
          <button
            onClick={() => setView(totalRecorded >= totalPhrases ? 'done' : 'record')}
            className="inline-flex items-center gap-1.5 text-[12px] text-[#8a8f98] hover:text-[#f7f8f8] transition-colors"
            style={{ ...sans, fontWeight: 510 }}
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
            Retour
          </button>
          <span className="text-[#3e3e44]">/</span>
          <span className="text-[13px] text-[#f7f8f8] flex-1" style={{ ...sans, fontWeight: 510 }}>
            Toutes les phrases
          </span>
          <span className="text-[11px] text-[#62666d] tabular-nums" style={mono}>
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
            let statusColor = '#62666d'
            if (isRejected) { statusIcon = <AlertTriangle className="w-3 h-3" strokeWidth={2} />; statusColor = '#fbbf24' }
            else if (isValid) { statusIcon = <Check className="w-3 h-3" strokeWidth={2.5} />; statusColor = '#10b981' }
            else if (isPending) { statusIcon = <Clock className="w-3 h-3" strokeWidth={2} />; statusColor = '#8a8f98' }
            else if (status?.recorded) { statusIcon = <Check className="w-3 h-3" strokeWidth={2} />; statusColor = '#8a8f98' }
            else { statusIcon = <span className="w-3 h-3 rounded-full border border-current" />; statusColor = '#62666d' }

            return (
              <button
                key={phrase.id}
                onClick={() => goTo(idx)}
                className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-[rgba(255,255,255,0.025)] border-b border-[rgba(255,255,255,0.04)] transition-colors"
                style={{ background: isCurrent ? 'rgba(113,112,255,0.06)' : 'transparent' }}
              >
                <span className="text-[11px] text-[#62666d] w-10 shrink-0 tabular-nums" style={mono}>
                  #{idx + 1}
                </span>
                <span style={{ color: statusColor }}>{statusIcon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#f7f8f8] truncate" style={sans}>
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
                <ChevronRight className="w-3.5 h-3.5 text-[#62666d] shrink-0" strokeWidth={1.75} />
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  /* ---------- RECORD (main) ---------- */
  const isCurrentRecorded = currentStatus?.recorded ?? false
  const isCurrentRejected = currentStatus?.isValid === false
  const isCurrentValid = currentStatus?.isValid === true

  return (
    <div className="h-dvh flex flex-col bg-[#08090a] text-[#f7f8f8] overflow-hidden select-none">
      {/* Top bar — sans back (anonyme) */}
      <header className="flex items-center gap-3 h-[52px] px-5 border-b border-[rgba(255,255,255,0.05)] shrink-0">
        <Logo size={18} />
        <span className="text-[#3e3e44]">/</span>
        <span className="text-[11px] text-[#62666d]" style={mono}>
          Session · {sessionData?.session.speaker_name ?? 'Anonyme'}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => { setUnseenRejections(0); setView('list') }}
            className="relative inline-flex items-center gap-1.5 h-[28px] px-2.5 text-[12px] rounded-md transition-colors"
            style={{
              ...sans,
              fontWeight: 510,
              color: '#d0d6e0',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <List className="w-3.5 h-3.5" strokeWidth={1.75} />
            Phrases
            {unseenRejections > 0 && (
              <span
                className="min-w-[16px] h-[16px] px-1 rounded-full text-[9px] tabular-nums flex items-center justify-center"
                style={{ ...sans, fontWeight: 590, background: '#fbbf24', color: '#08090a' }}
              >
                {unseenRejections}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Progress bar pleine largeur */}
      <div className="h-[3px] bg-[rgba(255,255,255,0.04)] shrink-0">
        <div
          className="h-full bg-[#f7f8f8] transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(255,255,255,0.05)] shrink-0">
        <div className="flex items-center gap-3">
          <span
            className="text-[11px] text-[#62666d] uppercase"
            style={{ ...sans, fontWeight: 510, letterSpacing: '0.08em' }}
          >
            Phrase
          </span>
          <span className="text-[13px] text-[#f7f8f8] tabular-nums" style={{ ...mono, fontWeight: 510 }}>
            {currentIndex + 1}
          </span>
          <span className="text-[11px] text-[#62666d] tabular-nums" style={mono}>
            / {totalPhrases}
          </span>
          <span className="text-[#3e3e44]">·</span>
          <span className="text-[11px] text-[#10b981] tabular-nums" style={mono}>
            {totalRecorded} enregistrées
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => goTo(currentIndex - 1)}
            disabled={currentIndex === 0 || isRecording || isUploading}
            className="w-[28px] h-[28px] flex items-center justify-center rounded-md text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[rgba(255,255,255,0.04)] transition-colors disabled:opacity-30"
            aria-label="Précédente"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
          <button
            onClick={() => goTo(currentIndex + 1)}
            disabled={currentIndex >= totalPhrases - 1 || isRecording || isUploading}
            className="w-[28px] h-[28px] flex items-center justify-center rounded-md text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[rgba(255,255,255,0.04)] transition-colors disabled:opacity-30"
            aria-label="Suivante"
          >
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Zone centrale */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative min-h-0">
        <div className="mb-6">
          {isCurrentRejected ? (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 h-[22px] rounded-full text-[11px]"
              style={{
                ...sans, fontWeight: 510, color: '#fbbf24',
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
                ...sans, fontWeight: 510, color: '#10b981',
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.22)',
              }}
            >
              <Check className="w-3 h-3" strokeWidth={2.5} />
              Validée
            </span>
          ) : isCurrentRecorded && currentStatus?.qcStatus === 'pending' ? (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 h-[22px] rounded-full text-[11px]"
              style={{
                ...sans, fontWeight: 510, color: '#8a8f98',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <Clock className="w-3 h-3" strokeWidth={2} />
              Analyse en cours
            </span>
          ) : null}
        </div>

        <p
          className="max-w-[760px] text-center text-[#f7f8f8] leading-[1.2]"
          style={{
            ...sans,
            fontSize: 'clamp(28px, 5vw, 42px)',
            fontWeight: 510,
            letterSpacing: '-0.5px',
          }}
        >
          {currentPhrase?.content ?? '…'}
        </p>

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

      {/* Zone basse */}
      <div className="border-t border-[rgba(255,255,255,0.05)] shrink-0">
        {isRecording && (
          <div className="px-5 pt-4 pb-2">
            <Waveform height={32} bars={96} playing />
          </div>
        )}

        {isUploading && (
          <div className="px-5 pt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-[#8a8f98]" style={sans}>Envoi en cours…</span>
              <span className="text-[11px] text-[#d0d6e0] tabular-nums" style={mono}>
                {uploadProgress}%
              </span>
            </div>
            <div className="h-[3px] bg-[rgba(255,255,255,0.04)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#7170ff] rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 px-5 py-5">
          <div className="w-[120px] flex items-center gap-2">
            {isRecording && (
              <>
                <span className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse" />
                <span
                  className="text-[15px] text-[#f7f8f8] tabular-nums"
                  style={{ ...mono, fontWeight: 510 }}
                >
                  {formatDuration(recorder.duration)}
                </span>
              </>
            )}
            {!isRecording && !isUploading && (
              <span className="text-[11px] text-[#62666d]" style={mono}>
                {isCurrentRecorded ? '● enregistrée' : '○ prête'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isCurrentRecorded && !isRecording && !isUploading && (
              <button
                onClick={handleStart}
                className="w-[44px] h-[44px] flex items-center justify-center rounded-full text-[#d0d6e0] hover:text-[#f7f8f8] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                aria-label="Refaire"
              >
                <RotateCcw className="w-4 h-4" strokeWidth={1.75} />
              </button>
            )}

            <button
              onClick={isRecording ? handleStop : handleStart}
              disabled={isUploading}
              className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              style={{
                background: isRecording ? '#ef4444' : '#f7f8f8',
                color: isRecording ? '#f7f8f8' : '#08090a',
                boxShadow: isRecording
                  ? '0 0 0 6px rgba(239,68,68,0.12), 0 0 0 12px rgba(239,68,68,0.06)'
                  : '0 4px 16px -4px rgba(255,255,255,0.15)',
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

            {isCurrentRecorded && !isCurrentRejected && !isRecording && !isUploading && currentIndex < totalPhrases - 1 && (
              <button
                onClick={() => goTo(currentIndex + 1)}
                className="w-[44px] h-[44px] flex items-center justify-center rounded-full text-[#d0d6e0] hover:text-[#f7f8f8] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                aria-label="Suivante"
              >
                <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
              </button>
            )}
          </div>

          <div className="w-[120px] text-right">
            <span
              className="inline-flex items-center gap-1 text-[10px] text-[#62666d]"
              style={{ ...sans, fontWeight: 510 }}
            >
              <kbd
                className="inline-flex items-center justify-center min-w-[20px] h-[18px] px-1.5 rounded-sm text-[10px]"
                style={{
                  ...mono,
                  color: '#d0d6e0',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
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
