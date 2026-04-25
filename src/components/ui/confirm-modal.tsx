import { Loader2, AlertTriangle, X } from 'lucide-react'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }

export type ConfirmTone = 'default' | 'danger' | 'warning'

interface ConfirmModalProps {
  open: boolean
  title: string
  /** Texte principal sous le titre. */
  message: string
  /** Détails secondaires (optionnel) — affichés en gris en dessous. */
  details?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmTone
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}

const TONE_STYLES: Record<ConfirmTone, { bg: string; border: string; icon: string; cta: string }> = {
  default: {
    bg: 'rgba(113,112,255,0.08)',
    border: 'rgba(113,112,255,0.25)',
    icon: '#7170ff',
    cta: '#5e6ad2',
  },
  warning: {
    bg: 'rgba(251,191,36,0.08)',
    border: 'rgba(251,191,36,0.25)',
    icon: '#fbbf24',
    cta: '#fbbf24',
  },
  danger: {
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.25)',
    icon: '#ef4444',
    cta: '#ef4444',
  },
}

/**
 * Modal de confirmation cohérente avec le design system Daandé.
 * Remplace les confirm() natifs.
 *
 * Usage :
 *   const [showConfirm, setShowConfirm] = useState(false)
 *   <ConfirmModal
 *     open={showConfirm}
 *     title="Supprimer cette phrase ?"
 *     message="Cette action est irréversible."
 *     tone="danger"
 *     onConfirm={async () => { await delete(); setShowConfirm(false) }}
 *     onClose={() => setShowConfirm(false)}
 *   />
 */
export function ConfirmModal({
  open,
  title,
  message,
  details,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  tone = 'default',
  busy = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  if (!open) return null
  const t = TONE_STYLES[tone]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose() }}
    >
      <div
        className="rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-[440px] max-h-[92dvh] overflow-y-auto"
        style={{
          background: 'var(--t-modal-bg)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 40px 80px -20px rgba(0,0,0,0.8)',
        }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
            style={{ background: t.bg, border: `1px solid ${t.border}` }}
          >
            <AlertTriangle className="w-4 h-4" strokeWidth={1.75} style={{ color: t.icon }} />
          </div>
          <div className="flex-1">
            <h2 className="text-[15px] text-[#f7f8f8] m-0" style={{ ...sans, fontWeight: 590 }}>
              {title}
            </h2>
            <p className="text-[13px] text-[#d0d6e0] mt-1.5 leading-relaxed" style={sans}>
              {message}
            </p>
            {details && (
              <p className="text-[12px] text-[#8a8f98] mt-2 leading-relaxed" style={sans}>
                {details}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="w-7 h-7 flex items-center justify-center rounded-md text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[rgba(255,255,255,0.04)] transition-colors disabled:opacity-30"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 h-[34px] text-[13px] rounded-md text-[#d0d6e0] hover:bg-[rgba(255,255,255,0.04)] transition-colors disabled:opacity-40"
            style={{ ...sans, fontWeight: 510 }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-[34px] text-[13px] rounded-md transition-colors disabled:opacity-40"
            style={{
              ...sans,
              fontWeight: 510,
              color: '#ffffff',
              background: t.cta,
            }}
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
