interface StaticWaveformProps {
  /** Seed déterministe (ex: project ID) pour générer un pattern unique stable */
  seed: string
  /** Nombre de barres */
  bars?: number
  /** Opacité max (haut) des barres */
  maxOpacity?: number
  /** Gradient blanc → gris de gauche à droite ? */
  gradient?: boolean
  className?: string
}

/**
 * Waveform statique décorative pour les cards.
 * Déterministe : même seed = même pattern, stable entre renders.
 */
export function StaticWaveform({
  seed, bars = 60, maxOpacity = 0.7, gradient = true, className = '',
}: StaticWaveformProps) {
  const heights = Array.from({ length: bars }, (_, i) => {
    const charCode = seed.charCodeAt(i % Math.max(1, seed.length)) || 60
    const h = ((charCode * (i + 7)) % 100) / 100
    return 0.15 + h * 0.85
  })

  return (
    <div className={`absolute inset-0 flex items-center gap-[2px] px-4 py-4 ${className}`}>
      {heights.map((h, i) => {
        const t = i / Math.max(1, bars - 1)
        const shade = gradient
          ? `rgb(${Math.round(247 - t * 170)}, ${Math.round(248 - t * 172)}, ${Math.round(248 - t * 170)})`
          : '#f7f8f8'
        return (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${h * 100}%`,
              minHeight: 2,
              background: shade,
              borderRadius: 1,
              opacity: maxOpacity * (0.5 + (1 - t) * 0.5),
            }}
          />
        )
      })}
    </div>
  )
}
