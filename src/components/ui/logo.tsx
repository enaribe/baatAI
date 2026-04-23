interface LogoProps {
  size?: number
  compact?: boolean
  className?: string
}

/**
 * Logo Daandé — carré dégradé blanc→gris avec pictogramme micro/bulle.
 * Inspiré du brand kit marketing (voir design.md).
 */
export function Logo({ size = 22, compact = false, className = '' }: LogoProps) {
  if (compact) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 28 28"
        fill="none"
        className={className}
        aria-label="Daandé"
      >
        <defs>
          <linearGradient id="daande-lg-compact" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#8a8f98" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="24" height="24" rx="6" fill="url(#daande-lg-compact)" />
        <path
          d="M8 12h12M8 16h9"
          stroke="#08090a"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <path d="M12 22l-2 3v-3" fill="url(#daande-lg-compact)" />
      </svg>
    )
  }

  return (
    <svg
      width={size * 5.2}
      height={size}
      viewBox="0 0 145 28"
      fill="none"
      className={className}
      aria-label="Daandé"
    >
      <defs>
        <linearGradient id="daande-lg-full" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#8a8f98" />
        </linearGradient>
      </defs>
      <rect x="0" y="2" width="24" height="24" rx="6" fill="url(#daande-lg-full)" />
      <path d="M6 10h12M6 14h9" stroke="#08090a" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M10 20l-2 3v-3" fill="url(#daande-lg-full)" />
      <text
        x="32"
        y="20"
        fontFamily="Inter var, Inter, system-ui"
        fontSize="18"
        fontWeight="590"
        letterSpacing="-0.4"
        fill="#f7f8f8"
        style={{ fontFeatureSettings: "'cv01','ss03'" }}
      >
        daandé
      </text>
    </svg>
  )
}
