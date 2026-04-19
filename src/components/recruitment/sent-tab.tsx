import { useState } from 'react'
import {
  Loader2, Mail, MoreHorizontal, X, RotateCw, Check, Clock,
  XCircle, Ban,
} from 'lucide-react'
import { useProjectInvitations, type ProjectInvitationWithSpeaker } from '../../hooks/use-project-invitations'
import { useToast } from '../../hooks/use-toast'
import { supabase } from '../../lib/supabase'
import type { InvitationStatus } from '../../types/database'

interface SentTabProps {
  projectId: string
}

const statusMeta: Record<InvitationStatus, {
  label: string
  dotClass: string
  textClass: string
  pulse?: boolean
}> = {
  pending: { label: 'En attente', dotClass: 'bg-amber-500', textClass: 'text-amber-700 dark:text-amber-400', pulse: true },
  accepted: { label: 'Acceptée', dotClass: 'bg-secondary-500', textClass: 'text-secondary-700 dark:text-secondary-400' },
  declined: { label: 'Déclinée', dotClass: 'bg-sand-400', textClass: 'text-sand-500' },
  expired: { label: 'Expirée', dotClass: 'bg-sand-300', textClass: 'text-sand-400' },
  cancelled: { label: 'Annulée', dotClass: 'bg-sand-300 border border-sand-400 border-dashed', textClass: 'text-sand-400' },
}

