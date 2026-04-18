import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Square, CheckCircle2, Loader2, AlertCircle, RotateCcw, Mic,
  AlertTriangle, X, List, ArrowLeft, ArrowRight, Clock, TrendingUp,
} from 'lucide-react'
import { useRecorder } from '../hooks/use-recorder'
import { useAuth } from '../hooks/use-auth'
import { useWallet } from '../hooks/use-wallet'
import { getRejectionInfo } from '../lib/qc-translations'
import { supabase } from '../lib/supabase'
import type { Phrase } from '../types/database'

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

  const pendingChecks = useRef<{ recordingId: string; phraseId: string }[]>([])
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Chargement de la session depuis Supabase directement (auth Supabase, pas token)
  useEffect(() => {
    if (!sessionId || !user) return
    const load = async () => {
      try {
        type SessionRow = { id: string; project_id: string; speaker_name: string | null; status: string; speaker_id: string | null }
        type RecordingRow = { phrase_id: string }
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
          supabase.from('recordings').select('phrase_id').eq('session_id', sessionId) as unknown as Promise<{ data: RecordingRow[] | null; error: unknown }>,
          supabase.from('projects').select('name, rate_per_hour_fcfa, language_label').eq('id', session.project_id).single() as unknown as Promise<{ data: ProjectRow | null; error: unknown }>,
        ])

        // Upload URL TUS
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

        const statuses: Record<string, PhraseStatus> = {}
        for (const phrase of data.phrases) {
          statuses[phrase.id] = {
            recorded: data.recorded_phrase_ids.includes(phrase.id),
            recordingId: null, qcStatus: null, isValid: null, reasons: [],
          }
        }
        setPhraseStatuses(statuses)

        const firstUnrecorded = data.phrases.findIndex(p => !data.recorded_phrase_ids.includes(p.id))
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
            setPhraseStatuses(prev => ({
              ...prev,
              [check.phraseId]: {
                ...prev[check.phraseId],
                qcStatus: rec.processing_status as PhraseStatus['qcStatus'],
                isValid: rec.is_valid ?? null,
                reasons: rec.rejection_reasons ?? [],
              } as PhraseStatus,
            }))
            if (rec.is_valid === false || rec.processing_status === 'failed') {
              setUnseenRejections(n => n + 1)
            }
            if (rec.is_valid === true && rec.duration_seconds && sessionData?.project.rate_per_hour_fcfa) {
              const earned = Math.round((rec.duration_seconds / 3600) * sessionData.project.rate_per_hour_fcfa)
              setTodayEarnings(n => n + earned)
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
    () => Object.values(phraseStatuses).filter(s => s.recorded).length,
    [phraseStatuses],
  )
  const rejectedPhrases = useMemo(
    () => phrases.filter(p => phraseStatuses[p.id]?.isValid === false),
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

      // submit-recording via Edge Function (service_role pour l'INSERT)
      const res = await fetch(`${supabaseUrl}/functions/v1/submit-recording`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionData.session.id,
          phrase_id: currentPhrase.id,
          storage_path: storagePath,
        }),
      })
      const json = await res.json() as { data?: { recording_id: string }; error?: string }
      if (!res.ok || json.error) throw new Error(json.error ?? 'Erreur lors de la soumission')

      const recordingId = json.data?.recording_id
      setPhraseStatuses(prev => ({
        ...prev,
        [currentPhrase.id]: { ...prev[currentPhrase.id], recorded: true, recordingId: recordingId ?? null, qcStatus: 'pending', isValid: null, reasons: [] },
      }))
      if (recordingId) {
        pendingChecks.current = [
          ...pendingChecks.current.filter(c => c.phraseId !== currentPhrase.id),
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
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); isRecording ? handleStop() : (!isUploading && handleStart()) }
      else if (e.code === 'ArrowRight' && !isRecording && !isUploading) goTo(currentIndex + 1)
      else if (e.code === 'ArrowLeft' && !isRecording && !isUploading) goTo(currentIndex - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view, isRecording, isUploading, currentIndex, handleStart, handleStop, goTo])

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  if (view === 'loading') {
    return (
      <div className="h-dvh flex flex-col items-center justify-center bg-sand-50 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center">
          <Mic className="w-8 h-8 text-primary-400" />
        </div>
        <p className="text-sand-700 font-semibold text-sm">Chargement de la session</p>
        <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
      </div>
    )
  }

  if (view === 'error') {
    return (
      <div className="h-dvh flex flex-col items-center justify-center bg-sand-50 px-6">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <p className="text-sand-800 text-lg font-bold text-center mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
          Session inaccessible
        </p>
        <p className="text-sand-500 text-sm text-center max-w-[22rem] leading-relaxed mb-4">{errorMessage}</p>
        <button onClick={() => navigate('/speaker/dashboard')} className="text-sm font-semibold text-primary-600">
          ← Retour au dashboard
        </button>
      </div>
    )
  }

  if (view === 'done') {
    return (
      <div className="h-dvh flex flex-col items-center justify-center bg-sand-50 px-6 overflow-y-auto">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full bg-secondary-100 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-secondary-600" />
          </div>
          <div className="absolute inset-0 rounded-full bg-secondary-200 animate-ping opacity-20" />
        </div>
        <h1
          className="text-sand-900 text-center mb-2"
          style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 800, letterSpacing: '-0.03em' }}
        >
          Session terminée !
        </h1>
        <p className="text-sand-500 text-center text-sm mb-2">
          <strong className="text-sand-700">{totalPhrases} phrases</strong> enregistrées.
        </p>

        {/* Gains de la session */}
        {todayEarnings > 0 && (
          <div className="flex items-center gap-2 bg-secondary-50 border border-secondary-200 rounded-xl px-4 py-2.5 mb-4">
            <TrendingUp className="w-4 h-4 text-secondary-600" />
            <span className="text-sm font-bold text-secondary-700 tabular-nums">
              +{new Intl.NumberFormat('fr-SN').format(todayEarnings)} FCFA gagnés
            </span>
          </div>
        )}

        {rejectedPhrases.length > 0 && (
          <div className="mt-3 w-full max-w-sm rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {rejectedPhrases.length} phrase{rejectedPhrases.length > 1 ? 's' : ''} à corriger
            </p>
            {rejectedPhrases.map(p => (
              <button
                key={p.id}
                onClick={() => goTo(phrases.findIndex(ph => ph.id === p.id))}
                className="w-full flex items-center justify-between gap-2 py-2 border-t border-amber-200/60 text-left active:bg-amber-100/60"
              >
                <span className="text-xs text-amber-700 truncate">#{p.position} {p.content}</span>
                <RotateCcw className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setView('list')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sand-100 text-sand-700 text-sm font-semibold hover:bg-sand-200 transition-colors border border-sand-200"
          >
            <List className="w-4 h-4" />
            Voir les phrases
          </button>
          <button
            onClick={() => navigate('/speaker/dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-bold shadow-md hover:scale-[1.02] transition-all"
          >
            Mon dashboard
          </button>
        </div>
      </div>
    )
  }

  if (view === 'list') {
    return (
      <div className="h-dvh flex flex-col bg-sand-50">
        <div className="flex items-center justify-between px-4 py-3 border-b border-sand-200 bg-white shrink-0">
          <button
            onClick={() => setView(totalRecorded >= totalPhrases ? 'done' : 'record')}
            className="flex items-center gap-1.5 text-sm font-semibold text-sand-600 hover:text-sand-900 transition-colors"
            style={{ touchAction: 'manipulation' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <h1 className="text-sm font-bold text-sand-900" style={{ fontFamily: 'var(--font-heading)' }}>
            {sessionData?.project.name}
          </h1>
          <span className="text-xs tabular-nums font-semibold text-sand-500">{totalRecorded}/{totalPhrases}</span>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {phrases.map((phrase, idx) => {
            const status = phraseStatuses[phrase.id]
            const isRejected = status?.isValid === false
            const isValid = status?.isValid === true
            const isPending = status?.recorded && status.qcStatus === 'pending'
            return (
              <button
                key={phrase.id}
                onClick={() => goTo(idx)}
                className={['w-full text-left rounded-2xl border p-3.5 transition-all duration-150 active:scale-[0.99]',
                  isRejected ? 'border-amber-200 bg-amber-50' : isValid ? 'border-secondary-200/60 bg-secondary-50/40' : status?.recorded ? 'border-sand-200 bg-sand-50' : 'border-sand-200 bg-white',
                ].join(' ')}
                style={{ touchAction: 'manipulation' }}
              >
                <div className="flex items-start gap-3">
                  <div className={['shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black mt-0.5',
                    isRejected ? 'bg-amber-100 text-amber-600' : isValid ? 'bg-secondary-100 text-secondary-700' : isPending ? 'bg-sand-100 text-sand-400' : 'bg-sand-100 text-sand-500',
                  ].join(' ')}>
                    {isRejected ? '!' : isValid ? '✓' : isPending ? <Clock className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-sand-400 tabular-nums mb-0.5">Phrase {idx + 1}</p>
                    <p className="text-sm text-sand-800 leading-snug line-clamp-2">{phrase.content}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {isRejected && status.reasons.map(code => (
                        <span key={code} className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          {getRejectionInfo(code)?.label ?? code}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-sand-300 shrink-0 mt-2" />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const isCurrentRecorded = currentStatus?.recorded ?? false
  const isCurrentRejected = currentStatus?.isValid === false
  const isCurrentValid = currentStatus?.isValid === true

  return (
    <div className="h-dvh flex flex-col bg-sand-50 select-none overflow-hidden">
      {/* Bandeau gains */}
      {sessionData?.project.rate_per_hour_fcfa != null && sessionData.project.rate_per_hour_fcfa > 0 && (
        <div className="bg-secondary-50 border-b border-secondary-200/60 px-4 py-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold text-secondary-700">{sessionData.project.name}</span>
          <div className="flex items-center gap-3">
            {todayEarnings > 0 && (
              <span className="text-xs font-bold text-secondary-600 tabular-nums">
                +{new Intl.NumberFormat('fr-SN').format(todayEarnings)} FCFA aujourd'hui
              </span>
            )}
            <span className="text-[11px] text-secondary-500 tabular-nums">
              {new Intl.NumberFormat('fr-SN').format(sessionData.project.rate_per_hour_fcfa)} FCFA/h
            </span>
          </div>
        </div>
      )}

      {/* Zone haute */}
      <div className="flex-[0_0_20%] flex flex-col items-center justify-center px-5 pt-2 relative">
        <button
          onClick={() => { setUnseenRejections(0); setView('list') }}
          className="absolute top-2 left-4 flex items-center gap-1.5 h-9 px-3 rounded-full border bg-white border-sand-200 shadow-sm active:scale-95 transition-all duration-200"
          style={{ touchAction: 'manipulation' }}
        >
          <List className="w-4 h-4 text-sand-500" />
          {unseenRejections > 0 && (
            <span className="min-w-[1.1rem] h-[1.1rem] flex items-center justify-center rounded-full bg-amber-500 text-white text-[9px] font-black leading-none px-1">
              {unseenRejections}
            </span>
          )}
        </button>

        <div className="w-full max-w-[20rem]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-sand-500 tabular-nums">{totalRecorded} / {totalPhrases}</span>
            <span className="text-[11px] font-bold text-primary-600 tabular-nums">{Math.round(progressPct)}%</span>
          </div>
          <div className="w-full h-1.5 bg-sand-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[10px] text-sand-400 mt-1 text-center tabular-nums">Phrase {currentIndex + 1} sur {totalPhrases}</p>
        </div>
      </div>

      {/* Zone centrale */}
      <div className="flex-[0_0_50%] relative flex flex-col items-center justify-center px-4">
        <button onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0 || isRecording || isUploading}
          className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-sand-100 text-sand-500 hover:bg-sand-200 disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-95"
          style={{ touchAction: 'manipulation' }} aria-label="Phrase précédente">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button onClick={() => goTo(currentIndex + 1)} disabled={currentIndex >= totalPhrases - 1 || isRecording || isUploading}
          className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-sand-100 text-sand-500 hover:bg-sand-200 disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-95"
          style={{ touchAction: 'manipulation' }} aria-label="Phrase suivante">
          <ArrowRight className="w-5 h-5" />
        </button>

        <div className="max-w-[28rem] w-full px-16 text-center">
          <div className="h-7 flex items-center justify-center mb-3">
            {isCurrentRejected && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200/60">
                <AlertTriangle className="w-3 h-3" />
                À corriger
              </span>
            )}
            {isCurrentValid && !isCurrentRejected && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-100 text-secondary-700 text-xs font-bold">
                <CheckCircle2 className="w-3 h-3" />
                Validée
              </span>
            )}
            {isCurrentRecorded && !isCurrentValid && !isCurrentRejected && currentStatus?.qcStatus === 'pending' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sand-100 text-sand-500 text-xs font-semibold">
                <Clock className="w-3 h-3" />
                Analyse en cours…
              </span>
            )}
          </div>

          <p className="text-sand-900 leading-snug"
            style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(22px, 5.5vw, 34px)', fontWeight: 600, letterSpacing: '-0.01em' }}>
            {currentPhrase?.content ?? '…'}
          </p>

          {(recorder.error || uploadError) && (
            <div className="mt-4 px-4 py-2.5 bg-red-50 rounded-xl text-red-600 text-xs text-center border border-red-200/60">
              {recorder.error || uploadError}
            </div>
          )}
        </div>
      </div>

      {/* Zone basse */}
      <div className="flex-[0_0_28%] flex flex-col items-center justify-center gap-3 px-6 pb-4">
        <div className="h-7 flex items-center justify-center">
          {isRecording && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-base font-bold tabular-nums text-sand-800" style={{ fontFamily: 'var(--font-heading)' }}>
                {formatDuration(recorder.duration)}
              </span>
            </div>
          )}
          {isUploading && (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
              <span className="text-sm text-sand-600 font-semibold tabular-nums">Envoi {uploadProgress}%</span>
            </div>
          )}
        </div>

        <div className="relative">
          {isRecording && (
            <>
              <span className="absolute inset-0 rounded-full bg-red-500/20 animate-pulse-record-ring" />
              <span className="absolute inset-[-8px] rounded-full bg-red-500/10 animate-pulse-record-ring animation-delay-200" />
            </>
          )}
          <button
            onClick={isRecording ? handleStop : handleStart}
            disabled={isUploading}
            className={['relative w-[88px] h-[88px] rounded-full flex items-center justify-center shadow-xl transition-all duration-200 active:scale-95',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
              isRecording
                ? 'bg-red-500 shadow-red-500/40 animate-pulse-record'
                : 'bg-gradient-to-br from-primary-500 to-primary-700 shadow-primary-500/35 hover:scale-105',
            ].join(' ')}
            style={{ minWidth: '88px', minHeight: '88px', touchAction: 'manipulation' }}
            aria-label={isRecording ? "Arrêter l'enregistrement" : 'Commencer à enregistrer'}
          >
            {isUploading ? <Loader2 className="w-9 h-9 text-white animate-spin" />
              : isRecording ? <Square className="w-8 h-8 text-white" fill="white" />
              : <Mic className="w-9 h-9 text-white" />}
          </button>
        </div>

        <p className="text-[11px] text-sand-400 text-center px-6 leading-relaxed">
          {isRecording ? 'Appuyez pour arrêter — lisez clairement'
            : isUploading ? 'Envoi en cours, attendez…'
            : isCurrentRejected ? 'Enregistrement rejeté — appuyez pour refaire'
            : isCurrentRecorded ? 'Déjà enregistrée — appuyez pour refaire'
            : 'Appuyez pour enregistrer'}
        </p>

        {isCurrentRecorded && !isCurrentRejected && !isRecording && !isUploading && (
          <button
            onClick={() => goTo(currentIndex + 1 < totalPhrases ? currentIndex + 1 : currentIndex)}
            className="flex items-center gap-1.5 text-xs text-sand-400 hover:text-sand-600 transition-colors"
            style={{ touchAction: 'manipulation' }}
          >
            Continuer <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {unseenRejections > 0 && (
        <button
          onClick={() => setUnseenRejections(0)}
          className="absolute top-3 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-amber-50 border border-amber-200 shadow-sm active:scale-95"
          style={{ touchAction: 'manipulation' }}
        >
          <X className="w-4 h-4 text-amber-500" />
        </button>
      )}
    </div>
  )
}
