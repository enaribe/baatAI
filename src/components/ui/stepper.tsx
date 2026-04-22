interface StepperProps {
  current: number
  total: number
  labels?: string[]
  onJump?: (step: number) => void
}

/**
 * Stepper dark Baat — "étape 2/5" en mono + barres de progression + label actif.
 * Reproduit la spec du mock (Auth.html).
 */
export function Stepper({ current, total, labels, onJump }: StepperProps) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="text-[11px] text-[#62666d]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        étape {current}/{total}
      </span>
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => {
          const filled = i + 1 <= current
          const canJump = onJump && i + 1 <= current
          return (
            <button
              key={i}
              type="button"
              title={labels?.[i]}
              onClick={() => (canJump ? onJump?.(i + 1) : undefined)}
              className="rounded-sm border-0 p-0"
              style={{
                width: 22,
                height: 3,
                cursor: canJump ? 'pointer' : 'default',
                background: filled ? '#f7f8f8' : 'rgba(255,255,255,0.1)',
              }}
            />
          )
        })}
      </div>
      {labels && (
        <span
          className="text-[12px] text-[#8a8f98] hidden sm:inline"
          style={{
            fontFamily: 'var(--font-body)',
            fontFeatureSettings: "'cv01','ss03'",
          }}
        >
          {labels[current - 1]}
        </span>
      )}
    </div>
  )
}
