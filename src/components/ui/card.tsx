import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  hover?: boolean
  variant?: 'default' | 'panel' | 'featured'
}

const variantClasses: Record<NonNullable<CardProps['variant']>, string> = {
  // Fond tint 0.02, border 0.08, radius 8px — la card par défaut
  default: 'bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] rounded-[8px]',
  // Panel plus sombre et opaque
  panel: 'bg-[#0f1011] border border-[rgba(255,255,255,0.05)] rounded-[12px]',
  // Card featured : radius plus grand, fond légèrement plus lumineux
  featured: 'bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-[12px]',
}

export function Card({ children, hover = false, variant = 'default', className = '', ...rest }: CardProps) {
  return (
    <div
      className={[
        variantClasses[variant],
        hover
          ? 'transition-colors duration-150 cursor-pointer hover:bg-[rgba(255,255,255,0.04)]'
          : '',
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
    <div className={`px-5 py-4 border-b border-[rgba(255,255,255,0.05)] ${className}`}>
      {children}
    </div>
  )
}

interface CardContentProps {
  children: ReactNode
  className?: string
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>
}
