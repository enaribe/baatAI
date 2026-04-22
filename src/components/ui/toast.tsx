import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useToast } from '../../hooks/use-toast'
import type { ToastVariant } from '../../contexts/toast-context'

const iconMap: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
}

const iconColorMap: Record<ToastVariant, string> = {
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#7170ff',
}

export function ToastContainer() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed z-[100] top-4 right-4 flex flex-col gap-2 pointer-events-none max-w-[calc(100vw-2rem)] sm:max-w-[28rem]"
      aria-live="polite"
      role="status"
    >
      {toasts.map((t) => {
        const Icon = iconMap[t.variant]
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 rounded-[8px] px-4 py-3 animate-slide-in-right"
            style={{
              animationDuration: '250ms',
              background: 'var(--t-surface-2)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow:
                '0 8px 2px rgba(0,0,0,0), 0 5px 2px rgba(0,0,0,0.01), 0 3px 2px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.07), 0 0 1px rgba(0,0,0,0.08), 0 10px 40px -10px rgba(0,0,0,0.6)',
            }}
          >
            <Icon
              className="w-4 h-4 shrink-0 mt-0.5"
              style={{ color: iconColorMap[t.variant] }}
            />
            <div className="flex-1 min-w-0">
              {t.title && (
                <p
                  className="text-[13px] text-[#f7f8f8] leading-tight mb-0.5"
                  style={{ fontFeatureSettings: "'cv01','ss03'", fontWeight: 510 }}
                >
                  {t.title}
                </p>
              )}
              <ToastBody>{t.message}</ToastBody>
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 p-0.5 rounded-md text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
              aria-label="Fermer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

function ToastBody({ children }: { children: ReactNode }) {
  return <p className="text-[12px] leading-relaxed text-[#d0d6e0]">{children}</p>
}
