import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
  children: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    'relative overflow-hidden',
    'bg-gradient-to-r from-primary-500 to-primary-600',
    'text-white font-semibold',
    'shadow-md shadow-primary-500/25',
    'hover:shadow-lg hover:shadow-primary-500/35',
    'before:absolute before:inset-0 before:bg-white/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-200',
  ].join(' '),
  secondary: [
    'bg-sand-100 text-sand-800 border border-sand-200',
    'hover:bg-sand-200 hover:border-sand-300',
    'dark:bg-sand-800 dark:text-sand-100 dark:border-sand-700',
    'dark:hover:bg-sand-700 dark:hover:border-sand-600',
  ].join(' '),
  ghost: [
    'bg-transparent text-sand-700',
    'hover:bg-sand-100 hover:text-sand-900',
    'dark:text-sand-300 dark:hover:bg-sand-800 dark:hover:text-sand-100',
  ].join(' '),
  danger: [
    'bg-red-500 text-white',
    'shadow-md shadow-red-500/20',
    'hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/30',
  ].join(' '),
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3.5 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-7 py-3.5 text-base rounded-xl gap-2.5',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = 'primary', size = 'md', loading = false, icon, children, disabled, className = '', ...rest },
    ref,
  ) {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={[
          'inline-flex items-center justify-center font-semibold',
          'transition-all duration-200 ease-out',
          'hover:scale-[1.02] active:scale-[0.97]',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(' ')}
        {...rest}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        <span>{children}</span>
      </button>
    )
  },
)
