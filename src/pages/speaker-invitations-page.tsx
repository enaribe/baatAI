import { useAuth } from '../hooks/use-auth'
import { useSpeakerInvitations } from '../hooks/use-speaker-invitations'
import { Link } from 'react-router-dom'
import { Loader2, Mail, ChevronRight, Clock, Check, X } from 'lucide-react'
import { getLanguageLabel } from '../lib/languages'
import type { InvitationStatus } from '../types/database'

const statusLabel: Record<InvitationStatus, { label: string; className: string }> = {
  pending: { label: 'En attente', className: 'bg-amber-100 text-amber-700' },
  accepted: { label: 'Acceptée', className: 'bg-secondary-100 text-secondary-700' },
  declined: { label: 'Déclinée', className: 'bg-sand-100 text-sand-500' },
  expired: { label: 'Expirée', className: 'bg-sand-100 text-sand-400' },
  cancelled: { label: 'Annulée', className: 'bg-sand-100 text-sand-400' },
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export function SpeakerInvitationsPage() {
  const { user } = useAuth()
  const { invitations, loading } = useSpeakerInvitations(user?.id)

  const pendingCount = invitations.filter(i => i.status === 'pending').length

  return (
    <div className="max-w-[42rem] mx-auto px-4 py-8">
      <div className="mb-6">
        <h1
          className="text-2xl font-extrabold text-sand-900 dark:text-sand-100"
          style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}
        >
          Invitations reçues
        </h1>
        {pendingCount > 0 && (
          <p className="text-sm text-sand-500 mt-1">
            <span className="font-semibold text-primary-600">{pendingCount}</span> en attente de votre réponse
          </p>
        )}
      </div>

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
            const badge = statusLabel[inv.status] ?? statusLabel.pending
            const days = daysUntil(inv.expires_at)
            const isExpiringSoon = inv.status === 'pending' && days <= 3 && days > 0
            const rate = inv.rate_snapshot_fcfa ?? inv.project?.rate_per_hour_fcfa ?? 0

            return (
              <Link
                key={inv.id}
                to={`/speaker/invitations/${inv.id}`}
                className="block bg-white dark:bg-sand-900 rounded-2xl border border-sand-200/70 dark:border-sand-800/70 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sand-900 dark:text-sand-100 text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
                      {inv.project?.name ?? '—'}
                    </p>
                    <p className="text-xs text-sand-500 mt-0.5">
                      {inv.project?.language_label ?? getLanguageLabel(inv.project?.name ?? '')}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>

                {rate > 0 && (
                  <p className="text-sm font-extrabold text-primary-600 tabular-nums mb-2">
                    {new Intl.NumberFormat('fr-SN').format(rate)} FCFA/h
                  </p>
                )}

                {isExpiringSoon && (
                  <p className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full mb-2">
                    <Clock className="w-3 h-3" />
                    Expire dans {days} j
                  </p>
                )}

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-sand-400">
                    {inv.status === 'accepted' && <Check className="w-3 h-3 text-secondary-500" />}
                    {inv.status === 'declined' && <X className="w-3 h-3" />}
                    {inv.status === 'pending'
                      ? `Expire le ${new Date(inv.expires_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
                      : `Reçue le ${new Date(inv.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`}
                  </div>
                  <ChevronRight className="w-4 h-4 text-sand-300" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
