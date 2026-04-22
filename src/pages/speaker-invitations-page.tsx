import { useState, useMemo } from 'react'
import { useAuth } from '../hooks/use-auth'
import { useSpeakerInvitations } from '../hooks/use-speaker-invitations'
import { Link } from 'react-router-dom'
import {
  Mail, ChevronRight, ChevronDown, Loader2,
  Circle, CheckCircle2, XCircle, Clock,
} from 'lucide-react'
import type { InvitationStatus } from '../types/database'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

type FilterTab = 'all' | 'pending' | 'accepted' | 'done'

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export function SpeakerInvitationsPage() {
  const { user } = useAuth()
  const { invitations, loading } = useSpeakerInvitations(user?.id)
  const [filter, setFilter] = useState<FilterTab>('all')

  const pendingCount = invitations.filter((i) => i.status === 'pending').length

  const filtered = useMemo(() => {
    if (filter === 'all') return invitations
    if (filter === 'pending') return invitations.filter((i) => i.status === 'pending')
    if (filter === 'accepted') return invitations.filter((i) => i.status === 'accepted')
    return invitations.filter((i) =>
      ['declined', 'expired', 'cancelled'].includes(i.status),
    )
  }, [invitations, filter])

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center gap-3 px-5 lg:px-8 h-[52px] border-b border-[rgba(255,255,255,0.05)] bg-[rgba(8,9,10,0.9)] backdrop-blur-md">
        <Mail className="w-[13px] h-[13px] text-[#8a8f98]" strokeWidth={1.75} />
        <span className="text-[13px] text-[#f7f8f8]" style={{ ...sans, fontWeight: 510 }}>
          Invitations
        </span>
        <span className="text-[11px] text-[#62666d] ml-1" style={mono}>
          {invitations.length}
        </span>

        <div className="flex items-center gap-1 ml-4">
          {(['all', 'pending', 'accepted', 'done'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className="px-2.5 h-[26px] text-[12px] rounded-md transition-colors"
              style={{
                ...sans,
                fontWeight: 510,
                color: filter === k ? '#f7f8f8' : '#8a8f98',
                background: filter === k ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: `1px solid ${filter === k ? 'rgba(255,255,255,0.08)' : 'transparent'}`,
              }}
            >
              {k === 'all' ? 'Toutes' : k === 'pending' ? `En attente${pendingCount > 0 ? ` ${pendingCount}` : ''}` : k === 'accepted' ? 'Acceptées' : 'Terminées'}
            </button>
          ))}
        </div>
      </header>

      {/* Subtitle */}
      <div className="px-5 lg:px-8 py-5">
        {pendingCount > 0 ? (
          <p className="text-[13px] text-[#8a8f98]" style={sans}>
            <span className="text-[#f7f8f8]" style={{ fontWeight: 510 }}>{pendingCount}</span>{' '}
            invitation{pendingCount > 1 ? 's' : ''} en attente de votre réponse
          </p>
        ) : (
          <p className="text-[13px] text-[#8a8f98]" style={sans}>
            Toutes vos invitations reçues, triées par date
          </p>
        )}
      </div>

      {/* Section header */}
      <div className="flex items-center gap-2 px-5 lg:px-8 h-[36px] border-t border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)]">
        <ChevronDown className="w-3 h-3 text-[#8a8f98]" strokeWidth={2} />
        <span className="text-[12px] text-[#f7f8f8]" style={{ ...sans, fontWeight: 510 }}>
          {filter === 'pending' ? 'En attente' : filter === 'accepted' ? 'Acceptées' : filter === 'done' ? 'Terminées' : 'Toutes'}
        </span>
        <span className="text-[11px] text-[#62666d]" style={mono}>
          {filtered.length}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-[#8a8f98]" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          {filtered.map((inv) => (
            <InvitationRow key={inv.id} inv={inv} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- Row ---------- */

type Inv = ReturnType<typeof useSpeakerInvitations>['invitations'][number]

function InvitationRow({ inv }: { inv: Inv }) {
  const status = inv.status as InvitationStatus
  const days = daysUntil(inv.expires_at)
  const isExpiringSoon = status === 'pending' && days <= 3 && days > 0
  const rate = inv.rate_snapshot_fcfa ?? inv.project?.rate_per_hour_fcfa ?? 0

  return (
    <Link
      to={`/speaker/invitations/${inv.id}`}
      className="group flex items-center gap-3 h-[48px] px-5 lg:px-8 border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.025)] transition-colors"
    >
      <StatusIcon status={status} />
      <span
        className="flex-1 min-w-0 truncate text-[13px] text-[#f7f8f8]"
        style={{ ...sans, fontWeight: 510 }}
      >
        {inv.project?.name ?? '—'}
      </span>
      <span className="text-[11px] text-[#8a8f98] hidden md:inline" style={sans}>
        {inv.project?.language_label ?? '—'}
      </span>
      {rate > 0 && (
        <span className="text-[11px] text-[#d0d6e0] tabular-nums" style={mono}>
          {new Intl.NumberFormat('fr-SN').format(rate)} FCFA/h
        </span>
      )}
      {isExpiringSoon && (
        <span
          className="inline-flex items-center gap-1 px-2 h-[20px] rounded-full text-[10px]"
          style={{
            ...sans,
            fontWeight: 510,
            color: '#fbbf24',
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.22)',
          }}
        >
          <Clock className="w-2.5 h-2.5" strokeWidth={2} />
          {days}j
        </span>
      )}
      <span className="text-[11px] text-[#62666d] w-[56px] text-right hidden sm:inline" style={mono}>
        {new Date(status === 'pending' ? inv.expires_at : inv.created_at).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
        })}
      </span>
      <ChevronRight className="w-3.5 h-3.5 text-[#62666d] group-hover:text-[#f7f8f8] group-hover:translate-x-0.5 transition-all" strokeWidth={1.75} />
    </Link>
  )
}

function StatusIcon({ status }: { status: InvitationStatus }) {
  if (status === 'pending') return <Circle className="w-3.5 h-3.5 text-[#fbbf24] shrink-0" strokeWidth={2} />
  if (status === 'accepted') return <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981] shrink-0" strokeWidth={2} />
  if (status === 'declined') return <XCircle className="w-3.5 h-3.5 text-[#8a8f98] shrink-0" strokeWidth={2} />
  return <Circle className="w-3.5 h-3.5 text-[#62666d] shrink-0" strokeWidth={2} />
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <div
        className="w-12 h-12 rounded-[10px] flex items-center justify-center mb-5"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Mail className="w-5 h-5 text-[#8a8f98]" strokeWidth={1.5} />
      </div>
      <h3 className="text-[16px] text-[#f7f8f8] m-0" style={{ ...sans, fontWeight: 590 }}>
        Aucune invitation pour l'instant
      </h3>
      <p className="text-[13px] text-[#8a8f98] mt-2 max-w-[380px]" style={{ ...sans, lineHeight: 1.55 }}>
        Les clients peuvent vous inviter sur leurs projets. Complétez votre profil pour augmenter vos chances.
      </p>
    </div>
  )
}
