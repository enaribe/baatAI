import type { ReactNode } from 'react'
import { useCountUp } from '../hooks/use-count-up'

interface StatCardProps {
  label: string
  value: number
  icon: ReactNode
  suffix?: string
  color?: 'primary' | 'secondary' | 'accent'
  delay?: number
}

const colorConfig = {
  primary: {
    iconBg: 'bg-primary-100 dark:bg-primary-900/30',
    iconText: 'text-primary-600 dark:text-primary-400',
    valueText: 'text-primary-600 dark:text-primary-400',
    accent: 'from-primary-500/10 to-transparent',
    dot: 'bg-primary-500',
  },
  secondary: {
    iconBg: 'bg-secondary-100 dark:bg-secondary-900/30',
    iconText: 'text-secondary-600 dark:text-secondary-400',
    valueText: 'text-secondary-600 dark:text-secondary-400',
    accent: 'from-secondary-500/10 to-transparent',
    dot: 'bg-secondary-500',
  },
  accent: {
    iconBg: 'bg-accent-100 dark:bg-accent-900/30',
    iconText: 'text-accent-600 dark:text-accent-400',
    valueText: 'text-accent-600 dark:text-accent-400',
    accent: 'from-accent-500/10 to-transparent',
    dot: 'bg-accent-500',
  },
}

export function StatCard({ label, value, icon, suffix, color = 'primary', delay = 0 }: StatCardProps) {
  const animatedValue = useCountUp(value)
  const config = colorConfig[color]

  return (
    <div
      className="animate-stagger-in relative overflow-hidden rounded-2xl bg-white dark:bg-sand-900 border border-sand-200/60 dark:border-sand-800 p-5 transition-all duration-250 ease-out hover:-translate-y-1 hover:shadow-lg hover:shadow-primary-500/8 hover:border-sand-300 dark:hover:border-sand-700"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Accent gradient corner */}
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${config.accent} rounded-bl-[60px] pointer-events-none`} />

      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.iconBg}`}>
          <span className={config.iconText}>{icon}</span>
        </div>
        <span className={`w-2 h-2 rounded-full ${config.dot} opacity-60 mt-1`} />
      </div>

      <p
        className={`text-3xl font-extrabold tabular-nums ${config.valueText} leading-none mb-1`}
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        {animatedValue.toLocaleString('fr-FR')}
        {suffix && <span className="text-base font-semibold ml-1 text-sand-400">{suffix}</span>}
      </p>
      <p className="text-sm font-medium text-sand-500 dark:text-sand-400">{label}</p>
    </div>
  )
}
