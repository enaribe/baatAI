import { Sun, Moon } from 'lucide-react'
import { useDarkMode } from '../../hooks/use-dark-mode'

interface ThemeToggleProps {
  /** `dark-fixed` pour Nav landing (icône claire sur fond sombre toujours) ou `adaptive` */
  variant?: 'adaptive' | 'dark-fixed'
  size?: number
  className?: string
}

export function ThemeToggle({
  variant = 'adaptive',
  size = 28,
  className = '',
}: ThemeToggleProps) {
  const { isDark, toggle } = useDarkMode()

  const isFixed = variant === 'dark-fixed'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      title={isDark ? 'Mode clair' : 'Mode sombre'}
      className={`inline-flex items-center justify-center rounded-md transition-colors ${className}`}
      style={{
        width: size,
        height: size,
        color: isFixed ? '#d0d6e0' : 'var(--t-fg-3)',
        background: 'transparent',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = isFixed
          ? 'rgba(255,255,255,0.05)'
          : 'var(--t-surface-hover)'
        e.currentTarget.style.color = isFixed ? '#f7f8f8' : 'var(--t-fg)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = isFixed ? '#d0d6e0' : 'var(--t-fg-3)'
      }}
    >
      {isDark
        ? <Sun style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={1.75} />
        : <Moon style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={1.75} />}
    </button>
  )
}
