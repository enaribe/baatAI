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

const variantClasses: Record<ToastVariant, string> = {
  success:
    'bg-secondary-50 dark:bg-secondary-900/30 border-secondary-200 dark:border-secondary-800 text-secondary-900 dark:text-secondary-100',
  error:
    'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100',
  warning:
    'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100',
  info:
    'bg-accent-50 dark:bg-accent-900/30 border-accent-200 dark:border-accent-800 text-accent-900 dark:text-accent-100',
}

const iconClasses: Record<ToastVariant, string> = {
  success: 'text-secondary-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-accent-500',
}

export function ToastContainer() {
  const { toasts, dismiss } = useToast()

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed z-[100] top-4 right-4 flex flex-col gap-2 pointer-events-none max-w-[calc(100vw-2rem)] sm:max-w-md"
      aria-live="polite"
      role="status"
    >
      {toasts.map((t) => {
        const Icon = iconMap[t.variant]
        return (
          <div
            key={t.id}
            className={[
              'pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm',
              'animate-slide-in-right',
              variantClasses[t.variant],
            ].join(' ')}
            style={{ animationDuration: '250ms' }}
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconClasses[t.variant]}`} />
            <div className="flex-1 min-w-0">
              {t.title && (
                <p
                  className="text-sm font-bold leading-tight mb-0.5"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {t.title}
                </p>
              )}
              <ToastBody>{t.message}</ToastBody>
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 p-0.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              aria-label="Fermer la notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

function ToastBody({ children }: { children: ReactNode }) {
  return <p className="text-xs leading-relaxed opacity-90">{children}</p>
}
