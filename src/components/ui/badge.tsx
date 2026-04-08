import type { ReactNode } from 'react'

type BadgeVariant = 'asr' | 'tts' | 'both' | 'valid' | 'rejected' | 'pending' | 'processing' | 'default'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  asr: 'bg-accent-100 text-accent-700 ring-1 ring-accent-200 dark:bg-accent-900/30 dark:text-accent-300 dark:ring-accent-800',
  tts: 'bg-primary-100 text-primary-700 ring-1 ring-primary-200 dark:bg-primary-900/30 dark:text-primary-300 dark:ring-primary-800',
  both: 'bg-purple-100 text-purple-700 ring-1 ring-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:ring-purple-800',
  valid: 'bg-secondary-100 text-secondary-700 ring-1 ring-secondary-200 dark:bg-secondary-900/30 dark:text-secondary-300 dark:ring-secondary-800',
  rejected: 'bg-red-100 text-red-700 ring-1 ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800',
  pending: 'bg-sand-100 text-sand-600 ring-1 ring-sand-200 dark:bg-sand-800 dark:text-sand-400 dark:ring-sand-700',
  processing: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800',
  default: 'bg-sand-100 text-sand-700 ring-1 ring-sand-200 dark:bg-sand-800 dark:text-sand-300 dark:ring-sand-700',
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2.5 py-0.5',
        'rounded-full text-[11px] font-bold uppercase tracking-wider',
        variantClasses[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  )
}
