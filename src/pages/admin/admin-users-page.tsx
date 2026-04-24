import { useMemo, useState } from 'react'
import {
  Loader2, Users, Search, ChevronDown, AlertTriangle, Database, Mic,
  ShieldCheck, X, Ban, RotateCcw, Trash2, Calendar, Mail, Phone, MapPin,
  Wallet, FolderOpen, CheckCircle2, AlertCircle, Building2,
} from 'lucide-react'
import {
  useAdminUsers, type AdminUserRow, type AdminUserRole, type AdminUserStatus,
} from '../../hooks/use-admin-users'
import { useAdminUserDetail } from '../../hooks/use-admin-user-detail'
import { useToast } from '../../hooks/use-toast'
import { supabase } from '../../lib/supabase'
import { LANGUAGES } from '../../lib/languages'
import { useAuth } from '../../hooks/use-auth'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

function relativeTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'à l\'instant'
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `il y a ${days} j`
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

const fcfa = (n: number) => new Intl.NumberFormat('fr-SN').format(n)

const ROLE_META: Record<AdminUserRole, { icon: typeof Database; label: string; color: string }> = {
  client:  { icon: Database, label: 'Client', color: 'var(--t-fg-2)' },
  speaker: { icon: Mic, label: 'Locuteur', color: 'var(--t-fg-2)' },
  admin:   { icon: ShieldCheck, label: 'Admin', color: 'var(--t-accent-text)' },
}

const STATUS_META: Record<AdminUserStatus, { label: string; color: string; bg: string; border: string }> = {
  active:    { label: 'Actif', color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.22)' },
  suspended: { label: 'Suspendu', color: '#fbbf24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.22)' },
  revoked:   { label: 'Révoqué', color: '#fca5a5', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.22)' },
}

