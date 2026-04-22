import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, Pause, Volume2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Waveform } from './ui/waveform'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

interface SpeakerSamplePlayerProps {
  storagePath: string
  durationSeconds?: number | null
  variant?: 'full' | 'compact' | 'inline'
}

/**
 * Player d'échantillon de voix (public, bucket speaker-samples).
 * - `full` : large player avec waveform, pour la page détail
 * - `compact` : player compact pour les cards
 * - `inline` : juste une icône haut-parleur cliquable qui joue/pause
 */
export function SpeakerSamplePlayer({
  storagePath, durationSeconds, variant = 'full',
}: SpeakerSamplePlayerProps) {
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState<number | null>(durationSeconds ?? null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const url = useMemo(() => {
    const { data } = supabase.storage.from('speaker-samples').getPublicUrl(storagePath)
    return data.publicUrl
  }, [storagePath])

  const toggle = () => {
    if (!audioRef.current) return
    if (playing) audioRef.current.pause()
    else audioRef.current.play().catch(() => {/* user-gesture needed */})
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => { setPlaying(false); setCurrentTime(0) }
    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onMeta = () => setAudioDuration(audio.duration)

    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onMeta)
    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onMeta)
    }
  }, [url])

  const format = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s) % 60).padStart(2, '0')}`

  const dur = audioDuration ?? durationSeconds ?? 0
  const pct = dur > 0 ? (currentTime / dur) * 100 : 0

  /* ---------- Variant INLINE (icône simple) ---------- */
  if (variant === 'inline') {
    return (
      <>
        <audio ref={audioRef} src={url} preload="metadata" />
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle() }}
          className="w-[22px] h-[22px] flex items-center justify-center rounded-full transition-colors shrink-0"
          style={{
            background: playing ? 'var(--t-fg)' : 'rgba(8,9,10,0.7)',
            color: playing ? 'var(--t-bg)' : 'var(--t-fg)',
            border: `1px solid ${playing ? 'var(--t-fg)' : 'rgba(255,255,255,0.15)'}`,
            backdropFilter: 'blur(8px)',
          }}
          title={playing ? 'Pause' : 'Écouter la démo'}
          aria-label="Écouter l'échantillon de voix"
        >
          {playing
            ? <Pause className="w-2.5 h-2.5" fill="currentColor" />
            : <Play className="w-2.5 h-2.5 ml-0.5" fill="currentColor" />}
        </button>
      </>
    )
  }

  /* ---------- Variant COMPACT ---------- */
  if (variant === 'compact') {
    return (
      <div
        className="flex items-center gap-2 p-2 rounded-md"
        style={{
          background: 'var(--t-surface-hover)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <audio ref={audioRef} src={url} preload="metadata" />
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle() }}
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors"
          style={{ background: 'var(--t-solid-bg)', color: 'var(--t-solid-fg)' }}
          aria-label={playing ? 'Pause' : 'Lecture'}
        >
          {playing
            ? <Pause className="w-3 h-3" fill="currentColor" />
            : <Play className="w-3 h-3 ml-0.5" fill="currentColor" />}
        </button>
        <div className="flex-1 h-[2px] bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#f7f8f8] rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[10px] text-[#62666d] tabular-nums shrink-0" style={mono}>
          {dur > 0 ? format(dur) : '—'}
        </span>
      </div>
    )
  }

  /* ---------- Variant FULL (hero page détail) ---------- */
  return (
    <div
      className="rounded-[10px] p-4"
      style={{
        background: 'var(--t-accent-muted-bg)',
        border: '1px solid var(--t-accent-muted-border)',
      }}
    >
      <audio ref={audioRef} src={url} preload="metadata" />
      <div className="flex items-center gap-3 mb-3">
        <Volume2 className="w-3.5 h-3.5 text-[#828fff]" strokeWidth={1.75} />
        <span className="text-[12px] text-[#828fff]" style={{ ...sans, fontWeight: 510 }}>
          Échantillon de voix
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors active:scale-95"
          style={{
            background: 'var(--t-solid-bg)',
            color: 'var(--t-solid-fg)',
            boxShadow: '0 4px 16px -4px rgba(255,255,255,0.15)',
          }}
          aria-label={playing ? 'Pause' : 'Lecture'}
        >
          {playing
            ? <Pause className="w-5 h-5" fill="currentColor" />
            : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="mb-1.5">
            <Waveform height={28} bars={72} playing={playing} />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-[3px] bg-[rgba(255,255,255,0.08)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#f7f8f8] rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[11px] text-[#d0d6e0] tabular-nums shrink-0" style={mono}>
              {format(currentTime)} / {dur > 0 ? format(dur) : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
