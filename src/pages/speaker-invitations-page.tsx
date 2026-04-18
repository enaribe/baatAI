import { useAuth } from '../hooks/use-auth'
import { useSpeakerInvitations } from '../hooks/use-speaker-invitations'
import { useNavigate } from 'react-router-dom'
import { Loader2, Mail, Check, X, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { getLanguageLabel } from '../lib/languages'
import { supabase } from '../lib/supabase'

export function SpeakerInvitationsPage() {
  const { user } = useAuth()
  const { invitations, loading, respond, refetch } = useSpeakerInvitations(user?.id)
  const navigate = useNavigate()
  const [responding, setResponding] = useState<string | null>(null)

  const handleAccept = async (inv: (typeof invitations)[0]) => {
    setResponding(inv.id)
    await respond(inv.id, 'accepted')

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const res = await fetch(`${supabaseUrl}/functions/v1/accept-project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ project_id: inv.project_id, invitation_id: inv.id }),
      })
      const json = await res.json() as { data?: { session_id: string }; error?: string }
      if (json.data?.session_id) {
        navigate(`/speaker/record/${json.data.session_id}`)
        return
      }
    }
    await refetch()
    setResponding(null)
  }

  const handleDecline = async (id: string) => {
    setResponding(id)
    await respond(id, 'declined')
    setResponding(null)
  }

  const statusLabel: Record<string, { label: string; className: string }> = {
    pending: { label: 'En attente', className: 'bg-amber-100 text-amber-700' },
    accepted: { label: 'Acceptée', className: 'bg-secondary-100 text-secondary-700' },
    declined: { label: 'Déclinée', className: 'bg-sand-100 text-sand-500' },
    expired: { label: 'Expirée', className: 'bg-sand-100 text-sand-400' },
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1
        className="text-2xl font-extrabold text-sand-900 dark:text-sand-100 mb-6"
        style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}
      >
        Invitations reçues
      </h1>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
        </div>
      ) : invitations.length === 0 ? (
        <div className="text-center py-16">
          <Mail className="w-10 h-10 text-sand-300 mx-auto mb-3" />
          <p className="text-sand-500 font-semibold">Aucune invitation pour l'instant</p>
          <p className="text-sand-400 text-sm mt-1">Les clients peuvent vous inviter sur leurs projets</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invitations.map(inv => {
            const badge = statusLabel[inv.status] ?? statusLabel['pending']
            const badgeLabel = badge?.label ?? 'En attente'
            const badgeClassName = badge?.className ?? 'bg-amber-100 text-amber-700'
            const isResponding = responding === inv.id

            return (
              <div
                key={inv.id}
                className="bg-white dark:bg-sand-900 rounded-2xl border border-sand-200/70 dark:border-sand-800/70 p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sand-900 dark:text-sand-100 text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
                      {inv.project?.name ?? '—'}
                    </p>
                    <p className="text-xs text-sand-500 mt-0.5">
                      {inv.project?.language_label ?? getLanguageLabel(inv.project?.name ?? '')}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClassName}`}>
                    {badgeLabel}
                  </span>
                </div>

                {inv.project?.rate_per_hour_fcfa != null && inv.project.rate_per_hour_fcfa > 0 && (
                  <p className="text-base font-extrabold text-primary-600 tabular-nums mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                    {new Intl.NumberFormat('fr-SN').format(inv.project.rate_per_hour_fcfa)}{'\u00a0'}FCFA/h
                  </p>
                )}

                {inv.message && (
                  <p className="text-xs text-sand-500 italic mb-3 leading-relaxed bg-sand-50 dark:bg-sand-800 rounded-lg px-3 py-2">
                    « {inv.message} »
                  </p>
                )}

                <p className="text-[11px] text-sand-400 mb-4">
                  Expire le {new Date(inv.expires_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                </p>

                {inv.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDecline(inv.id)}
                      disabled={isResponding}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-sand-200 text-sand-600 text-sm font-semibold hover:bg-sand-50 transition-all disabled:opacity-40"
                    >
                      <X className="w-3.5 h-3.5" />
                      Décliner
                    </button>
                    <button
                      onClick={() => handleAccept(inv)}
                      disabled={isResponding}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-bold shadow-md shadow-primary-500/20 hover:scale-[1.02] transition-all disabled:opacity-40"
                    >
                      {isResponding ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Accepter et commencer
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                )}

                {inv.status === 'accepted' && (
                  <button
                    onClick={() => navigate(`/speaker/projects/${inv.project_id}`)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-secondary-100 text-secondary-700 text-sm font-bold hover:bg-secondary-200 transition-all"
                  >
                    Continuer l'enregistrement
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