export function AdminUsersPage() {
  const [filterRole, setFilterRole] = useState<AdminUserRole | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<AdminUserStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filters = useMemo(() => ({ role: filterRole, status: filterStatus, search }), [filterRole, filterStatus, search])
  const { users, loading, error, refetch } = useAdminUsers(filters)

  const counts = useMemo(() => ({
    all: users.length,
    clients: users.filter(u => u.role === 'client').length,
    speakers: users.filter(u => u.role === 'speaker').length,
    admins: users.filter(u => u.role === 'admin').length,
    active: users.filter(u => u.status === 'active').length,
    suspended: users.filter(u => u.status === 'suspended').length,
    revoked: users.filter(u => u.status === 'revoked').length,
  }), [users])

  return (
    <div className="min-h-screen">
      <header
        className="sticky top-0 z-10 flex items-center gap-3 px-5 lg:px-8 h-[52px] backdrop-blur-md flex-wrap"
        style={{
          background: 'var(--t-topbar-bg)',
          borderBottom: '1px solid var(--t-border-subtle)',
        }}
      >
        <Users className="w-[13px] h-[13px]" strokeWidth={1.75} style={{ color: 'var(--t-fg-3)' }} />
        <span className="text-[13px]" style={{ ...sans, fontWeight: 510, color: 'var(--t-fg)' }}>
          Utilisateurs
        </span>
        <span className="text-[11px]" style={{ ...mono, color: 'var(--t-fg-4)' }}>
          {users.length}
        </span>

        <div className="flex items-center gap-1 ml-2 flex-wrap">
          {(['all', 'client', 'speaker', 'admin'] as const).map(k => {
            const active = filterRole === k
            const labels: Record<typeof k, string> = {
              all: `Tous ${counts.all}`,
              client: `Clients ${counts.clients}`,
              speaker: `Locuteurs ${counts.speakers}`,
              admin: `Admins ${counts.admins}`,
            }
            return (
              <button
                key={k}
                onClick={() => setFilterRole(k)}
                className="px-2.5 h-[26px] text-[12px] rounded-md transition-colors"
                style={{
                  ...sans,
                  fontWeight: 510,
                  color: active ? 'var(--t-fg)' : 'var(--t-fg-3)',
                  background: active ? 'var(--t-surface-active)' : 'transparent',
                  border: `1px solid ${active ? 'var(--t-border-strong)' : 'transparent'}`,
                }}
              >
                {labels[k]}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          {(['all', 'active', 'suspended', 'revoked'] as const).map(k => {
            const active = filterStatus === k
            const labels: Record<typeof k, string> = {
              all: 'Tous statuts',
              active: 'Actifs',
              suspended: `Suspendus ${counts.suspended || ''}`.trim(),
              revoked: `Révoqués ${counts.revoked || ''}`.trim(),
            }
            return (
              <button
                key={k}
                onClick={() => setFilterStatus(k)}
                className="px-2.5 h-[26px] text-[12px] rounded-md transition-colors"
                style={{
                  ...sans,
                  fontWeight: 510,
                  color: active ? 'var(--t-fg)' : 'var(--t-fg-3)',
                  background: active ? 'var(--t-surface-active)' : 'transparent',
                  border: `1px solid ${active ? 'var(--t-border-strong)' : 'transparent'}`,
                }}
              >
                {labels[k]}
              </button>
            )
          })}
        </div>
      </header>

      {/* Search bar */}
      <div className="px-5 lg:px-8 py-3" style={{ borderBottom: '1px solid var(--t-border-subtle)' }}>
        <div className="relative max-w-[480px]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
            strokeWidth={1.75}
            style={{ color: 'var(--t-fg-4)' }}
          />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, email ou organisation…"
            className="w-full pl-9 pr-3 h-[34px] rounded-md text-[13px] outline-none"
            style={{
              ...sans,
              color: 'var(--t-fg)',
              background: 'var(--t-surface)',
              border: '1px solid var(--t-border)',
            }}
          />
        </div>
      </div>

      {error && (
        <div
          className="mx-5 lg:mx-8 mt-4 flex items-start gap-2 px-3 py-2.5 rounded-md text-[12px]"
          style={{
            ...sans,
            color: 'var(--t-danger-text)',
            border: '1px solid var(--t-danger-muted-border)',
            background: 'var(--t-danger-muted-bg)',
          }}
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Section header */}
      <div
        className="flex items-center gap-2 px-5 lg:px-8 h-[36px]"
        style={{ background: 'var(--t-section-bg)' }}
      >
        <ChevronDown className="w-3 h-3" strokeWidth={2} style={{ color: 'var(--t-fg-3)' }} />
        <span className="text-[12px]" style={{ ...sans, fontWeight: 510, color: 'var(--t-fg)' }}>
          {users.length} résultat{users.length > 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--t-fg-3)' }} />
        </div>
      ) : users.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          {users.map(u => (
            <UserRow key={u.id} user={u} onClick={() => setSelectedId(u.id)} />
          ))}
        </div>
      )}

      {selectedId && (
        <UserDetailDrawer
          userId={selectedId}
          onClose={() => setSelectedId(null)}
          onAfterAction={async () => { await refetch(); setSelectedId(null) }}
        />
      )}
    </div>
  )
}

/* ---------- Row ---------- */
function UserRow({ user, onClick }: { user: AdminUserRow; onClick: () => void }) {
  const meta = ROLE_META[user.role]
  const statusMeta = STATUS_META[user.status]
  const RoleIcon = meta.icon
  const initial = (user.full_name?.trim() || user.email)[0]?.toUpperCase() ?? '?'

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 h-[56px] px-5 lg:px-8 transition-colors"
      style={{ borderBottom: '1px solid var(--t-border-subtle)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--t-surface-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] shrink-0"
        style={{
          background: 'var(--t-surface-2)',
          color: 'var(--t-fg)',
          fontWeight: 590,
        }}
      >
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] truncate" style={{ ...sans, fontWeight: 510, color: 'var(--t-fg)' }}>
          {user.full_name || '—'}
        </p>
        <p className="text-[11px] truncate" style={{ ...mono, color: 'var(--t-fg-4)' }}>
          {user.email}
        </p>
      </div>

      <span
        className="hidden md:inline-flex items-center gap-1 text-[11px]"
        style={{ ...sans, color: meta.color }}
      >
        <RoleIcon className="w-3 h-3" strokeWidth={1.75} />
        {meta.label}
      </span>

      {user.role === 'client' && (
        <span className="hidden lg:inline text-[11px] tabular-nums" style={{ ...mono, color: 'var(--t-fg-3)' }}>
          {user.projects_count} projet{user.projects_count > 1 ? 's' : ''}
        </span>
      )}
      {user.role === 'speaker' && (
        <span className="hidden lg:inline text-[11px] tabular-nums" style={{ ...mono, color: 'var(--t-fg-3)' }}>
          {user.recordings_count} rec · {fcfa(user.wallet_balance_fcfa)} FCFA
        </span>
      )}

      <span
        className="inline-flex items-center gap-1.5 px-2 h-[22px] rounded-full text-[10px] shrink-0"
        style={{
          ...sans,
          fontWeight: 510,
          color: statusMeta.color,
          background: statusMeta.bg,
          border: `1px solid ${statusMeta.border}`,
        }}
      >
        {statusMeta.label}
      </span>
      <span
        className="hidden sm:inline text-[11px] w-[80px] text-right shrink-0"
        style={{ ...mono, color: 'var(--t-fg-4)' }}
      >
        {relativeTime(user.created_at)}
      </span>
    </button>
  )
}

/* ---------- Drawer détail ---------- */
function UserDetailDrawer({
  userId, onClose, onAfterAction,
}: {
  userId: string
  onClose: () => void
  onAfterAction: () => Promise<void>
}) {
  const { user: currentUser } = useAuth()
  const { detail, loading, error } = useAdminUserDetail(userId)
  const { notify } = useToast()
  const [busy, setBusy] = useState<'suspend' | 'reactivate' | 'revoke' | null>(null)
  const [showSuspendForm, setShowSuspendForm] = useState(false)
  const [showRevokeForm, setShowRevokeForm] = useState(false)
  const [reason, setReason] = useState('')
  const [revokeConfirm, setRevokeConfirm] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  const isSelf = currentUser?.id === userId

  const callFn = async (fn: string, body: Record<string, unknown>) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { ok: false, error: 'Session expirée' }
    const res = await fetch(`${supabaseUrl}/functions/v1/${fn}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: anonKey,
      },
      body: JSON.stringify(body),
    })
    const json = await res.json() as { error?: string }
    if (json.error || !res.ok) return { ok: false, error: json.error ?? `HTTP ${res.status}` }
    return { ok: true }
  }

  const handleSuspend = async () => {
    setBusy('suspend')
    setActionError(null)
    const res = await callFn('suspend-account', { user_id: userId, reason: reason.trim() || undefined })
    setBusy(null)
    if (!res.ok) { setActionError(res.error ?? 'Erreur'); return }
    notify({ variant: 'success', message: 'Compte suspendu. L\'utilisateur a été déconnecté.' })
    await onAfterAction()
  }

  const handleReactivate = async () => {
    setBusy('reactivate')
    setActionError(null)
    const res = await callFn('reactivate-account', { user_id: userId })
    setBusy(null)
    if (!res.ok) { setActionError(res.error ?? 'Erreur'); return }
    notify({ variant: 'success', message: 'Compte réactivé.' })
    await onAfterAction()
  }

  const handleRevoke = async () => {
    setBusy('revoke')
    setActionError(null)
    const res = await callFn('revoke-account', {
      user_id: userId,
      reason: reason.trim() || undefined,
      confirm: revokeConfirm,
    })
    setBusy(null)
    if (!res.ok) { setActionError(res.error ?? 'Erreur'); return }
    notify({ variant: 'success', message: 'Compte révoqué définitivement.' })
    await onAfterAction()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up"
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose() }}
    >
      <div
        className="w-full sm:max-w-[680px] max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
        style={{
          background: 'var(--t-bg-panel)',
          border: '1px solid var(--t-border)',
        }}
      >
        <div
          className="sticky top-0 flex items-center justify-between px-5 py-4 z-10"
          style={{
            background: 'var(--t-bg-panel)',
            borderBottom: '1px solid var(--t-border-subtle)',
          }}
        >
          <h2 className="text-[16px] m-0" style={{ ...sans, fontWeight: 590, color: 'var(--t-fg)' }}>
            Détail utilisateur
          </h2>
          <button
            onClick={onClose}
            disabled={!!busy}
            className="w-8 h-8 flex items-center justify-center rounded-md disabled:opacity-40"
            style={{ color: 'var(--t-fg-3)' }}
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading || !detail ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--t-fg-3)' }} />
          </div>
        ) : error ? (
          <div className="p-5">
            <div
              className="flex items-start gap-2 px-3 py-2.5 rounded-md text-[12px]"
              style={{
                ...sans,
                color: 'var(--t-danger-text)',
                border: '1px solid var(--t-danger-muted-border)',
                background: 'var(--t-danger-muted-bg)',
              }}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          </div>
        ) : (
          <div className="px-5 py-5 space-y-5">
            {/* Identité */}
            <div className="flex items-start gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-[14px] shrink-0"
                style={{
                  background: 'var(--t-surface-2)',
                  color: 'var(--t-fg)',
                  fontWeight: 590,
                }}
              >
                {(detail.full_name?.trim() || detail.email)[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  className="text-[20px] m-0 truncate"
                  style={{ ...sans, fontWeight: 590, color: 'var(--t-fg)', letterSpacing: '-0.3px' }}
                >
                  {detail.full_name || '—'}
                  {isSelf && (
                    <span className="ml-2 text-[11px] align-middle" style={{ ...mono, color: 'var(--t-fg-4)' }}>
                      (vous)
                    </span>
                  )}
                </h3>
                <p className="text-[12px] mt-0.5 truncate" style={{ ...mono, color: 'var(--t-fg-3)' }}>
                  {detail.email}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <RoleBadge role={detail.role} />
                  <StatusBadge status={detail.status} />
                </div>
              </div>
            </div>

            {/* Suspension info */}
            {detail.status !== 'active' && detail.suspended_reason && (
              <div
                className="px-3 py-2.5 rounded-md text-[12px]"
                style={{
                  ...sans,
                  color: 'var(--t-fg-2)',
                  background: 'var(--t-surface)',
                  border: '1px solid var(--t-border)',
                }}
              >
                <p style={{ fontWeight: 510, color: 'var(--t-fg-3)' }} className="mb-1">
                  Raison : {detail.status === 'suspended' ? 'Suspendu' : 'Révoqué'}
                  {detail.suspended_at && ` le ${new Date(detail.suspended_at).toLocaleDateString('fr-FR')}`}
                  {detail.suspended_by_name && ` par ${detail.suspended_by_name}`}
                </p>
                {detail.suspended_reason}
              </div>
            )}

            {/* Métadonnées */}
            <Section title="Compte">
              <Row icon={<Calendar className="w-3.5 h-3.5" strokeWidth={1.75} />} label="Inscription" value={relativeTime(detail.created_at)} />
              <Row icon={<Calendar className="w-3.5 h-3.5" strokeWidth={1.75} />} label="Dernière connexion" value={relativeTime(detail.last_sign_in_at)} />
              {detail.organization && (
                <Row icon={<Building2 className="w-3.5 h-3.5" strokeWidth={1.75} />} label="Organisation" value={detail.organization} />
              )}
              <Row
                icon={<Mail className="w-3.5 h-3.5" strokeWidth={1.75} />}
                label="Email"
                value={detail.email_confirmed_at ? 'Confirmé' : 'Non confirmé'}
                valueColor={detail.email_confirmed_at ? '#10b981' : '#fbbf24'}
              />
            </Section>

            {/* Speaker info */}
            {detail.speaker && (
              <Section title="Profil locuteur">
                {detail.speaker.phone && (
                  <Row icon={<Phone className="w-3.5 h-3.5" strokeWidth={1.75} />} label="Téléphone" value={detail.speaker.phone} />
                )}
                {detail.speaker.city && (
                  <Row icon={<MapPin className="w-3.5 h-3.5" strokeWidth={1.75} />} label="Ville" value={detail.speaker.city} />
                )}
                {detail.speaker.languages && detail.speaker.languages.length > 0 && (
                  <Row
                    icon={<Mic className="w-3.5 h-3.5" strokeWidth={1.75} />}
                    label="Langues"
                    value={detail.speaker.languages.map(c => LANGUAGES[c]?.label ?? c).join(', ')}
                  />
                )}
                <Row
                  icon={<Wallet className="w-3.5 h-3.5" strokeWidth={1.75} />}
                  label="Solde wallet"
                  value={`${fcfa(detail.speaker.wallet_balance_fcfa)} FCFA`}
                  valueColor={detail.speaker.wallet_balance_fcfa > 0 ? '#10b981' : undefined}
                />
                <Row
                  icon={detail.speaker.is_certified ? <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.75} /> : <AlertCircle className="w-3.5 h-3.5" strokeWidth={1.75} />}
                  label="Certification"
                  value={detail.speaker.is_certified ? 'Certifié' : 'Non certifié'}
                  valueColor={detail.speaker.is_certified ? '#10b981' : 'var(--t-fg-3)'}
                />
              </Section>
            )}

            {/* Stats */}
            <Section title="Activité">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {detail.role === 'client' || detail.role === 'admin' ? (
                  <>
                    <StatBlock icon={<FolderOpen className="w-3.5 h-3.5" strokeWidth={1.75} />} label="Projets" value={detail.stats.projects_total} hint={`${detail.stats.projects_active} actif${detail.stats.projects_active > 1 ? 's' : ''}`} />
                    <StatBlock icon={<CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.75} />} label="Terminés" value={detail.stats.projects_completed} />
                  </>
                ) : null}
                {detail.role === 'speaker' && (
                  <>
                    <StatBlock icon={<Mic className="w-3.5 h-3.5" strokeWidth={1.75} />} label="Recordings" value={detail.stats.recordings_total} />
                    <StatBlock icon={<CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.75} />} label="Validés" value={detail.stats.recordings_valid} hint={`${detail.stats.recordings_invalid} rejeté${detail.stats.recordings_invalid > 1 ? 's' : ''}`} />
                    <StatBlock icon={<Mail className="w-3.5 h-3.5" strokeWidth={1.75} />} label="Invitations" value={detail.stats.invitations_received} hint={`${detail.stats.invitations_accepted} acceptée${detail.stats.invitations_accepted > 1 ? 's' : ''}`} />
                    <StatBlock icon={<Wallet className="w-3.5 h-3.5" strokeWidth={1.75} />} label="Retraits payés" value={`${fcfa(detail.stats.total_paid_fcfa)} FCFA`} hint={detail.stats.withdrawals_pending > 0 ? `${detail.stats.withdrawals_pending} en attente` : undefined} />
                  </>
                )}
              </div>
            </Section>

            {/* Action error */}
            {actionError && (
              <div
                className="flex items-start gap-2 px-3 py-2.5 rounded-md text-[12px]"
                style={{
                  ...sans,
                  color: 'var(--t-danger-text)',
                  border: '1px solid var(--t-danger-muted-border)',
                  background: 'var(--t-danger-muted-bg)',
                }}
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Actions */}
            {!isSelf && detail.role !== 'admin' && (
              <Section title="Actions">
                {showSuspendForm && (
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-[0.04em]" style={{ ...sans, fontWeight: 510, color: 'var(--t-fg-4)' }}>
                      Raison de suspension (visible côté admin)
                    </label>
                    <textarea
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="Ex: Comportement non conforme, abus signalé…"
                      rows={2}
                      autoFocus
                      className="w-full rounded-md px-3 py-2 text-[13px] outline-none resize-y"
                      style={{
                        ...sans,
                        color: 'var(--t-fg)',
                        background: 'var(--t-surface)',
                        border: '1px solid var(--t-border)',
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowSuspendForm(false); setReason(''); setActionError(null) }}
                        className="h-[32px] px-3 text-[12px] rounded-md transition-colors"
                        style={{
                          ...sans,
                          fontWeight: 510,
                          color: 'var(--t-fg-2)',
                          background: 'var(--t-surface)',
                          border: '1px solid var(--t-border)',
                        }}
                      >
                        Annuler
                      </button>
                      <button
                        onClick={handleSuspend}
                        disabled={busy !== null}
                        className="inline-flex items-center gap-1.5 h-[32px] px-3 text-[12px] rounded-md transition-colors disabled:opacity-40"
                        style={{
                          ...sans,
                          fontWeight: 510,
                          color: '#fbbf24',
                          background: 'rgba(245,158,11,0.08)',
                          border: '1px solid rgba(245,158,11,0.22)',
                        }}
                      >
                        {busy === 'suspend' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                        Confirmer la suspension
                      </button>
                    </div>
                  </div>
                )}

                {showRevokeForm && (
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-[0.04em]" style={{ ...sans, fontWeight: 510, color: 'var(--t-fg-4)' }}>
                      Raison de la révocation (irréversible)
                    </label>
                    <textarea
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="Pourquoi révoquer ce compte définitivement ?"
                      rows={2}
                      className="w-full rounded-md px-3 py-2 text-[13px] outline-none resize-y"
                      style={{
                        ...sans,
                        color: 'var(--t-fg)',
                        background: 'var(--t-surface)',
                        border: '1px solid var(--t-border)',
                      }}
                    />
                    <label className="text-[11px] uppercase tracking-[0.04em]" style={{ ...sans, fontWeight: 510, color: 'var(--t-fg-4)' }}>
                      Tapez <span style={{ ...mono, color: 'var(--t-danger-text)' }}>REVOQUER</span> pour confirmer
                    </label>
                    <input
                      type="text"
                      value={revokeConfirm}
                      onChange={e => setRevokeConfirm(e.target.value)}
                      placeholder="REVOQUER"
                      className="w-full rounded-md px-3 py-2 text-[13px] outline-none uppercase"
                      style={{
                        ...mono,
                        color: 'var(--t-fg)',
                        background: 'var(--t-surface)',
                        border: '1px solid var(--t-border)',
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowRevokeForm(false); setReason(''); setRevokeConfirm(''); setActionError(null) }}
                        className="h-[32px] px-3 text-[12px] rounded-md transition-colors"
                        style={{
                          ...sans,
                          fontWeight: 510,
                          color: 'var(--t-fg-2)',
                          background: 'var(--t-surface)',
                          border: '1px solid var(--t-border)',
                        }}
                      >
                        Annuler
                      </button>
                      <button
                        onClick={handleRevoke}
                        disabled={busy !== null || revokeConfirm !== 'REVOQUER'}
                        className="inline-flex items-center gap-1.5 h-[32px] px-3 text-[12px] rounded-md transition-colors disabled:opacity-40"
                        style={{
                          ...sans,
                          fontWeight: 510,
                          color: 'var(--t-danger-text)',
                          background: 'var(--t-danger-muted-bg)',
                          border: '1px solid var(--t-danger-muted-border)',
                        }}
                      >
                        {busy === 'revoke' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        Révoquer définitivement
                      </button>
                    </div>
                  </div>
                )}

                {!showSuspendForm && !showRevokeForm && (
                  <div className="flex flex-wrap gap-2">
                    {detail.status === 'active' && (
                      <button
                        onClick={() => setShowSuspendForm(true)}
                        className="inline-flex items-center gap-1.5 h-[34px] px-3 text-[12px] rounded-md transition-colors"
                        style={{
                          ...sans,
                          fontWeight: 510,
                          color: '#fbbf24',
                          background: 'rgba(245,158,11,0.08)',
                          border: '1px solid rgba(245,158,11,0.22)',
                        }}
                      >
                        <Ban className="w-3.5 h-3.5" strokeWidth={1.75} />
                        Suspendre
                      </button>
                    )}
                    {detail.status === 'suspended' && (
                      <button
                        onClick={handleReactivate}
                        disabled={busy !== null}
                        className="inline-flex items-center gap-1.5 h-[34px] px-3 text-[12px] rounded-md transition-colors disabled:opacity-40"
                        style={{
                          ...sans,
                          fontWeight: 510,
                          color: '#10b981',
                          background: 'rgba(16,185,129,0.08)',
                          border: '1px solid rgba(16,185,129,0.22)',
                        }}
                      >
                        {busy === 'reactivate' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />}
                        Réactiver
                      </button>
                    )}
                    {detail.status !== 'revoked' && (
                      <button
                        onClick={() => setShowRevokeForm(true)}
                        className="inline-flex items-center gap-1.5 h-[34px] px-3 text-[12px] rounded-md transition-colors"
                        style={{
                          ...sans,
                          fontWeight: 510,
                          color: 'var(--t-danger-text)',
                          background: 'var(--t-danger-muted-bg)',
                          border: '1px solid var(--t-danger-muted-border)',
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                        Révoquer
                      </button>
                    )}
                  </div>
                )}
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------- Helpers UI ---------- */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p
        className="text-[10px] uppercase tracking-[0.08em] mb-2"
        style={{ ...mono, color: 'var(--t-fg-4)' }}
      >
        {title}
      </p>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  )
}

function Row({
  icon, label, value, valueColor,
}: {
  icon: React.ReactNode
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2 rounded-md"
      style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border-subtle)' }}
    >
      <span style={{ color: 'var(--t-fg-3)' }}>{icon}</span>
      <span className="text-[12px]" style={{ ...sans, color: 'var(--t-fg-3)' }}>{label}</span>
      <span className="ml-auto text-[12px]" style={{ ...sans, fontWeight: 510, color: valueColor ?? 'var(--t-fg)' }}>
        {value}
      </span>
    </div>
  )
}

function StatBlock({
  icon, label, value, hint,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  hint?: string
}) {
  return (
    <div
      className="p-3 rounded-md"
      style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border-subtle)' }}
    >
      <div className="flex items-center gap-1.5">
        <span style={{ color: 'var(--t-fg-3)' }}>{icon}</span>
        <span className="text-[10px] uppercase tracking-[0.04em]" style={{ ...sans, fontWeight: 510, color: 'var(--t-fg-3)' }}>
          {label}
        </span>
      </div>
      <p className="text-[18px] mt-1 tabular-nums" style={{ ...sans, fontWeight: 510, color: 'var(--t-fg)', lineHeight: 1.1 }}>
        {value}
      </p>
      {hint && (
        <p className="text-[10px] mt-0.5" style={{ ...sans, color: 'var(--t-fg-4)' }}>
          {hint}
        </p>
      )}
    </div>
  )
}

function RoleBadge({ role }: { role: AdminUserRole }) {
  const meta = ROLE_META[role]
  const Icon = meta.icon
  return (
    <span
      className="inline-flex items-center gap-1 px-2 h-[20px] rounded-full text-[10px]"
      style={{
        ...sans,
        fontWeight: 510,
        color: meta.color,
        background: 'var(--t-surface)',
        border: '1px solid var(--t-border)',
      }}
    >
      <Icon className="w-2.5 h-2.5" strokeWidth={1.75} />
      {meta.label}
    </span>
  )
}

function StatusBadge({ status }: { status: AdminUserStatus }) {
  const meta = STATUS_META[status]
  return (
    <span
      className="inline-flex items-center px-2 h-[20px] rounded-full text-[10px]"
      style={{
        ...sans,
        fontWeight: 510,
        color: meta.color,
        background: meta.bg,
        border: `1px solid ${meta.border}`,
      }}
    >
      {meta.label}
    </span>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <div
        className="w-12 h-12 rounded-[10px] flex items-center justify-center mb-5"
        style={{ background: 'var(--t-surface-2)', border: '1px solid var(--t-border)' }}
      >
        <Users className="w-5 h-5" strokeWidth={1.5} style={{ color: 'var(--t-fg-3)' }} />
      </div>
      <h3 className="text-[16px] m-0" style={{ ...sans, fontWeight: 590, color: 'var(--t-fg)' }}>
        Aucun utilisateur
      </h3>
      <p className="text-[13px] mt-2 max-w-[320px]" style={{ ...sans, color: 'var(--t-fg-3)' }}>
        Aucun utilisateur ne correspond aux filtres sélectionnés.
      </p>
    </div>
  )
}
