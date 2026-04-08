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
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ label, error, options, placeholder, id, className = '', ...rest }, ref) {
    const baseClasses = 'w-full px-4 py-3 rounded-xl border text-sand-900 appearance-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent dark:bg-sand-800 dark:text-sand-100 dark:border-sand-700'
    const stateClasses = error
      ? 'border-error bg-red-50 dark:bg-red-950/20 dark:border-red-700'
      : 'border-sand-300 bg-sand-50 dark:bg-sand-800'

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-sand-700 dark:text-sand-300 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={id}
            className={`${baseClasses} ${stateClasses} ${className}`}
            {...rest}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-400 pointer-events-none" />
        </div>
        {error && (
          <p className="mt-1.5 flex items-center gap-1 text-sm text-error">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </p>
        )}
      </div>
    )
  },
)
