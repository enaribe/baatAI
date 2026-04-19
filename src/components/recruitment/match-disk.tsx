import { useEffect, useState } from 'react'

interface MatchDiskProps {
  score: number
  size?: number
  strokeWidth?: number
  children?: React.ReactNode
}

export function MatchDisk({ score, size = 56, strokeWidth = 3, children }: MatchDiskProps) {
  const [animated, setAnimated] = useState(0)

  useEffect(() => {
    const start = performance.now()
    const duration = 600
    let raf = 0
    const tick = (t: number) => {
      const elapsed = t - start
      const progress = Math.min(1, elapsed / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimated(score * eased)
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [score])

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (animated / 100) * circumference

  const tier =
    score >= 80 ? 'excellent' :
    score >= 60 ? 'good' :
    score >= 40 ? 'fair' : 'low'

  const ringColor =
    tier === 'excellent' ? 'var(--color-primary-500)' :
    tier === 'good' ? 'var(--color-secondary-500)' :
    tier === 'fair' ? 'var(--color-accent-500)' : 'var(--color-sand-400)'

  const bgColor = 'var(--color-sand-200)'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {tier === 'excellent' && (
        <span
          className="absolute inset-0 rounded-full animate-pulse-soft"
          style={{ boxShadow: `0 0 0 2px ${ringColor}20, 0 0 12px ${ringColor}40` }}
          aria-hidden
        />
      )}
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke 300ms ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}
