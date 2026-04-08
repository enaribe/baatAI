import { forwardRef } from 'react'
import type { TextareaHTMLAttributes } from 'react'
import { AlertCircle } from 'lucide-react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, error, id, className = '', ...rest }, ref) {
    const baseClasses = 'w-full px-4 py-3 rounded-xl border text-sand-900 placeholder-sand-400 resize-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent dark:bg-sand-800 dark:text-sand-100 dark:placeholder-sand-500 dark:border-sand-700'
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
        <textarea
          ref={ref}
          id={id}
          className={`${baseClasses} ${stateClasses} ${className}`}
          {...rest}
        />
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
