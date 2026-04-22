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
 * Field Baat Auth — input dark avec icône gauche, label en mono-ish, hint.
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
          className="text-[12px] text-[#d0d6e0]"
          style={{
            fontFamily: 'var(--font-body)',
            fontFeatureSettings: "'cv01','ss03'",
            fontWeight: 510,
          }}
        >
          {label}
          {required && <span className="text-[#62666d] ml-1">*</span>}
        </span>
      )}
      <div
        className="flex items-center gap-2 rounded-md px-3 py-[9px]"
        style={{
          background: 'var(--t-surface)',
          border: `1px solid ${focus ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)'}`,
          boxShadow: focus ? '0 0 0 3px rgba(255,255,255,0.04)' : 'none',
          transition: 'border-color 120ms, box-shadow 120ms',
        }}
      >
        {icon && <span className="text-[#62666d] inline-flex shrink-0">{icon}</span>}
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value ?? ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange?.(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          autoFocus={autoFocus}
          className="flex-1 bg-transparent border-0 outline-none text-[#f7f8f8] text-[14px]"
          style={{
            fontFamily: 'var(--font-body)',
            fontFeatureSettings: "'cv01','ss03'",
            lineHeight: 1.4,
          }}
        />
        {rightSlot}
      </div>
      {hint && (
        <span
          className="text-[11px] text-[#62666d]"
          style={{
            fontFamily: 'var(--font-body)',
            fontFeatureSettings: "'cv01','ss03'",
          }}
        >
          {hint}
        </span>
      )}
    </label>
  )
}
