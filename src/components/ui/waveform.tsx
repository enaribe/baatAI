import { useEffect, useRef } from 'react'

interface WaveformProps {
  height?: number
  bars?: number
  playing?: boolean
  gradient?: boolean
  className?: string
}

/**
 * Composant signature : barres verticales animées en sinusoïde.
 * Gradient blanc → gris de gauche à droite, opacity décroissante.
 */
export function Waveform({
  height = 52,
  bars = 72,
  playing = true,
  gradient = true,
  className = '',
}: WaveformProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const seeds = Array.from({ length: bars }, () => Math.random())
    let raf = 0

    const tick = (t: number) => {
      if (!ref.current) return
      const kids = ref.current.children
      for (let i = 0; i < kids.length; i++) {
        const s = seeds[i] ?? 0.5
        const v = playing
          ? (0.25 + 0.75 * Math.abs(Math.sin(t / 400 + i * 0.35 + s * 6))) * (0.4 + 0.6 * s)
          : (0.2 + 0.15 * s)
        ;(kids[i] as HTMLElement).style.height = `${v * height}px`
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [bars, height, playing])

  return (
    <div
      ref={ref}
      className={`flex items-center gap-[3px] w-full ${className}`}
      style={{ height }}
    >
      {Array.from({ length: bars }).map((_, i) => {
        const t = i / Math.max(1, bars - 1)
        const shade = gradient
          ? `rgb(${Math.round(247 - t * 150)}, ${Math.round(248 - t * 152)}, ${Math.round(248 - t * 150)})`
          : '#f7f8f8'
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              background: shade,
              borderRadius: 2,
              transition: 'height 60ms linear',
              opacity: 0.55 + (1 - t) * 0.45,
            }}
          />
        )
      })}
    </div>
  )
}
