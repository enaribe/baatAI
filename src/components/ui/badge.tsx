import type { ReactNode } from 'react'

type BadgeVariant =
  | 'default'
  | 'neutral'
  | 'subtle'
  | 'status-success'
  | 'status-pending'
  | 'status-danger'
  | 'status-info'
  | 'asr'
  | 'tts'
  | 'both'
  | 'valid'
  | 'rejected'
  | 'pending'
  | 'processing'
  | 'beta'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
  dot?: boolean
}

const dotColor: Partial<Record<BadgeVariant, string>> = {
  'status-success': '#10b981',
  'status-pending': '#f59e0b',
  'status-danger': '#ef4444',
  'status-info': '#7170ff',
  asr: '#7170ff',
  tts: '#f7f8f8',
  both: '#7170ff',
  valid: '#10b981',
  rejected: '#ef4444',
  pending: '#8a8f98',
  processing: '#f59e0b',
}

const variantClasses: Record<BadgeVariant, string> = {
  // Pill neutral : transparent + border subtle — le défaut
  default:
    'bg-transparent text-[#d0d6e0] border border-[#23252a] rounded-full px-2.5 h-[22px]',
  neutral:
    'bg-transparent text-[#d0d6e0] border border-[#23252a] rounded-full px-2.5 h-[22px]',
  // Subtle : rect 2px, tint 0.05
  subtle:
    'bg-[rgba(255,255,255,0.05)] text-[#f7f8f8] border border-[rgba(255,255,255,0.05)] rounded-[2px] px-2 h-[18px] text-[10px]',
  // Status pills — même structure que default, avec dot coloré
  'status-success':
    'bg-transparent text-[#d0d6e0] border border-[#23252a] rounded-full px-2.5 h-[22px]',
  'status-pending':
    'bg-transparent text-[#d0d6e0] border border-[#23252a] rounded-full px-2.5 h-[22px]',
  'status-danger':
    'bg-transparent text-[#d0d6e0] border border-[#23252a] rounded-full px-2.5 h-[22px]',
  'status-info':
    'bg-transparent text-[#d0d6e0] border border-[#23252a] rounded-full px-2.5 h-[22px]',
  // Aliases pour compat code existant
  asr:
    'bg-transparent text-[#d0d6e0] border border-[#23252a] rounded-full px-2.5 h-[22px]',
  tts:
    'bg-transparent text-[#d0d6e0] border border-[#23252a] rounded-full px-2.5 h-[22px]',
  both:
    'bg-transparent text-[#d0d6e0] border border-[#23252a] rounded-full px-2.5 h-[22px]',
  valid:
    'bg-transparent text-[#d0d6e0] border border-[#23252a] rounded-full px-2.5 h-[22px]',
  rejected:
    'bg-transparent text-[#d0d6e0] border border-[#23252a] rounded-full px-2.5 h-[22px]',
  pending:
    'bg-transparent text-[#8a8f98] border border-[#23252a] rounded-full px-2.5 h-[22px]',
  processing:
    'bg-transparent text-[#d0d6e0] border border-[#23252a] rounded-full px-2.5 h-[22px]',
  // Beta badge — border plus lumineux
  beta:
    'bg-transparent text-[#f7f8f8] border border-[rgba(255,255,255,0.2)] rounded-full px-2.5 h-[22px]',
}

export function Badge({ variant = 'default', dot, children, className = '' }: BadgeProps) {
  const autoDot = dot ?? (
    variant.startsWith('status-') ||
    ['valid', 'rejected', 'pending', 'processing', 'asr', 'tts', 'both'].includes(variant)
  )
  const dotHex = dotColor[variant] ?? '#8a8f98'

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 leading-none',
        'text-[12px]',
        variantClasses[variant],
        className,
      ].join(' ')}
      style={{
        fontFamily: 'var(--font-body)',
        fontFeatureSettings: "'cv01','ss03'",
        fontWeight: 510,
      }}
    >
      {autoDot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: dotHex }}
        />
      )}
      {children}
    </span>
  )
}
