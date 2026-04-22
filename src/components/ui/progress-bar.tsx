interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  showPercentage?: boolean
  className?: string
  size?: 'sm' | 'md'
}

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = true,
  className = '',
  size = 'md',
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  const barH = size === 'sm' ? 'h-1' : 'h-1.5'

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-2">
          {label && (
            <span
              className="text-[13px] text-[#d0d6e0]"
              style={{ fontFeatureSettings: "'cv01','ss03'", fontWeight: 510 }}
            >
              {label}
            </span>
          )}
          {showPercentage && (
            <span
              className="text-[12px] tabular-nums text-[#f7f8f8]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full ${barH} bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden`}>
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#f7f8f8] to-[#d0d6e0] transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  )
}
