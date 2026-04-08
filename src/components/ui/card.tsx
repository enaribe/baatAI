import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  hover?: boolean
  accent?: boolean
}

export function Card({ children, hover = false, accent = false, className = '', ...rest }: CardProps) {
  return (
    <div
      className={[
        'rounded-2xl',
        'bg-white dark:bg-sand-900',
        'border border-sand-200/60 dark:border-sand-800',
        'shadow-md',
        accent ? 'border-l-4 border-l-primary-500' : '',
        hover ? [
          'transition-all duration-250 ease-out cursor-pointer',
          'hover:-translate-y-1 hover:shadow-lg hover:shadow-primary-500/8',
          'hover:border-sand-300 dark:hover:border-sand-700',
        ].join(' ') : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: ReactNode
  className?: string
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`px-6 py-4 border-b border-sand-100 dark:border-sand-800/70 ${className}`}>
      {children}
    </div>
  )
}

interface CardContentProps {
  children: ReactNode
  className?: string
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  )
}
