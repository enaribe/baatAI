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
  const barH = size === 'sm' ? 'h-1.5' : 'h-2.5'

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-2">
          {label && (
            <span className="text-sm font-semibold text-sand-700 dark:text-sand-300">{label}</span>
          )}
          {showPercentage && (
            <span className="text-sm font-bold tabular-nums text-primary-600 dark:text-primary-400">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full ${barH} bg-sand-200 dark:bg-sand-800 rounded-full overflow-hidden`}>
        <div
          className={[
            'h-full rounded-full',
            'bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600',
            'transition-all duration-700 ease-out',
            'shadow-sm shadow-primary-500/30',
          ].join(' ')}
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
