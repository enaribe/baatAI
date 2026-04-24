import { useMemo, useState } from 'react'
import {
  Loader2, Inbox, Check, X, Clock, AlertTriangle,
  ChevronDown, Mail, Phone, Building2, MapPin, Users, Mic, Database,
  Calendar, CheckCheck, Copy,
} from 'lucide-react'
import { useAccessRequests, type AccessRequest, type AccessRequestStatus } from '../../hooks/use-access-requests'
import { useToast } from '../../hooks/use-toast'
import { supabase } from '../../lib/supabase'
import { LANGUAGES } from '../../lib/languages'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

type FilterStatus = 'all' | AccessRequestStatus
type FilterRole = 'all' | 'client' | 'speaker'

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

function languageLabels(codes: string[] | null): string {
  if (!codes || codes.length === 0) return '—'
  return codes.map(c => LANGUAGES[c]?.label ?? c).join(', ')
}

const STATUS_META: Record<AccessRequestStatus, { label: string; color: string; bg: string; border: string }> = {
  pending:  { label: 'En attente', color: '#fbbf24', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.22)' },
  approved: { label: 'Approuvée', color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.22)' },
  rejected: { label: 'Rejetée',   color: '#8a8f98', bg: 'rgba(138,143,152,0.06)', border: 'rgba(138,143,152,0.20)' },
  waitlist: { label: 'Liste d\'attente', color: '#7170ff', bg: 'rgba(113,112,255,0.08)', border: 'rgba(113,112,255,0.22)' },
}

