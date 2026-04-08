import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Square, SkipForward, SkipBack, CheckCircle2, Loader2, AlertCircle, RotateCcw, Mic } from 'lucide-react'
import { useRecorder } from '../hooks/use-recorder'
import type { Phrase } from '../types/database'

type PageState = 'loading' | 'ready' | 'recording' | 'uploading' | 'done' | 'error'

interface SessionData {
  session: {
    id: string
    project_id: string
    speaker_name: string | null
    status: string
  }
  phrases: Phrase[]
  recorded_phrase_ids: string[]
  upload_url: string
}

export function RecordPage() {
  const { token } = useParams<{ token: string }>()
  const recorder = useRecorder()

  const [pageState, setPageState] = useState<PageState>('loading')
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [recordedIds, setRecordedIds] = useState<Set<string>>(new Set())
  const [currentIndex, setCurrentIndex] = useState(0)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [redoMode, setRedoMode] = useState(false)

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

  useEffect(() => {
    if (!token) return
    const fetchSession = async () => {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/get-session?token=${token}`)
        const json = await res.json()
        if (!res.ok || json.error) throw new Error(json.error || 'Session invalide ou expirée')
        setSessionData(json.data)
        setRecordedIds(new Set(json.data.recorded_phrase_ids))
        const firstUnrecorded = json.data.phrases.findIndex(
          (p: Phrase) => !json.data.recorded_phrase_ids.includes(p.id),
        )
        setCurrentIndex(firstUnrecorded >= 0 ? firstUnrecorded : 0)
        setPageState('ready')
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Erreur de chargement')
        setPageState('error')
      }
    }
    fetchSession()
  }, [token, supabaseUrl])

  const phrases = sessionData?.phrases ?? []
  const currentPhrase = phrases[currentIndex]
  const totalPhrases = phrases.length
  const totalRecorded = recordedIds.size
  const isCurrentRecorded = currentPhrase ? recordedIds.has(currentPhrase.id) : false
  const allDone = totalRecorded >= totalPhrases && totalPhrases > 0 && !redoMode

  const goNext = useCallback(() => {
    if (currentIndex < totalPhrases - 1) {
      setCurrentIndex((i) => i + 1)
      setRedoMode(false)
    }
  }, [currentIndex, totalPhrases])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1)
      setRedoMode(false)
    }
  }, [currentIndex])

  const handleRedo = useCallback(() => {
    setRedoMode(true)
    setErrorMessage('')
  }, [])

  const canRecord = (!isCurrentRecorded || redoMode) && pageState === 'ready'

  const handleStartRecording = useCallback(async () => {
    setPageState('recording')
    await recorder.start()
  }, [recorder])

  const handleStopRecording = useCallback(async () => {
    const blob = await recorder.stop()
    if (!blob || !currentPhrase || !sessionData) return
    setPageState('uploading')
    setUploadProgress(0)

    try {
      const storagePath = `${sessionData.session.project_id}/${sessionData.session.id}/${currentPhrase.id}.webm`
      const tus = await import('tus-js-client')
      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(blob, {
          endpoint: sessionData.upload_url,
          retryDelays: [0, 1000, 3000, 5000],
          chunkSize: 6 * 1024 * 1024,
          headers: {
            authorization: `Bearer ${supabaseAnonKey}`,
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
          onError: (error) => reject(error),
          onProgress: (bytesUploaded, bytesTotal) => {
            setUploadProgress(Math.round((bytesUploaded / bytesTotal) * 100))
          },
          onSuccess: () => resolve(),
        })
        upload.start()
      })

      const res = await fetch(`${supabaseUrl}/functions/v1/submit-recording`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_token: token,
          phrase_id: currentPhrase.id,
          storage_path: storagePath,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error || "Erreur lors de la soumission")

      setRecordedIds((prev) => new Set([...prev, currentPhrase.id]))
      setRedoMode(false)

      const nextUnrecorded = phrases.findIndex(
        (p, i) => i > currentIndex && !recordedIds.has(p.id) && p.id !== currentPhrase.id,
      )
      if (nextUnrecorded >= 0) {
        setCurrentIndex(nextUnrecorded)
      } else if (totalRecorded + 1 >= totalPhrases && !redoMode) {
        setPageState('done')
        return
      } else {
        goNext()
      }
      setPageState('ready')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Erreur d'upload")
      setPageState('ready')
    }
  }, [recorder, currentPhrase, sessionData, token, supabaseUrl, supabaseAnonKey, phrases, currentIndex, recordedIds, totalRecorded, totalPhrases, redoMode, goNext])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        if (canRecord) handleStartRecording()
        else if (pageState === 'recording') handleStopRecording()
      } else if (e.code === 'ArrowRight' && pageState === 'ready') goNext()
      else if (e.code === 'ArrowLeft' && pageState === 'ready') goPrev()
      else if (e.code === 'KeyR' && pageState === 'ready' && isCurrentRecorded && !redoMode) handleRedo()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [pageState, canRecord, isCurrentRecorded, redoMode, handleStartRecording, handleStopRecording, goNext, goPrev, handleRedo])

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  // --- LOADING ---
  if (pageState === 'loading') {
    return (
      <div className="h-dvh flex flex-col items-center justify-center bg-sand-50 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center animate-pulse-soft">
          <Mic className="w-8 h-8 text-primary-400" />
        </div>
        <div className="text-center">
          <p className="text-sand-700 font-semibold text-sm">Chargement de la session</p>
          <p className="text-sand-400 text-xs mt-1">Préparation de vos phrases...</p>
        </div>
        <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
      </div>
    )
  }

  // --- ERROR ---
  if (pageState === 'error') {
    return (
      <div className="h-dvh flex flex-col items-center justify-center bg-sand-50 px-6">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <p className="text-sand-800 text-lg font-bold text-center mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
          Session inaccessible
        </p>
        <p className="text-sand-500 text-sm text-center max-w-[22rem] leading-relaxed">{errorMessage}</p>
      </div>
    )
  }

  // --- DONE ---
  if (pageState === 'done' || allDone) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center bg-sand-50 px-6">
        {/* Cercle success avec animation */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full bg-secondary-100 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-secondary-600" />
          </div>
          <div className="absolute inset-0 rounded-full bg-secondary-200 animate-ping opacity-20" />
        </div>
        <h1
          className="text-sand-900 text-center mb-3"
          style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.6rem, 5vw, 2.2rem)', fontWeight: 800, letterSpacing: '-0.03em' }}
        >
          Excellent travail !
        </h1>
        <p className="text-sand-500 text-center max-w-[24rem] leading-relaxed text-sm mb-2">
          Vous avez enregistré les <strong className="text-sand-700">{totalPhrases} phrases</strong>. Vos enregistrements vont être analysés automatiquement.
        </p>
        {sessionData?.session.speaker_name && (
          <p className="text-sand-400 text-sm mt-1 font-medium">
            — {sessionData.session.speaker_name}
          </p>
        )}
        <button
          onClick={() => {
            setCurrentIndex(0)
            setRedoMode(false)
            setPageState('ready')
          }}
          className="mt-8 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-sand-100 text-sand-700 text-sm font-semibold hover:bg-sand-200 transition-colors border border-sand-200 hover:border-sand-300"
        >
          <RotateCcw className="w-4 h-4" />
          Revoir et corriger
        </button>
      </div>
    )
  }

  // --- RECORDING UI ---
  const progressPct = totalPhrases > 0 ? (totalRecorded / totalPhrases) * 100 : 0
  const isRecording = pageState === 'recording'
  const isUploading = pageState === 'uploading'

  return (
    <div className="h-dvh flex flex-col bg-sand-50 select-none overflow-hidden">
      {/* === ZONE HAUTE : Progression (≈20%) === */}
      <div className="flex-[0_0_20%] flex flex-col items-center justify-center px-6 pt-4">
        {/* Header minimal */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
            <Mic className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-bold text-sand-700" style={{ fontFamily: 'var(--font-heading)' }}>
            {sessionData?.session.speaker_name ?? 'Enregistrement'}
          </span>
        </div>

        {/* Progress bar avec chiffres */}
        <div className="w-full max-w-[22rem]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-sand-500 tabular-nums">
              {totalRecorded} / {totalPhrases} phrases
            </span>
            <span className="text-[11px] font-bold text-primary-600 tabular-nums">
              {Math.round(progressPct)}%
            </span>
          </div>
          <div className="w-full h-2 bg-sand-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[10px] text-sand-400 mt-1.5 text-center tabular-nums">
            Phrase {currentIndex + 1} sur {totalPhrases}
          </p>
        </div>
      </div>

      {/* === ZONE CENTRALE : Phrase à lire (≈50%) === */}
      <div className="flex-[0_0_50%] relative flex flex-col items-center justify-center px-4">
        {/* Nav flèche gauche */}
        <button
          onClick={goPrev}
          disabled={currentIndex === 0 || pageState !== 'ready'}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-sand-100 text-sand-500 hover:bg-sand-200 hover:text-sand-700 disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
          aria-label="Phrase précédente"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        {/* Nav flèche droite */}
        <button
          onClick={goNext}
          disabled={currentIndex >= totalPhrases - 1 || pageState !== 'ready'}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-sand-100 text-sand-500 hover:bg-sand-200 hover:text-sand-700 disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
          aria-label="Phrase suivante"
        >
          <SkipForward className="w-5 h-5" />
        </button>

        {/* Contenu central */}
        <div className="max-w-[30rem] w-full px-14 text-center">
          {/* Statut badge */}
          {isCurrentRecorded && !redoMode && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-100 text-secondary-700 text-xs font-bold mb-4 border border-secondary-200/60">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Déjà enregistrée
            </div>
          )}
          {redoMode && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold mb-4 border border-amber-200/60">
              <RotateCcw className="w-3.5 h-3.5" />
              Mode correction
            </div>
          )}

          {/* LA PHRASE — zone d'attention maximale */}
          <p
            className="text-sand-900 leading-snug"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(22px, 5.5vw, 34px)',
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            {currentPhrase?.content ?? '...'}
          </p>

          {/* Erreurs */}
          {(recorder.error || (errorMessage && pageState === 'ready')) && (
            <div className="mt-4 px-4 py-2.5 bg-red-50 rounded-xl text-red-600 text-xs text-center border border-red-200/60">
              {recorder.error || errorMessage}
            </div>
          )}
        </div>
      </div>

      {/* === ZONE BASSE : Contrôles (≈30%) === */}
      <div className="flex-[0_0_30%] flex flex-col items-center justify-center gap-3 px-6 pb-4">
        {/* Indicateur d'état */}
        <div className="h-7 flex items-center">
          {isRecording && (
            <div className="flex items-center gap-2 animate-fade-in">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-base font-bold tabular-nums text-sand-800" style={{ fontFamily: 'var(--font-heading)' }}>
                {formatDuration(recorder.duration)}
              </span>
            </div>
          )}
          {isUploading && (
            <div className="flex items-center gap-2 animate-fade-in">
              <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
              <span className="text-sm text-sand-600 font-semibold tabular-nums">
                Envoi {uploadProgress}%
              </span>
            </div>
          )}
        </div>

        {/* Boutons */}
        <div className="flex items-center gap-5">
          {/* Bouton Refaire */}
          {isCurrentRecorded && !redoMode && pageState === 'ready' && (
            <button
              onClick={handleRedo}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-sand-100 text-sand-600 hover:bg-sand-200 hover:text-sand-800 transition-all duration-200 active:scale-95 border border-sand-200"
              aria-label="Refaire cet enregistrement"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}

          {/* BOUTON MICRO — élément iconique central */}
          <div className="relative">
            {/* Anneaux de pulsation quand recording */}
            {isRecording && (
              <>
                <span className="absolute inset-0 rounded-full bg-red-500/20 animate-pulse-record-ring" />
                <span className="absolute inset-[-8px] rounded-full bg-red-500/10 animate-pulse-record-ring animation-delay-200" />
              </>
            )}

            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              disabled={isUploading || (!canRecord && pageState === 'ready')}
              className={[
                'relative w-[88px] h-[88px] rounded-full flex items-center justify-center',
                'shadow-xl transition-all duration-200',
                'active:scale-95',
                'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
                isRecording
                  ? 'bg-red-500 shadow-red-500/40 animate-pulse-record'
                  : 'bg-gradient-to-br from-primary-500 to-primary-700 shadow-primary-500/35 hover:scale-105 hover:shadow-2xl hover:shadow-primary-500/40',
              ].join(' ')}
              style={{ minWidth: '88px', minHeight: '88px', touchAction: 'manipulation' }}
              aria-label={isRecording ? "Arrêter l'enregistrement" : 'Commencer à enregistrer'}
            >
              {isUploading ? (
                <Loader2 className="w-9 h-9 text-white animate-spin" />
              ) : isRecording ? (
                <Square className="w-8 h-8 text-white" fill="white" />
              ) : (
                <Mic className="w-9 h-9 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Hint contextuel */}
        <p className="text-[11px] text-sand-400 text-center px-6 leading-relaxed">
          {isRecording
            ? 'Appuyez pour arrêter — lisez clairement'
            : isUploading
              ? 'Envoi en cours, attendez...'
              : redoMode
                ? 'Appuyez pour ré-enregistrer'
                : isCurrentRecorded
                  ? 'Enregistrée ✓ — Refaire ou continuer'
                  : 'Appuyez pour enregistrer · Espace / Entrée'
          }
        </p>
      </div>
    </div>
  )
}
