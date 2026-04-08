import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Pause } from 'lucide-react'

interface AudioPlayerProps {
  src: string
  className?: string
}

export function AudioPlayer({ src, className = '' }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onLoaded = () => setDuration(audio.duration)
    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onEnded = () => setPlaying(false)

    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('ended', onEnded)
    }
  }, [src])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (playing) {
      audio.pause()
    } else {
      audio.play()
    }
    setPlaying(!playing)
  }, [playing])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !duration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    audio.currentTime = ratio * duration
  }, [duration])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        onClick={togglePlay}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-primary-500 text-white hover:bg-primary-600 transition-colors shrink-0"
        aria-label={playing ? 'Pause' : 'Lecture'}
      >
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
      </button>

      <div
        className="flex-1 min-w-[80px] h-1.5 bg-sand-200 dark:bg-sand-700 rounded-full cursor-pointer"
        onClick={handleSeek}
      >
        <div
          className="h-full rounded-full bg-primary-500 transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      <span className="text-xs tabular-nums text-sand-500 dark:text-sand-400 shrink-0">
        {formatTime(currentTime)}/{formatTime(duration)}
      </span>
    </div>
  )
}