export function AdminRequestsPage() {
  const { requests, loading, error, refetch } = useAccessRequests()
  const { notify } = useToast()
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending')
  const [filterRole, setFilterRole] = useState<FilterRole>('all')
  const [selected, setSelected] = useState<AccessRequest | null>(null)

  const counts = useMemo(() => {
    return {
      all: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      waitlist: requests.filter(r => r.status === 'waitlist').length,
    }
  }, [requests])

  const filtered = useMemo(() => {
    return requests.filter(r => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false
      if (filterRole !== 'all' && r.intended_role !== filterRole) return false
      return true
    })
  }, [requests, filterStatus, filterRole])

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header
        className="sticky top-0 z-10 flex items-center gap-3 px-5 lg:px-8 h-[52px] backdrop-blur-md flex-wrap"
        style={{
          background: 'var(--t-topbar-bg)',
          borderBottom: '1px solid var(--t-border-subtle)',
        }}
      >
        <Inbox className="w-[13px] h-[13px]" strokeWidth={1.75} style={{ color: 'var(--t-fg-3)' }} />
        <span className="text-[13px]" style={{ ...sans, fontWeight: 510, color: 'var(--t-fg)' }}>
          Demandes d'accès
        </span>
        <span className="text-[11px]" style={{ ...mono, color: 'var(--t-fg-4)' }}>
          {counts.all}
        </span>

        <div className="flex items-center gap-1 ml-2 flex-wrap">
          {(['pending', 'approved', 'rejected', 'waitlist', 'all'] as const).map(k => {
            const active = filterStatus === k
            const labels: Record<typeof k, string> = {
              pending: `En attente${counts.pending > 0 ? ` ${counts.pending}` : ''}`,
              approved: 'Approuvées',
              rejected: 'Rejetées',
              waitlist: 'Waitlist',
              all: 'Toutes',
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

        <div className="flex items-center gap-1 ml-auto">
          {(['all', 'client', 'speaker'] as const).map(k => {
            const active = filterRole === k
            const labels: Record<typeof k, string> = {
              all: 'Tous rôles',
              client: 'Clients',
              speaker: 'Locuteurs',
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
      </header>

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
        style={{
          borderTop: '1px solid var(--t-border-subtle)',
          background: 'var(--t-section-bg)',
        }}
      >
        <ChevronDown className="w-3 h-3" strokeWidth={2} style={{ color: 'var(--t-fg-3)' }} />
        <span className="text-[12px]" style={{ ...sans, fontWeight: 510, color: 'var(--t-fg)' }}>
          {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--t-fg-3)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          {filtered.map(r => (
            <RequestRow key={r.id} request={r} onClick={() => setSelected(r)} />
          ))}
        </div>
      )}

      {selected && (
        <RequestDetailDrawer
          request={selected}
          onClose={() => setSelected(null)}
          onAfterAction={async () => { await refetch(); setSelected(null) }}
          notify={notify}
        />
      )}
    </div>
  )
}

/* ---------- Row ---------- */
function RequestRow({ request, onClick }: { request: AccessRequest; onClick: () => void }) {
  const meta = STATUS_META[request.status]
  const initial = request.full_name.trim()[0]?.toUpperCase() ?? '?'
  const RoleIcon = request.intended_role === 'client' ? Database : Mic

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 h-[52px] px-5 lg:px-8 transition-colors"
      style={{
        borderBottom: '1px solid var(--t-border-subtle)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--t-surface-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] shrink-0"
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
          {request.full_name}
        </p>
        <p className="text-[11px] truncate" style={{ ...mono, color: 'var(--t-fg-4)' }}>
          {request.email}
        </p>
      </div>
      <span
        className="hidden md:inline-flex items-center gap-1 text-[11px]"
        style={{ ...sans, color: 'var(--t-fg-3)' }}
      >
        <RoleIcon className="w-3 h-3" strokeWidth={1.75} />
        {request.intended_role === 'client' ? 'Client' : 'Locuteur'}
      </span>
      <span className="hidden lg:inline text-[11px] truncate max-w-[160px]" style={{ ...sans, color: 'var(--t-fg-3)' }}>
        {request.intended_role === 'client'
          ? (request.organization ?? '—')
          : (request.speaker_city ?? '—')}
      </span>
      <span
        className="inline-flex items-center gap-1.5 px-2 h-[22px] rounded-full text-[10px] shrink-0"
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
      <span
        className="hidden sm:inline text-[11px] w-[80px] text-right shrink-0"
        style={{ ...mono, color: 'var(--t-fg-4)' }}
      >
        {relativeTime(request.created_at)}
      </span>
    </button>
  )
}

/* ---------- Drawer détail ---------- */
function RequestDetailDrawer({
  request, onClose, onAfterAction, notify,
}: {
  request: AccessRequest
  onClose: () => void
  onAfterAction: () => Promise<void>
  notify: (args: { variant?: 'success' | 'error' | 'info'; title?: string; message: string }) => void
}) {
  const [busy, setBusy] = useState<'approve' | 'reject' | 'waitlist' | null>(null)
  const [adminNotes, setAdminNotes] = useState(request.admin_notes ?? '')
  const [rejectionReason, setRejectionReason] = useState('')
  const [showReject, setShowReject] = useState(false)

  const callFunction = async (fnName: string, body: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { ok: false, error: 'Session expirée' }

    const res = await fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
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

  const handleApprove = async () => {
    setBusy('approve')
    const res = await callFunction('approve-access-request', {
      request_id: request.id,
      admin_notes: adminNotes.trim() || undefined,
    })
    setBusy(null)
    if (!res.ok) {
      notify({ variant: 'error', title: 'Échec', message: res.error ?? 'Erreur inconnue' })
      return
    }
    notify({ variant: 'success', message: 'Demande approuvée. Email ajouté à la whitelist.' })
    await onAfterAction()
  }

  const handleReject = async (asWaitlist: boolean) => {
    setBusy(asWaitlist ? 'waitlist' : 'reject')
    const res = await callFunction('reject-access-request', {
      request_id: request.id,
      status: asWaitlist ? 'waitlist' : 'rejected',
      rejection_reason: rejectionReason.trim() || undefined,
      admin_notes: adminNotes.trim() || undefined,
    })
    setBusy(null)
    if (!res.ok) {
      notify({ variant: 'error', title: 'Échec', message: res.error ?? 'Erreur inconnue' })
      return
    }
    notify({
      variant: 'success',
      message: asWaitlist ? 'Demande mise en liste d\'attente.' : 'Demande rejetée.',
    })
    await onAfterAction()
  }

  const copyEmail = () => {
    navigator.clipboard.writeText(request.email)
    notify({ variant: 'info', message: 'Email copié dans le presse-papier' })
  }

  const isPending = request.status === 'pending' || request.status === 'waitlist'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up"
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose() }}
    >
      <div
        className="w-full sm:max-w-[640px] max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
        style={{
          background: 'var(--t-bg-panel)',
          border: '1px solid var(--t-border)',
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 flex items-center justify-between px-5 py-4"
          style={{
            background: 'var(--t-bg-panel)',
            borderBottom: '1px solid var(--t-border-subtle)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="inline-flex items-center gap-1.5 px-2 h-[22px] rounded-full text-[10px]"
              style={{
                ...sans,
                fontWeight: 510,
                color: STATUS_META[request.status].color,
                background: STATUS_META[request.status].bg,
                border: `1px solid ${STATUS_META[request.status].border}`,
              }}
            >
              {STATUS_META[request.status].label}
            </span>
            <span className="text-[11px]" style={{ ...mono, color: 'var(--t-fg-4)' }}>
              {request.intended_role === 'client' ? 'Client' : 'Locuteur'}
            </span>
          </div>
          <button
            onClick={onClose}
            disabled={!!busy}
            aria-label="Fermer"
            className="w-8 h-8 flex items-center justify-center rounded-md transition-colors disabled:opacity-40"
            style={{ color: 'var(--t-fg-3)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Identité */}
          <div>
            <h2 className="text-[20px] m-0" style={{ ...sans, fontWeight: 590, color: 'var(--t-fg)', letterSpacing: '-0.3px' }}>
              {request.full_name}
            </h2>
            <button
              onClick={copyEmail}
              className="inline-flex items-center gap-1.5 mt-1 text-[12px] hover:opacity-80"
              style={{ ...mono, color: 'var(--t-fg-3)' }}
            >
              <Mail className="w-3 h-3" strokeWidth={1.75} />
              {request.email}
              <Copy className="w-3 h-3" strokeWidth={1.75} />
            </button>
            {request.phone && (
              <p className="text-[12px] mt-1" style={{ ...sans, color: 'var(--t-fg-3)' }}>
                <Phone className="w-3 h-3 inline mr-1" strokeWidth={1.75} />
                {request.phone}
              </p>
            )}
            <p className="text-[11px] mt-2" style={{ ...mono, color: 'var(--t-fg-4)' }}>
              <Calendar className="w-3 h-3 inline mr-1" strokeWidth={1.75} />
              Reçue {relativeTime(request.created_at)}
            </p>
          </div>

          {/* Détails métier */}
          {request.intended_role === 'client' ? (
            <div className="space-y-3">
              {request.organization && (
                <DetailRow icon={<Building2 className="w-3.5 h-3.5" strokeWidth={1.75} />} label="Organisation" value={request.organization} />
              )}
              <DetailRow icon={<Database className="w-3.5 h-3.5" strokeWidth={1.75} />} label="Langues cibles" value={languageLabels(request.target_languages)} />
              {request.expected_volume && (
                <DetailRow icon={<Users className="w-3.5 h-3.5" strokeWidth={1.75} />} label="Volume estimé" value={request.expected_volume} />
              )}
              {request.use_case && (
                <DetailBlock label="Cas d'usage" value={request.use_case} />
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <DetailRow icon={<Mic className="w-3.5 h-3.5" strokeWidth={1.75} />} label="Langues parlées" value={languageLabels(request.speaker_languages)} />
              {request.speaker_city && (
                <DetailRow icon={<MapPin className="w-3.5 h-3.5" strokeWidth={1.75} />} label="Ville" value={request.speaker_city} />
              )}
              {(request.speaker_age_range || request.speaker_gender) && (
                <DetailRow
                  icon={<Users className="w-3.5 h-3.5" strokeWidth={1.75} />}
                  label="Profil"
                  value={[request.speaker_age_range, request.speaker_gender].filter(Boolean).join(' · ')}
                />
              )}
              {request.speaker_motivation && (
                <DetailBlock label="Motivation" value={request.speaker_motivation} />
              )}
            </div>
          )}

          {/* Notes admin */}
          <div>
            <label className="text-[11px] uppercase tracking-[0.04em]" style={{ ...sans, fontWeight: 510, color: 'var(--t-fg-4)' }}>
              Notes internes
            </label>
            <textarea
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              placeholder="Note privée pour ton équipe (visible côté admin uniquement)…"
              rows={2}
              disabled={!isPending}
              className="w-full mt-1.5 rounded-md px-3 py-2 text-[13px] outline-none resize-y"
              style={{
                ...sans,
                color: 'var(--t-fg)',
                background: 'var(--t-surface)',
                border: '1px solid var(--t-border)',
              }}
            />
          </div>

          {/* Si déjà rejetée, afficher la raison */}
          {!isPending && request.rejection_reason && (
            <div
              className="px-3 py-2.5 rounded-md text-[12px]"
              style={{
                ...sans,
                color: 'var(--t-fg-2)',
                background: 'var(--t-surface)',
                border: '1px solid var(--t-border)',
              }}
            >
              <p style={{ fontWeight: 510, color: 'var(--t-fg-3)' }} className="mb-1">Raison du rejet :</p>
              {request.rejection_reason}
            </div>
          )}

          {/* Actions */}
          {isPending && (
            <>
              {showReject ? (
                <div className="space-y-3">
                  <textarea
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    placeholder="Raison du rejet (optionnel, sera communiquée si tu envoies un email)…"
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
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setShowReject(false)}
                      className="h-[34px] px-3 text-[12px] rounded-md transition-colors"
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
                      onClick={() => handleReject(true)}
                      disabled={busy !== null}
                      className="inline-flex items-center gap-1.5 h-[34px] px-3 text-[12px] rounded-md transition-colors disabled:opacity-40"
                      style={{
                        ...sans,
                        fontWeight: 510,
                        color: '#7170ff',
                        background: 'rgba(113,112,255,0.08)',
                        border: '1px solid rgba(113,112,255,0.22)',
                      }}
                    >
                      {busy === 'waitlist' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                      Mettre en waitlist
                    </button>
                    <button
                      onClick={() => handleReject(false)}
                      disabled={busy !== null}
                      className="inline-flex items-center gap-1.5 h-[34px] px-3 text-[12px] rounded-md transition-colors disabled:opacity-40"
                      style={{
                        ...sans,
                        fontWeight: 510,
                        color: 'var(--t-danger-text)',
                        background: 'var(--t-danger-muted-bg)',
                        border: '1px solid var(--t-danger-muted-border)',
                      }}
                    >
                      {busy === 'reject' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                      Rejeter définitivement
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={handleApprove}
                    disabled={busy !== null}
                    className="inline-flex items-center gap-1.5 h-[36px] px-4 text-[13px] rounded-md transition-colors disabled:opacity-40"
                    style={{
                      ...sans,
                      fontWeight: 590,
                      color: '#ffffff',
                      background: 'var(--t-accent)',
                      border: '1px solid var(--t-accent)',
                    }}
                  >
                    {busy === 'approve'
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Check className="w-3.5 h-3.5" strokeWidth={2} />}
                    Approuver
                  </button>
                  <button
                    onClick={() => setShowReject(true)}
                    disabled={busy !== null}
                    className="inline-flex items-center gap-1.5 h-[36px] px-3 text-[13px] rounded-md transition-colors disabled:opacity-40"
                    style={{
                      ...sans,
                      fontWeight: 510,
                      color: 'var(--t-fg-2)',
                      background: 'var(--t-surface)',
                      border: '1px solid var(--t-border)',
                    }}
                  >
                    Rejeter / Waitlist
                  </button>
                </div>
              )}
            </>
          )}

          {/* Si approuvée : message d'instruction */}
          {request.status === 'approved' && (
            <div
              className="px-3 py-2.5 rounded-md text-[12px]"
              style={{
                ...sans,
                color: '#10b981',
                background: 'rgba(16,185,129,0.06)',
                border: '1px solid rgba(16,185,129,0.22)',
              }}
            >
              <p className="flex items-center gap-1.5" style={{ fontWeight: 510 }}>
                <CheckCheck className="w-3.5 h-3.5" />
                Email whitelisté. Envoyez le lien d'inscription manuellement (WhatsApp / email) :
              </p>
              <p className="mt-2 px-2 py-1.5 rounded" style={{ ...mono, background: 'var(--t-surface)', color: 'var(--t-fg)' }}>
                {window.location.origin}/register
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- Helpers UI ---------- */
function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 flex items-center justify-center rounded-md shrink-0 mt-0.5" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border-subtle)', color: 'var(--t-fg-3)' }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-[0.04em]" style={{ ...sans, fontWeight: 510, color: 'var(--t-fg-4)' }}>
          {label}
        </p>
        <p className="text-[13px] mt-0.5" style={{ ...sans, color: 'var(--t-fg)' }}>
          {value}
        </p>
      </div>
    </div>
  )
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.04em] mb-1.5" style={{ ...sans, fontWeight: 510, color: 'var(--t-fg-4)' }}>
        {label}
      </p>
      <div
        className="px-3 py-2.5 rounded-md text-[13px] leading-relaxed whitespace-pre-wrap"
        style={{
          ...sans,
          color: 'var(--t-fg-2)',
          background: 'var(--t-surface)',
          border: '1px solid var(--t-border-subtle)',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <div
        className="w-12 h-12 rounded-[10px] flex items-center justify-center mb-5"
        style={{
          background: 'var(--t-surface-2)',
          border: '1px solid var(--t-border)',
        }}
      >
        <Inbox className="w-5 h-5" strokeWidth={1.5} style={{ color: 'var(--t-fg-3)' }} />
      </div>
      <h3 className="text-[16px] m-0" style={{ ...sans, fontWeight: 590, color: 'var(--t-fg)' }}>
        Aucune demande
      </h3>
      <p className="text-[13px] mt-2 max-w-[320px]" style={{ ...sans, color: 'var(--t-fg-3)' }}>
        Aucune demande ne correspond aux filtres sélectionnés.
      </p>
    </div>
  )
}

