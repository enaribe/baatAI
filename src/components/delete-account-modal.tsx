import { useState, useEffect } from 'react'
import { X, AlertTriangle, Loader2, Lock } from 'lucide-react'
import { useAuth } from '../hooks/use-auth'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/use-toast'

interface DeleteAccountModalProps {
  open: boolean
  onClose: () => void
}

const CONFIRMATION_WORD = 'SUPPRIMER'

export function DeleteAccountModal({ open, onClose }: DeleteAccountModalProps) {
  const { role, signOut } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset lorsque le modal s'ouvre/ferme
  useEffect(() => {
    if (!open) {
      setPassword('')
      setConfirmation('')
      setError(null)
      setSubmitting(false)
    }
  }, [open])

  // Fermeture au clavier
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, submitting, onClose])

  if (!open) return null

  const canSubmit = confirmation === CONFIRMATION_WORD && password.length > 0 && !submitting

  const submit = async () => {
    setSubmitting(true)
    setError(null)

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError('Session expirée, reconnectez-vous')
      setSubmitting(false)
      return
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      },
      body: JSON.stringify({ password, confirmation }),
    })
    const json = await res.json() as { data?: { kind: string }; error?: string }

    if (json.error) {
      setError(json.error)
      setSubmitting(false)
      return
    }

    const isAnonymized = json.data?.kind === 'anonymized'
    notify({
      variant: 'success',
      title: 'Compte supprimé',
      message: isAnonymized
        ? 'Vos données ont été anonymisées. Merci pour votre participation.'
        : 'Votre compte a été supprimé définitivement.',
    })

    await signOut()
    navigate('/login', { replace: true })
  }

  const isSpeaker = role === 'speaker'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up"
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose() }}
    >
      <div className="bg-white dark:bg-sand-900 rounded-t-2xl sm:rounded-2xl shadow-xl border border-sand-200/60 dark:border-sand-800 w-full sm:max-w-[28rem] max-h-[92dvh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-5 py-4 bg-white dark:bg-sand-900 border-b border-sand-100 dark:border-sand-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <h2
              className="text-base font-extrabold text-sand-900 dark:text-sand-100"
              style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.01em' }}
            >
              Supprimer mon compte
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            aria-label="Fermer"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-sand-100 dark:hover:bg-sand-800 transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4 text-sand-500" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Avertissement */}
          <div className="bg-red-50 dark:bg-red-900/15 border border-red-200 dark:border-red-900/40 rounded-xl p-4">
            <p className="text-sm font-bold text-red-900 dark:text-red-300 mb-2">
              Action irréversible
            </p>
            {isSpeaker ? (
              <ul className="text-xs text-red-800 dark:text-red-400 space-y-1.5 leading-relaxed">
                <li>• Votre nom, email, téléphone et adresse seront effacés</li>
                <li>• Vos enregistrements vocaux sont conservés pour les datasets déjà créés</li>
                <li>• Votre solde et historique de retraits restent en archive</li>
                <li>• Vous ne pourrez plus vous connecter</li>
              </ul>
            ) : (
              <ul className="text-xs text-red-800 dark:text-red-400 space-y-1.5 leading-relaxed">
                <li>• Votre compte et tous vos projets archivés seront supprimés</li>
                <li>• Les invitations et sessions associées seront effacées</li>
                <li>• Vous devez d'abord archiver ou terminer vos projets actifs</li>
                <li>• Vous ne pourrez plus vous connecter</li>
              </ul>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-sand-700 dark:text-sand-300 mb-1.5">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sand-400 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-sand-200 dark:border-sand-700 bg-white dark:bg-sand-800 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
                placeholder="Confirmez votre mot de passe"
              />
            </div>
          </div>

          {/* Confirmation word */}
          <div>
            <label className="block text-xs font-bold text-sand-700 dark:text-sand-300 mb-1.5">
              Tapez <span className="font-mono font-extrabold text-red-600">{CONFIRMATION_WORD}</span> pour confirmer
            </label>
            <input
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              autoComplete="off"
              className="w-full px-3 py-2.5 rounded-xl border border-sand-200 dark:border-sand-700 bg-white dark:bg-sand-800 text-sm font-mono tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
              placeholder={CONFIRMATION_WORD}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-xl px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl border border-sand-200 dark:border-sand-700 text-sand-700 dark:text-sand-300 text-sm font-semibold hover:bg-sand-50 dark:hover:bg-sand-800 transition-all disabled:opacity-40"
            >
              Annuler
            </button>
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold shadow-lg shadow-red-500/25 hover:bg-red-600 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-500"
            >
              {submitting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : 'Supprimer mon compte'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
