import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { MessageSquarePlus, Loader2, Check, X, Bug, Lightbulb, Heart, MessageSquare } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/use-auth'
import { useToast } from '../hooks/use-toast'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }

type Category = 'bug' | 'suggestion' | 'praise' | 'other'

const CATEGORIES: { value: Category; label: string; icon: typeof Bug; color: string }[] = [
  { value: 'bug', label: 'Bug', icon: Bug, color: '#ef4444' },
  { value: 'suggestion', label: 'Suggestion', icon: Lightbulb, color: '#fbbf24' },
  { value: 'praise', label: 'Compliment', icon: Heart, color: '#10b981' },
  { value: 'other', label: 'Autre', icon: MessageSquare, color: '#7170ff' },
]

/**
 * Bouton flottant en bas à droite + modal pour soumettre un feedback.
 * Affiché sur toutes les pages authentifiées (intégré dans AppLayout / SpeakerLayout).
 *
 * Submit via RPC submit_feedback qui capture email + rôle automatiquement.
 */
export function FeedbackButton() {
  const { user } = useAuth()
  const { notify } = useToast()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<Category>('suggestion')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!user) return null

  const valid = message.trim().length >= 10 && message.trim().length <= 2000

  const handleSubmit = async () => {
    if (!valid || submitting) return
    setSubmitting(true)
    try {
      const { error: rpcErr } = await (supabase as unknown as {
        rpc: (fn: string, args: Record<string, unknown>) => Promise<{
          data: string | null
          error: { message: string } | null
        }>
      }).rpc('submit_feedback', {
        p_category: category,
        p_message: message.trim(),
        p_page_url: location.pathname + location.search,
        p_user_agent: navigator.userAgent,
      })

      if (rpcErr) throw new Error(rpcErr.message)

      notify({
        variant: 'success',
        title: 'Feedback envoyé',
        message: "Merci ! L'équipe va le lire rapidement.",
      })
      setOpen(false)
      setMessage('')
      setCategory('suggestion')
    } catch (err) {
      notify({
        variant: 'error',
        title: 'Envoi impossible',
        message: err instanceof Error ? err.message : 'Erreur inconnue',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Donner un avis"
        className="fixed bottom-5 right-5 lg:bottom-6 lg:right-6 z-30 w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
        style={{
          background: '#5e6ad2',
          color: '#ffffff',
          boxShadow: '0 8px 24px -6px rgba(94,106,210,0.45)',
        }}
      >
        <MessageSquarePlus className="w-5 h-5" strokeWidth={1.75} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={(e) => { if (e.target === e.currentTarget && !submitting) setOpen(false) }}
        >
          <div
            className="rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-[480px] max-h-[92dvh] overflow-y-auto"
            style={{
              background: 'var(--t-modal-bg)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 40px 80px -20px rgba(0,0,0,0.8)',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <MessageSquarePlus className="w-4 h-4 text-[#7170ff]" strokeWidth={1.75} />
              <h2 className="text-[15px] text-[#f7f8f8] m-0" style={{ ...sans, fontWeight: 590 }}>
                Donner un avis
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="ml-auto w-7 h-7 flex items-center justify-center rounded-md text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            </div>
            <p className="text-[12px] text-[#8a8f98] mb-4" style={sans}>
              Bug, suggestion, compliment, tout est utile pour améliorer Daandé.
            </p>

            {/* Catégorie */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-4">
              {CATEGORIES.map((c) => {
                const on = category === c.value
                const Icon = c.icon
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className="flex flex-col items-center gap-1.5 p-2.5 rounded-md transition-colors"
                    style={{
                      ...sans,
                      fontWeight: 510,
                      background: on ? 'rgba(255,255,255,0.05)' : 'var(--t-surface)',
                      border: `1px solid ${on ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" strokeWidth={1.75} style={{ color: on ? c.color : 'var(--t-fg-3)' }} />
                    <span
                      className="text-[11px]"
                      style={{ color: on ? 'var(--t-fg)' : 'var(--t-fg-2)' }}
                    >
                      {c.label}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Message */}
            <div>
              <label className="block text-[12px] text-[#d0d6e0] mb-1.5" style={{ ...sans, fontWeight: 510 }}>
                Votre message <span className="text-[#62666d]">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Décrivez votre expérience…"
                rows={5}
                maxLength={2000}
                className="w-full px-3 py-2.5 text-[13px] text-[#f7f8f8] placeholder:text-[#62666d] rounded-md bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[rgba(255,255,255,0.22)] resize-y"
                style={{ ...sans, lineHeight: 1.5 }}
              />
              <p className="text-[11px] text-[#62666d] mt-1.5" style={sans}>
                {message.trim().length} / 2000 caractères · minimum 10
              </p>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="flex-1 h-[34px] text-[13px] rounded-md text-[#d0d6e0] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                style={{ ...sans, fontWeight: 510 }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!valid || submitting}
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-[34px] text-[13px] rounded-md transition-colors disabled:opacity-40"
                style={{
                  ...sans,
                  fontWeight: 510,
                  color: '#ffffff',
                  background: '#5e6ad2',
                }}
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" strokeWidth={2} />}
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