function relativeTime(iso: string): string {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'à l\'instant'
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `il y a ${days} j`
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function InvitationRow({
  inv, onCancel, onRemind, busyAction,
}: {
  inv: ProjectInvitationWithSpeaker
  onCancel: () => void
  onRemind: () => void
  busyAction: 'cancel' | 'remind' | null
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const meta = statusMeta[inv.status] ?? statusMeta.pending
  const speakerName = inv.speaker?.full_name ?? 'Locuteur'
  const initial = speakerName.trim()[0]?.toUpperCase() ?? '?'

  const remindedRecently = inv.reminded_at
    ? (Date.now() - new Date(inv.reminded_at).getTime()) < 7 * 24 * 60 * 60 * 1000
    : false

  return (
    <div className="relative flex gap-4">
      {/* Timeline dot */}
      <div className="relative shrink-0 w-6 flex justify-center">
        <span
          className={[
            'relative z-10 w-3 h-3 rounded-full ring-4 ring-white dark:ring-sand-900',
            meta.dotClass,
          ].join(' ')}
          aria-hidden
        >
          {meta.pulse && (
            <span className={`absolute inset-0 rounded-full ${meta.dotClass.split(' ')[0]} animate-ping opacity-40`} />
          )}
        </span>
      </div>

      {/* Card */}
      <div className="flex-1 min-w-0 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary-400 to-secondary-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {inv.speaker?.avatar_url
              ? <img src={inv.speaker.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              : initial}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <p
                className="text-sm font-bold text-sand-900 dark:text-sand-100 truncate"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {speakerName}
              </p>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${meta.textClass}`}>
                {meta.label}
              </span>
            </div>
            <p className="text-[11px] text-sand-500 mt-0.5">
              {relativeTime(inv.created_at)}
              {inv.status === 'pending' && inv.expires_at && (
                <>
                  <span className="mx-1.5 text-sand-300">·</span>
                  Expire {relativeTime(inv.expires_at)}
                </>
              )}
              {inv.responded_at && (
                <>
                  <span className="mx-1.5 text-sand-300">·</span>
                  Répondu {relativeTime(inv.responded_at)}
                </>
              )}
            </p>
          </div>

          {/* Actions */}
          {inv.status === 'pending' && (
            <div className="relative shrink-0">
              <button
                onClick={() => setMenuOpen(v => !v)}
                aria-label="Actions"
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-sand-100 dark:hover:bg-sand-800 transition-colors text-sand-400"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 w-44 bg-white dark:bg-sand-800 rounded-xl shadow-lg shadow-sand-900/20 border border-sand-200 dark:border-sand-700 overflow-hidden animate-scale-in">
                    <button
                      onClick={() => { setMenuOpen(false); onRemind() }}
                      disabled={busyAction !== null || remindedRecently}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-sand-700 dark:text-sand-200 hover:bg-sand-50 dark:hover:bg-sand-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {busyAction === 'remind'
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <RotateCw className="w-3.5 h-3.5" />}
                      {remindedRecently ? 'Déjà relancé' : 'Relancer'}
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); onCancel() }}
                      disabled={busyAction !== null}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
                    >
                      {busyAction === 'cancel'
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Ban className="w-3.5 h-3.5" />}
                      Annuler
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {inv.message && (
          <p className="text-xs text-sand-500 italic mt-2 leading-relaxed bg-sand-50 dark:bg-sand-800/40 rounded-lg px-3 py-1.5 border-l-2 border-sand-200 dark:border-sand-700">
            « {inv.message} »
          </p>
        )}
      </div>
    </div>
  )
}

export function SentTab({ projectId }: SentTabProps) {
  const { notify } = useToast()
  const { invitations, loading, refetch } = useProjectInvitations(projectId)
  const [busyMap, setBusyMap] = useState<Record<string, 'cancel' | 'remind' | null>>({})
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'declined' | 'cancelled'>('all')

  const counts = {
    all: invitations.length,
    pending: invitations.filter(i => i.status === 'pending').length,
    accepted: invitations.filter(i => i.status === 'accepted').length,
    declined: invitations.filter(i => i.status === 'declined').length,
    cancelled: invitations.filter(i => i.status === 'cancelled').length,
  }

  const filtered = filter === 'all' ? invitations : invitations.filter(i => i.status === filter)

  const cancel = async (id: string) => {
    setBusyMap(m => ({ ...m, [id]: 'cancel' }))
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch(`${supabaseUrl}/functions/v1/cancel-invitation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ invitation_id: id }),
    })
    const json = await res.json() as { data?: unknown; error?: string }
    setBusyMap(m => ({ ...m, [id]: null }))
    if (json.error) {
      notify({ variant: 'error', title: 'Échec', message: json.error })
    } else {
      notify({ variant: 'success', message: 'Invitation annulée' })
      await refetch()
    }
  }

  const remind = async (id: string) => {
    setBusyMap(m => ({ ...m, [id]: 'remind' }))
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const res = await fetch(`${supabaseUrl}/functions/v1/remind-invitation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ invitation_id: id }),
    })
    const json = await res.json() as { data?: unknown; error?: string }
    setBusyMap(m => ({ ...m, [id]: null }))
    if (json.error) {
      notify({ variant: 'warning', message: json.error })
    } else {
      notify({ variant: 'success', message: 'Rappel envoyé' })
      await refetch()
    }
  }

  const filterTabs: { key: typeof filter; label: string; icon: typeof Clock }[] = [
    { key: 'all', label: 'Toutes', icon: Mail },
    { key: 'pending', label: 'En attente', icon: Clock },
    { key: 'accepted', label: 'Acceptées', icon: Check },
    { key: 'declined', label: 'Déclinées', icon: XCircle },
    { key: 'cancelled', label: 'Annulées', icon: X },
  ]

  return (
    <div>
      {/* Numérotation éditoriale */}
      <div className="flex items-end justify-between mb-5 pb-4 border-b border-sand-200/60 dark:border-sand-800">
        <div>
          <p
            className="text-[56px] leading-none font-extrabold text-sand-300/70 dark:text-sand-800/70 tabular-nums select-none"
            style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.05em' }}
            aria-hidden
          >
            02
          </p>
          <h2
            className="text-xl font-extrabold text-sand-900 dark:text-sand-100 -mt-2"
            style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}
          >
            Invitations envoyées
          </h2>
          <p className="text-xs text-sand-500 mt-1">
            Chronologie des invitations de ce projet, mises à jour en temps réel
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
        {filterTabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={[
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
              filter === key
                ? 'bg-sand-900 dark:bg-sand-100 text-white dark:text-sand-900'
                : 'text-sand-500 hover:text-sand-700 hover:bg-sand-100 dark:hover:bg-sand-800',
            ].join(' ')}
          >
            <Icon className="w-3 h-3" />
            {label}
            <span className="tabular-nums opacity-70">{counts[key]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Mail className="w-10 h-10 text-sand-300 mx-auto mb-3" />
          <p className="text-sand-500 font-semibold text-sm">
            {filter === 'all' ? 'Aucune invitation envoyée' : 'Aucune invitation dans ce statut'}
          </p>
          <p className="text-sand-400 text-xs mt-1">
            {filter === 'all' ? 'Rendez-vous dans « Découvrir » pour commencer' : ''}
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-3 top-2 bottom-2 w-px bg-gradient-to-b from-sand-200 via-sand-200 to-transparent dark:from-sand-700 dark:via-sand-700" aria-hidden />

          <div>
            {filtered.map(inv => (
              <InvitationRow
                key={inv.id}
                inv={inv}
                onCancel={() => cancel(inv.id)}
                onRemind={() => remind(inv.id)}
                busyAction={busyMap[inv.id] ?? null}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
