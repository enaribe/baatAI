import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type ButtonVariant = 'primary' | 'ghost' | 'subtle' | 'secondary' | 'pill' | 'toolbar' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
  children?: ReactNode
}

const sizeMap: Record<ButtonSize, string> = {
  sm: 'h-[26px] px-2.5 text-[12px] rounded-md gap-1.5',
  md: 'h-[32px] px-3 text-[13px] rounded-md gap-1.5',
  lg: 'h-[36px] px-4 text-[14px] rounded-md gap-2',
}

const variantMap: Record<ButtonVariant, string> = {
  // Gradient blanc → gris clair, texte sombre — signature Linear pour CTA
  primary: [
    'bg-gradient-to-br from-white to-[#d0d6e0] text-[#08090a]',
    'border border-white/20',
    'hover:from-white hover:to-[#f7f8f8]',
    'shadow-[0_1px_0_0_rgba(255,255,255,0.1)_inset]',
  ].join(' '),
  // Défaut : fond quasi-transparent, border solide sombre
  ghost: [
    'bg-[rgba(255,255,255,0.02)] text-[#e2e4e7]',
    'border border-[rgb(36,40,44)]',
    'hover:bg-[rgba(255,255,255,0.04)] hover:text-[#f7f8f8]',
  ].join(' '),
  // Subtil : fond plus discret, sans border
  subtle: [
    'bg-[rgba(255,255,255,0.04)] text-[#d0d6e0]',
    'border border-transparent',
    'hover:bg-[rgba(255,255,255,0.06)] hover:text-[#f7f8f8]',
  ].join(' '),
  // Alias pour compat code existant
  secondary: [
    'bg-[rgba(255,255,255,0.04)] text-[#d0d6e0]',
    'border border-transparent',
    'hover:bg-[rgba(255,255,255,0.06)] hover:text-[#f7f8f8]',
  ].join(' '),
  // Pill : chip filtres / tags
  pill: [
    'bg-transparent text-[#d0d6e0]',
    'border border-[#23252a] !rounded-full',
    'hover:bg-[rgba(255,255,255,0.03)] hover:text-[#f7f8f8]',
  ].join(' '),
  // Toolbar : action rapide, plus compact
  toolbar: [
    'bg-[rgba(255,255,255,0.05)] text-[#d0d6e0]',
    'border border-[rgba(255,255,255,0.05)]',
    'shadow-[0_1.2px_0_0_rgba(0,0,0,0.03)]',
    'hover:bg-[rgba(255,255,255,0.08)] hover:text-[#f7f8f8]',
  ].join(' '),
  // Danger : rouge subtil, réservé aux suppressions
  danger: [
    'bg-[rgba(239,68,68,0.12)] text-[#fca5a5]',
    'border border-[rgba(239,68,68,0.25)]',
    'hover:bg-[rgba(239,68,68,0.18)] hover:text-[#fecaca]',
  ].join(' '),
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'ghost',
      size = 'md',
      loading = false,
      icon,
      iconRight,
      children,
      disabled,
      className = '',
      ...rest
    },
    ref,
  ) {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={[
          'inline-flex items-center justify-center whitespace-nowrap leading-none',
          'font-medium',
          'transition-colors duration-150 ease-out',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7170ff]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'active:translate-y-[0.5px]',
          sizeMap[size],
          variantMap[variant],
          className,
        ].join(' ')}
        style={{
          fontFamily: 'var(--font-body)',
          fontFeatureSettings: "'cv01', 'ss03'",
          fontWeight: 510,
        }}
        {...rest}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
        ) : icon ? (
          <span className="shrink-0 inline-flex">{icon}</span>
        ) : null}
        {children && <span>{children}</span>}
        {iconRight && !loading && <span className="shrink-0 inline-flex">{iconRight}</span>}
      </button>
    )
  },
)
