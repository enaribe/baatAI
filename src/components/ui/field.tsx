import { useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'

interface FieldProps {
  label?: string
  type?: string
  placeholder?: string
  hint?: string
  icon?: ReactNode
  value?: string
  onChange?: (v: string) => void
  rightSlot?: ReactNode
  required?: boolean
  autoFocus?: boolean
  id?: string
}

/**
 * Field Daandé Auth — input adaptatif light/dark via tokens --t-*.
 * Reproduit la spec du mock (Auth.html).
 */
export function Field({
  label,
  type = 'text',
  placeholder,
  hint,
  icon,
  value,
  onChange,
  rightSlot,
  required,
  autoFocus,
  id,
}: FieldProps) {
  const [focus, setFocus] = useState(false)

  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      {label && (
        <span
          className="text-[12px]"
          style={{
            fontFamily: 'var(--font-body)',
            fontFeatureSettings: "'cv01','ss03'",
            fontWeight: 510,
            color: 'var(--t-fg-2)',
          }}
        >
          {label}
          {required && (
            <span className="ml-1" style={{ color: 'var(--t-fg-4)' }}>
              *
            </span>
          )}
        </span>
      )}
      <div
        className="flex items-center gap-2 rounded-md px-3 py-[9px]"
        style={{
          background: 'var(--t-surface)',
          border: `1px solid ${focus ? 'var(--t-accent)' : 'var(--t-border)'}`,
          outline: focus ? '3px solid var(--t-accent-muted-bg)' : '3px solid transparent',
          outlineOffset: '0px',
          transition: 'border-color 120ms, outline-color 120ms',
        }}
      >
        {icon && (
          <span className="inline-flex shrink-0" style={{ color: 'var(--t-fg-3)' }}>
            {icon}
          </span>
        )}
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value ?? ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange?.(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          autoFocus={autoFocus}
          className="flex-1 bg-transparent outline-none text-[14px]"
          style={{
            fontFamily: 'var(--font-body)',
            fontFeatureSettings: "'cv01','ss03'",
            lineHeight: 1.4,
            color: 'var(--t-fg)',
            border: 'none',
            boxShadow: 'none',
            appearance: 'none',
            WebkitAppearance: 'none',
          }}
        />
        {rightSlot}
      </div>
      {hint && (
        <span
          className="text-[11px]"
          style={{
            fontFamily: 'var(--font-body)',
            fontFeatureSettings: "'cv01','ss03'",
            color: 'var(--t-fg-4)',
          }}
        >
          {hint}
        </span>
      )}
    </label>
  )
}
