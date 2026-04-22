import { forwardRef } from 'react'
import type { SelectHTMLAttributes } from 'react'
import { AlertCircle, ChevronDown } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
  hint?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ label, error, hint, options, placeholder, id, className = '', ...rest }, ref) {
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
          <select
            ref={ref}
            id={id}
            className={[
              'w-full h-[34px] text-[14px] leading-none text-[#f7f8f8]',
              'rounded-md px-3 pr-9 appearance-none cursor-pointer',
              'bg-[rgba(255,255,255,0.02)]',
              'border transition-colors',
              error
                ? 'border-[rgba(239,68,68,0.35)]'
                : 'border-[rgba(255,255,255,0.08)]',
              'focus:outline-none focus:border-[#7170ff] focus:bg-[rgba(255,255,255,0.04)]',
              'focus:shadow-[0_0_0_3px_rgba(113,112,255,0.12)]',
              'disabled:opacity-50',
              className,
            ].join(' ')}
            style={{
              fontFamily: 'var(--font-body)',
              fontFeatureSettings: "'cv01','ss03'",
              fontWeight: 400,
            }}
            {...rest}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#191a1b] text-[#f7f8f8]">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#62666d] pointer-events-none" />
        </div>
        {hint && !error && (
          <p className="mt-1.5 text-[12px] text-[#62666d]">{hint}</p>
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
