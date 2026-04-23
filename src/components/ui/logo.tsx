interface LogoProps {
  size?: number
  compact?: boolean
  className?: string
}

/**
 * Logo Daandé — bulle de chat dégradée + equalizer 7 barres verticales.
 * Adaptatif light/dark via les tokens CSS --t-logo-* (cascadent dans
 * les sous-arbres data-theme="dark" / "light").
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
        <BubbleMark gradientId="daande-lg-compact" />
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
      <BubbleMark gradientId="daande-lg-full" />
      <text
        x="36"
        y="20"
        fontFamily="Inter var, Inter, system-ui"
        fontSize="18"
        fontWeight="590"
        letterSpacing="-0.4"
        fill="var(--t-logo-text, #f7f8f8)"
        style={{ fontFeatureSettings: "'cv01','ss03'" }}
      >
        daandé
      </text>
    </svg>
  )
}

/**
 * Bulle de chat 28×28 (rect arrondi + tail diagonal en bas-gauche)
 * + equalizer 7 barres verticales centrées.
 *
 * Couleurs via tokens CSS pour adaptation auto light/dark :
 * - --t-logo-bubble-from / --t-logo-bubble-to : gradient de la bulle
 * - --t-logo-bars : couleur knockout des barres
 */
function BubbleMark({ gradientId }: { gradientId: string }) {
  const fill = `url(#${gradientId})`
  const bars: { x: number; h: number }[] = [
    { x: 6, h: 6 },
    { x: 8.6, h: 10 },
    { x: 11.2, h: 14 },
    { x: 13.8, h: 16 },
    { x: 16.4, h: 12 },
    { x: 19, h: 8 },
    { x: 21.6, h: 5 },
  ]
  return (
    <g>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--t-logo-bubble-from, #ffffff)" />
          <stop offset="100%" stopColor="var(--t-logo-bubble-to, #8a8f98)" />
        </linearGradient>
      </defs>
      {/* corps de la bulle */}
      <rect x="2" y="2" width="24" height="22" rx="5" fill={fill} />
      {/* tail diagonal en bas-gauche */}
      <path d="M6 22 L4 26.5 L9.5 22 Z" fill={fill} />
      {/* equalizer */}
      {bars.map((b, i) => (
        <rect
          key={i}
          x={b.x}
          y={13 - b.h / 2}
          width="1.4"
          height={b.h}
          rx="0.7"
          fill="var(--t-logo-bars, #08090a)"
        />
      ))}
    </g>
  )
}
