import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Mic, Square, Play, Pause, RotateCcw, Loader2, Check, Trash2,
  AlertTriangle, Info,
} from 'lucide-react'
import { useRecorder } from '../hooks/use-recorder'
import { useSpeakerSample } from '../hooks/use-speaker-sample'
import { Waveform } from './ui/waveform'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

const MAX_DURATION = 60 // secondes
const RECOMMENDED_DURATION = 30

interface VoiceSampleSectionProps {
  speakerId: string
  samplePath: string | null
  sampleDuration: number | null
  sampleRecordedAt: string | null
  onUpdated: () => void
}

type UIState =
  | { kind: 'idle' }
  | { kind: 'recording' }
  | { kind: 'preview'; blob: Blob; url: string; duration: number }
  | { kind: 'saved' }

export function VoiceSampleSection({
  speakerId, samplePath, sampleDuration, sampleRecordedAt, onUpdated,
}: VoiceSampleSectionProps) {
  const recorder = useRecorder()
  const sample = useSpeakerSample()
  const [ui, setUi] = useState<UIState>({ kind: 'idle' })
  const [savedPlaying, setSavedPlaying] = useState(false)
  const [savedCurrentTime, setSavedCurrentTime] = useState(0)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const savedAudioRef = useRef<HTMLAudioElement | null>(null)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)
  const [previewPlaying, setPreviewPlaying] = useState(false)
  const autoStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-stop à 60s
  useEffect(() => {
    if (recorder.state === 'recording') {
      autoStopTimer.current = setTimeout(() => {
        handleStop()
      }, MAX_DURATION * 1000)
    }
    return () => {
      if (autoStopTimer.current) clearTimeout(autoStopTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.state])

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s) % 60).padStart(2, '0')}`

  const handleStart = async () => {
    setUi({ kind: 'recording' })
    await recorder.start()
  }

  const handleStop = async () => {
    const blob = await recorder.stop()
    if (!blob) {
      setUi({ kind: 'idle' })
      return
    }
    const url = URL.createObjectURL(blob)
    setUi({ kind: 'preview', blob, url, duration: recorder.duration })
  }

  const handleDiscard = () => {
    if (ui.kind === 'preview') URL.revokeObjectURL(ui.url)
    setPreviewPlaying(false)
    setUi({ kind: 'idle' })
  }

  const handleSave = async () => {
    if (ui.kind !== 'preview') return
    const result = await sample.upload({
      blob: ui.blob,
      durationSeconds: ui.duration,
      speakerId,
    })
    if (result) {
      URL.revokeObjectURL(ui.url)
      setPreviewPlaying(false)
      setUi({ kind: 'saved' })
      onUpdated()
      setTimeout(() => setUi({ kind: 'idle' }), 1500)
    }
  }

  const togglePreviewPlay = useCallback(() => {
    if (!previewAudioRef.current) return
    if (previewPlaying) {
      previewAudioRef.current.pause()
    } else {
      previewAudioRef.current.play()
    }
  }, [previewPlaying])

  const handleDelete = async () => {
    const ok = await sample.remove(speakerId, samplePath)
    if (ok) {
      setConfirmingDelete(false)
      setSavedPlaying(false)
      setSavedCurrentTime(0)
      onUpdated()
    }
  }

  const toggleSavedPlay = useCallback(() => {
    if (!savedAudioRef.current) return
    if (savedPlaying) {
      savedAudioRef.current.pause()
    } else {
      savedAudioRef.current.play()
    }
  }, [savedPlaying])

  const sampleUrl = samplePath ? sample.getPublicUrl(samplePath) : null
  const hasSample = !!samplePath && ui.kind === 'idle'

  return (
    <section>
      <div
        className="text-[11px] text-[#62666d] uppercase mb-3 flex items-center gap-2"
        style={{ ...sans, fontWeight: 510, letterSpacing: '0.04em' }}
      >
        Échantillon de voix
        <span
          className="inline-flex items-center gap-1 px-1.5 h-[16px] rounded-full text-[9px] normal-case"
          style={{
            ...sans,
            fontWeight: 510,
            letterSpacing: 0,
            color: 'var(--t-fg-3)',
            background: 'var(--t-surface-hover)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          Facultatif
        </span>
      </div>

      <div
        className="rounded-[10px] p-5"
        style={{
          background: 'var(--t-surface)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Hint d'intro */}
        <div className="flex items-start gap-2 mb-4">
          <Info className="w-3.5 h-3.5 text-[#8a8f98] shrink-0 mt-0.5" strokeWidth={1.75} />
          <p className="text-[12px] text-[#d0d6e0] leading-relaxed" style={sans}>
            Enregistrez 30 secondes de votre voix (parlez librement dans votre langue) pour
            que les clients puissent vous écouter avant de vous inviter. Une bonne démo
            augmente fortement vos chances d'être sélectionné.
          </p>
        </div>

        {/* Erreurs */}
        {(recorder.error || sample.error) && (
          <div
            className="flex items-start gap-2 px-3 py-2 mb-4 rounded-md text-[12px] text-[#fca5a5]"
            style={{
              ...sans,
              background: 'var(--t-danger-muted-bg)',
              border: '1px solid var(--t-danger-muted-border)',
            }}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{recorder.error ?? sample.error}</span>
          </div>
        )}

        {/* États */}
        {hasSample && !confirmingDelete && (
          <SavedSample
            url={sampleUrl!}
            duration={sampleDuration ?? 0}
            recordedAt={sampleRecordedAt}
            playing={savedPlaying}
            currentTime={savedCurrentTime}
            audioRef={savedAudioRef}
            onTogglePlay={toggleSavedPlay}
            onTimeUpdate={setSavedCurrentTime}
            onEnded={() => { setSavedPlaying(false); setSavedCurrentTime(0) }}
            onPlayingChange={setSavedPlaying}
            onReRecord={() => setUi({ kind: 'idle' })}
            onDelete={() => setConfirmingDelete(true)}
          />
        )}

        {confirmingDelete && (
          <ConfirmDelete
            onConfirm={handleDelete}
            onCancel={() => setConfirmingDelete(false)}
          />
        )}

        {ui.kind === 'idle' && !samplePath && (
          <IdleState onStart={handleStart} />
        )}

        {ui.kind === 'idle' && samplePath && !hasSample && (
          <IdleState onStart={handleStart} reRecording />
        )}

        {ui.kind === 'recording' && (
          <RecordingState
            duration={recorder.duration}
            onStop={handleStop}
            maxDuration={MAX_DURATION}
            recommended={RECOMMENDED_DURATION}
          />
        )}

        {ui.kind === 'preview' && (
          <PreviewState
            url={ui.url}
            duration={ui.duration}
            playing={previewPlaying}
            onTogglePlay={togglePreviewPlay}
            onPlayingChange={setPreviewPlaying}
            audioRef={previewAudioRef}
            onDiscard={handleDiscard}
            onSave={handleSave}
            uploading={sample.uploading}
            progress={sample.progress}
          />
        )}

        {ui.kind === 'saved' && (
          <div className="flex items-center gap-2 justify-center py-6">
            <Check className="w-4 h-4 text-[#10b981]" strokeWidth={2} />
            <span className="text-[13px] text-[#10b981]" style={{ ...sans, fontWeight: 510 }}>
              Échantillon enregistré
            </span>
          </div>
        )}
      </div>

      <p className="text-[11px] text-[#62666d] mt-2" style={sans}>
        Max {MAX_DURATION}s · {formatDuration(MAX_DURATION)} maximum · Recommandé {RECOMMENDED_DURATION}s
      </p>
    </section>
  )
}

/* ---------- États ---------- */

function IdleState({ onStart, reRecording }: { onStart: () => void; reRecording?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <button
        onClick={onStart}
        className="w-[60px] h-[60px] rounded-full flex items-center justify-center transition-all active:scale-95"
        style={{
          background: 'var(--t-solid-bg)',
          color: 'var(--t-solid-fg)',
          boxShadow: '0 4px 16px -4px rgba(255,255,255,0.15)',
        }}
        aria-label="Commencer à enregistrer"
      >
        <Mic className="w-6 h-6" strokeWidth={1.75} />
      </button>
      <p className="text-[13px] text-[#d0d6e0]" style={{ ...sans, fontWeight: 510 }}>
        {reRecording ? 'Réenregistrer votre échantillon' : 'Appuyez pour enregistrer'}
      </p>
    </div>
  )
}

function RecordingState({
  duration, onStop, maxDuration, recommended,
}: {
  duration: number
  onStop: () => void
  maxDuration: number
  recommended: number
}) {
  const pct = Math.min(100, (duration / maxDuration) * 100)
  const format = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s) % 60).padStart(2, '0')}`
  const reachedRecommended = duration >= recommended

  return (
    <div className="flex flex-col gap-4 py-2">
      <Waveform height={36} bars={72} playing />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse" />
          <span
            className="text-[18px] text-[#f7f8f8] tabular-nums"
            style={{ ...mono, fontWeight: 510 }}
          >
            {format(duration)}
          </span>
          <span className="text-[12px] text-[#62666d]" style={mono}>
            / {format(maxDuration)}
          </span>
        </div>
        {reachedRecommended && (
          <span
            className="inline-flex items-center gap-1 px-2 h-[20px] rounded-full text-[10px]"
            style={{
              ...sans,
              fontWeight: 510,
              color: 'var(--t-success)',
              background: 'var(--t-success-muted-bg)',
              border: '1px solid var(--t-success-muted-border)',
            }}
          >
            <Check className="w-2.5 h-2.5" strokeWidth={2.5} />
            Bonne durée
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-[3px] bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            pct >= 100 ? 'bg-[#ef4444]' : 'bg-[#f7f8f8]'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <button
        onClick={onStop}
        className="self-center w-[56px] h-[56px] rounded-full flex items-center justify-center transition-all active:scale-95"
        style={{
          background: '#ef4444',
          color: 'var(--t-fg)',
          boxShadow: '0 0 0 6px rgba(239,68,68,0.12)',
        }}
        aria-label="Arrêter l'enregistrement"
      >
        <Square className="w-4 h-4" fill="currentColor" />
      </button>
      <p className="text-[11px] text-[#62666d] text-center" style={sans}>
        Appuyez pour arrêter
      </p>
    </div>
  )
}

function PreviewState({
  url, duration, playing, onTogglePlay, onPlayingChange, audioRef, onDiscard, onSave,
  uploading, progress,
}: {
  url: string
  duration: number
  playing: boolean
  onTogglePlay: () => void
  onPlayingChange: (p: boolean) => void
  audioRef: React.MutableRefObject<HTMLAudioElement | null>
  onDiscard: () => void
  onSave: () => void
  uploading: boolean
  progress: number
}) {
  const format = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s) % 60).padStart(2, '0')}`

  return (
    <div className="flex flex-col gap-4 py-2">
      <audio
        ref={audioRef}
        src={url}
        onPlay={() => onPlayingChange(true)}
        onPause={() => onPlayingChange(false)}
        onEnded={() => onPlayingChange(false)}
        preload="metadata"
      />

      {/* Player */}
      <div
        className="flex items-center gap-3 p-3 rounded-md"
        style={{
          background: 'var(--t-surface)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <button
          onClick={onTogglePlay}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'var(--t-solid-bg)', color: 'var(--t-solid-fg)' }}
          aria-label={playing ? 'Pause' : 'Lecture'}
        >
          {playing ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4 ml-0.5" fill="currentColor" />}
        </button>
        <div className="flex-1">
          <Waveform height={24} bars={60} playing={playing} />
        </div>
        <span className="text-[12px] text-[#d0d6e0] tabular-nums" style={mono}>
          {format(duration)}
        </span>
      </div>

      {uploading && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-[#8a8f98]" style={sans}>Envoi en cours…</span>
            <span className="text-[11px] text-[#d0d6e0] tabular-nums" style={mono}>
              {progress}%
            </span>
          </div>
          <div className="h-[3px] bg-[rgba(255,255,255,0.04)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#7170ff] rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {!uploading && (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onDiscard}
            className="inline-flex items-center gap-1.5 h-[32px] px-3 text-[12px] rounded-md text-[#d0d6e0] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
            style={{ ...sans, fontWeight: 510 }}
          >
            <RotateCcw className="w-3 h-3" strokeWidth={1.75} />
            Réessayer
          </button>
          <button
            onClick={onSave}
            className="inline-flex items-center gap-1.5 h-[32px] px-3 text-[12px] rounded-md transition-colors"
            style={{
              ...sans,
              fontWeight: 510,
              color: '#ffffff',
              background: '#5e6ad2',
            }}
          >
            <Check className="w-3 h-3" strokeWidth={2.5} />
            Publier l'échantillon
          </button>
        </div>
      )}
    </div>
  )
}

function SavedSample({
  url, duration, recordedAt, playing, currentTime, audioRef,
  onTogglePlay, onTimeUpdate, onEnded, onPlayingChange,
  onReRecord, onDelete,
}: {
  url: string
  duration: number
  recordedAt: string | null
  playing: boolean
  currentTime: number
  audioRef: React.MutableRefObject<HTMLAudioElement | null>
  onTogglePlay: () => void
  onTimeUpdate: (t: number) => void
  onEnded: () => void
  onPlayingChange: (p: boolean) => void
  onReRecord: () => void
  onDelete: () => void
}) {
  const format = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s) % 60).padStart(2, '0')}`
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0
  const dateStr = recordedAt
    ? new Date(recordedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  return (
    <div className="flex flex-col gap-3">
      <audio
        ref={audioRef}
        src={url}
        onPlay={() => onPlayingChange(true)}
        onPause={() => onPlayingChange(false)}
        onEnded={onEnded}
        onTimeUpdate={(e) => onTimeUpdate((e.target as HTMLAudioElement).currentTime)}
        preload="metadata"
      />

      <div
        className="flex items-center gap-3 p-3 rounded-md"
        style={{
          background: 'var(--t-success-muted-bg)',
          border: '1px solid var(--t-success-muted-border)',
        }}
      >
        <button
          onClick={onTogglePlay}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'var(--t-solid-bg)', color: 'var(--t-solid-fg)' }}
          aria-label={playing ? 'Pause' : 'Lecture'}
        >
          {playing ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4 ml-0.5" fill="currentColor" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-flex items-center gap-1 text-[11px] text-[#10b981]"
              style={{ ...sans, fontWeight: 510 }}
            >
              <Check className="w-3 h-3" strokeWidth={2.5} />
              Échantillon publié
            </span>
            {dateStr && (
              <span className="text-[10px] text-[#62666d]" style={mono}>
                {dateStr}
              </span>
            )}
          </div>
          <div className="h-[3px] bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#10b981] rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <span className="text-[12px] text-[#d0d6e0] tabular-nums shrink-0" style={mono}>
          {format(currentTime)} / {format(duration)}
        </span>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 h-[30px] px-3 text-[12px] rounded-md transition-colors"
          style={{
            ...sans,
            fontWeight: 510,
            color: 'var(--t-danger-text)',
            background: 'var(--t-danger-muted-bg)',
            border: '1px solid var(--t-danger-muted-border)',
          }}
        >
          <Trash2 className="w-3 h-3" strokeWidth={1.75} />
          Supprimer
        </button>
        <button
          onClick={onReRecord}
          className="inline-flex items-center gap-1.5 h-[30px] px-3 text-[12px] rounded-md transition-colors"
          style={{
            ...sans,
            fontWeight: 510,
            color: 'var(--t-fg)',
            background: 'var(--t-surface-active)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <RotateCcw className="w-3 h-3" strokeWidth={1.75} />
          Réenregistrer
        </button>
      </div>
    </div>
  )
}

function ConfirmDelete({
  onConfirm, onCancel,
}: {
  onConfirm: () => Promise<void> | void
  onCancel: () => void
}) {
  const [deleting, setDeleting] = useState(false)

  const handle = async () => {
    setDeleting(true)
    await onConfirm()
    setDeleting(false)
  }

  return (
    <div
      className="flex items-start gap-3 p-4 rounded-md"
      style={{
        background: 'var(--t-danger-muted-bg)',
        border: '1px solid var(--t-danger-muted-border)',
      }}
    >
      <AlertTriangle className="w-4 h-4 text-[#fca5a5] shrink-0 mt-0.5" strokeWidth={1.75} />
      <div className="flex-1">
        <p className="text-[13px] text-[#f7f8f8]" style={{ ...sans, fontWeight: 510 }}>
          Supprimer l'échantillon ?
        </p>
        <p className="text-[12px] text-[#8a8f98] mt-1" style={sans}>
          Les clients ne pourront plus écouter votre voix avant invitation.
        </p>
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="h-[28px] px-2.5 text-[12px] rounded-md text-[#d0d6e0] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
            style={{ ...sans, fontWeight: 510 }}
          >
            Annuler
          </button>
          <button
            onClick={handle}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 h-[28px] px-2.5 text-[12px] rounded-md transition-colors disabled:opacity-40"
            style={{
              ...sans,
              fontWeight: 510,
              color: 'var(--t-fg)',
              background: '#ef4444',
            }}
          >
            {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" strokeWidth={1.75} />}
            Confirmer
          </button>
        </div>
      </div>
    </div>
  )
}
