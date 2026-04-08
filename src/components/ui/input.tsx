import { forwardRef } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ label, error, icon, id, className = '', ...rest }, ref) {
    const baseClasses = 'w-full px-4 py-3 rounded-xl border text-sand-900 placeholder-sand-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent dark:bg-sand-800 dark:text-sand-100 dark:placeholder-sand-500 dark:border-sand-700'
    const stateClasses = error
      ? 'border-error bg-red-50 dark:bg-red-950/20 dark:border-red-700'
      : 'border-sand-300 bg-sand-50 dark:bg-sand-800'
    const iconClass = icon ? 'pl-10' : ''

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-sand-700 dark:text-sand-300 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sand-400 pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            className={`${baseClasses} ${stateClasses} ${iconClass} ${className}`}
            {...rest}
          />
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
