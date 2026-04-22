import { forwardRef } from 'react'
import type { TextareaHTMLAttributes } from 'react'
import { AlertCircle } from 'lucide-react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, error, hint, id, className = '', ...rest }, ref) {
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
        <textarea
          ref={ref}
          id={id}
          className={[
            'w-full text-[14px] leading-relaxed text-[#f7f8f8]',
            'placeholder:text-[#62666d]',
            'rounded-md px-3 py-2.5 resize-none',
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
        />
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
