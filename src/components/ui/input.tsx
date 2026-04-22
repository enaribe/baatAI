import { forwardRef } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: ReactNode
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, icon, hint, id, className = '', ...rest }, ref) {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-[13px] text-[#d0d6e0] mb-1.5"
            style={{ fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'", fontWeight: 510 }}
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#62666d] pointer-events-none inline-flex">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            className={[
              'w-full h-[34px] text-[14px] leading-none text-[#f7f8f8]',
              'placeholder:text-[#62666d]',
              'rounded-md px-3',
              icon ? 'pl-9' : '',
              'bg-[rgba(255,255,255,0.02)]',
              'border transition-colors',
              error
                ? 'border-[rgba(239,68,68,0.35)]'
                : 'border-[rgba(255,255,255,0.08)]',
              'focus:outline-none focus:border-[#7170ff] focus:bg-[rgba(255,255,255,0.04)]',
              'focus:shadow-[0_0_0_3px_rgba(113,112,255,0.12)]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              className,
            ].join(' ')}
            style={{
              fontFamily: 'var(--font-body)',
              fontFeatureSettings: "'cv01','ss03'",
              fontWeight: 400,
            }}
            {...rest}
          />
        </div>
        {hint && !error && (
          <p className="mt-1.5 text-[12px] text-[#62666d]" style={{ fontFeatureSettings: "'cv01','ss03'" }}>
            {hint}
          </p>
        )}
        {error && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[#f87171]">
            <AlertCircle className="w-3 h-3 shrink-0" />
            {error}
          </p>
        )}
      </div>
    )
  },
)
