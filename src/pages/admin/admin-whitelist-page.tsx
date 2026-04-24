import { useMemo, useState } from 'react'
import {
  Loader2, Mail, AlertTriangle, ChevronDown, Plus, X, Trash2, Copy,
  Check, Clock, ShieldCheck, Database, Mic,
} from 'lucide-react'
import { useAllowedEmails, type AllowedEmail } from '../../hooks/use-allowed-emails'
import { useToast } from '../../hooks/use-toast'
import { supabase } from '../../lib/supabase'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

type FilterTab = 'all' | 'unused' | 'used'

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

function isExpired(entry: AllowedEmail): boolean {
  if (!entry.expires_at) return false
  return new Date(entry.expires_at).getTime() < Date.now()
}

const ROLE_META = {
  client: { icon: Database, label: 'Client', color: 'var(--t-fg-2)' },
  speaker: { icon: Mic, label: 'Locuteur', color: 'var(--t-fg-2)' },
  admin: { icon: ShieldCheck, label: 'Admin', color: 'var(--t-accent-text)' },
} as const

export function AdminWhitelistPage() {
  const { list, loading, error, refetch } = useAllowedEmails()
  const { notify } = useToast()
  const [filter, setFilter] = useState<FilterTab>('all')
  const [showAdd, setShowAdd] = useState(false)

  const counts = useMemo(() => ({
    all: list.length,
    unused: list.filter(e => !e.used_at).length,
    used: list.filter(e => !!e.used_at).length,
  }), [list])

  const filtered = useMemo(() => {
    if (filter === 'all') return list
    if (filter === 'unused') return list.filter(e => !e.used_at)
    return list.filter(e => !!e.used_at)
  }, [list, filter])

  return (
    <div className="min-h-screen">
      <header
        className="sticky top-0 z-10 flex items-center gap-3 px-5 lg:px-8 h-[52px] backdrop-blur-md flex-wrap"
        style={{
          background: 'var(--t-topbar-bg)',
          borderBottom: '1px solid var(--t-border-subtle)',
        }}
      >
        <Mail className="w-[13px] h-[13px]" strokeWidth={1.75} style={{ color: 'var(--t-fg-3)' }} />
        <span className="text-[13px]" style={{ ...sans, fontWeight: 510, color: 'var(--t-fg)' }}>
          Whitelist
        </span>
        <span className="text-[11px]" style={{ ...mono, color: 'var(--t-fg-4)' }}>
          {counts.all}
        </span>

        <div className="flex items-center gap-1 ml-2">
          {(['all', 'unused', 'used'] as const).map(k => {
            const active = filter === k
            const labels: Record<typeof k, string> = {
              all: 'Toutes',
              unused: `Libres ${counts.unused}`,
              used: `Inscrites ${counts.used}`,
            }
            return (
              <button
                key={k}
                onClick={() => setFilter(k)}
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

        <button
          onClick={() => setShowAdd(true)}
          className="ml-auto inline-flex items-center gap-1.5 h-[28px] px-3 text-[12px] rounded-md transition-colors"
          style={{
            ...sans,
            fontWeight: 510,
            color: '#ffffff',
            background: 'var(--t-accent)',
            border: '1px solid var(--t-accent)',
          }}
        >
          <Plus className="w-3 h-3" strokeWidth={2} />
          Ajouter manuellement
        </button>
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

      <div
        className="flex items-center gap-2 px-5 lg:px-8 h-[36px]"
        style={{
          borderTop: '1px solid var(--t-border-subtle)',
          background: 'var(--t-section-bg)',
        }}
      >
        <ChevronDown className="w-3 h-3" strokeWidth={2} style={{ color: 'var(--t-fg-3)' }} />
        <span className="text-[12px]" style={{ ...sans, fontWeight: 510, color: 'var(--t-fg)' }}>
          {filtered.length} email{filtered.length > 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--t-fg-3)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState onAdd={() => setShowAdd(true)} />
      ) : (
        <div>
          {filtered.map(entry => (
            <WhitelistRow
              key={entry.email}
              entry={entry}
              onAfterRevoke={refetch}
              notify={notify}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddEmailModal
          onClose={() => setShowAdd(false)}
          onAdded={async () => { await refetch(); setShowAdd(false) }}
          notify={notify}
        />
      )}
    </div>
  )
}

/* ---------- Row ---------- */
function WhitelistRow({
  entry, onAfterRevoke, notify,
}: {
  entry: AllowedEmail
  onAfterRevoke: () => Promise<void>
  notify: (args: { variant?: 'success' | 'error' | 'info'; title?: string; message: string }) => void
}) {
  const [revoking, setRevoking] = useState(false)
  const meta = ROLE_META[entry.role]
  const RoleIcon = meta.icon
  const expired = isExpired(entry)

  const copy = () => {
    navigator.clipboard.writeText(entry.email)
    notify({ variant: 'info', message: 'Email copié' })
  }

  const handleRevoke = async () => {
    if (!confirm(`Révoquer l'accès de ${entry.email} ?`)) return
    setRevoking(true)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setRevoking(false); return }

    const res = await fetch(`${supabaseUrl}/functions/v1/revoke-whitelist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: anonKey,
      },
      body: JSON.stringify({ email: entry.email }),
    })
    const json = await res.json() as { error?: string; data?: { mode: string } }
    setRevoking(false)
    if (json.error) {
      notify({ variant: 'error', title: 'Échec', message: json.error })
      return
    }
    notify({
      variant: 'success',
      message: json.data?.mode === 'expired'
        ? 'Accès révoqué (compte déjà inscrit, expires_at mis dans le passé)'
        : 'Email retiré de la whitelist',
    })
    await onAfterRevoke()
  }

  return (
    <div
      className="flex items-center gap-3 h-[52px] px-5 lg:px-8"
      style={{ borderBottom: '1px solid var(--t-border-subtle)' }}
    >
      <RoleIcon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} style={{ color: meta.color }} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <button onClick={copy} className="text-[13px] truncate hover:opacity-80 text-left" style={{ ...mono, color: 'var(--t-fg)' }}>
            {entry.email}
          </button>
          <Copy className="w-3 h-3 shrink-0 opacity-50" strokeWidth={1.75} style={{ color: 'var(--t-fg-4)' }} />
        </div>
        <p className="text-[11px] truncate" style={{ ...sans, color: 'var(--t-fg-4)' }}>
          {meta.label} · {entry.source} · approuvée {relativeTime(entry.approved_at)}
        </p>
      </div>

      {/* Status badges */}
      {entry.used_at ? (
        <span
          className="hidden sm:inline-flex items-center gap-1 px-2 h-[22px] rounded-full text-[10px] shrink-0"
          style={{
            ...sans,
            fontWeight: 510,
            color: '#10b981',
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.22)',
          }}
        >
          <Check className="w-2.5 h-2.5" strokeWidth={2} />
          Inscrite
        </span>
      ) : expired ? (
        <span
          className="hidden sm:inline-flex items-center gap-1 px-2 h-[22px] rounded-full text-[10px] shrink-0"
          style={{
            ...sans,
            fontWeight: 510,
            color: 'var(--t-fg-4)',
            background: 'var(--t-surface)',
            border: '1px solid var(--t-border)',
          }}
        >
          Expirée
        </span>
      ) : (
        <span
          className="hidden sm:inline-flex items-center gap-1 px-2 h-[22px] rounded-full text-[10px] shrink-0"
          style={{
            ...sans,
            fontWeight: 510,
            color: '#fbbf24',
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.22)',
          }}
        >
          <Clock className="w-2.5 h-2.5" strokeWidth={2} />
          Libre
        </span>
      )}

      <button
        onClick={handleRevoke}
        disabled={revoking || entry.role === 'admin'}
        title={entry.role === 'admin' ? 'Impossible de révoquer un admin via l\'UI' : 'Révoquer'}
        className="w-8 h-8 flex items-center justify-center rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ color: 'var(--t-fg-3)' }}
      >
        {revoking
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />}
      </button>
    </div>
  )
}

/* ---------- Add modal ---------- */
function AddEmailModal({
  onClose, onAdded, notify,
}: {
  onClose: () => void
  onAdded: () => Promise<void>
  notify: (args: { variant?: 'success' | 'error' | 'info'; title?: string; message: string }) => void
}) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'client' | 'speaker' | 'admin'>('client')
  const [expiresInDays, setExpiresInDays] = useState<number | ''>('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async () => {
    setErr(null)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr('Email invalide')
      return
    }
    setSubmitting(true)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setErr('Session expirée'); setSubmitting(false); return }

    const res = await fetch(`${supabaseUrl}/functions/v1/add-to-whitelist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: anonKey,
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        role,
        expires_in_days: typeof expiresInDays === 'number' && expiresInDays > 0 ? expiresInDays : undefined,
      }),
    })
    const json = await res.json() as { error?: string }
    setSubmitting(false)
    if (json.error) {
      setErr(json.error)
      return
    }
    notify({ variant: 'success', message: `${email} ajouté à la whitelist` })
    await onAdded()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up"
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose() }}
    >
      <div
        className="w-full sm:max-w-[440px] max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
        style={{
          background: 'var(--t-bg-panel)',
          border: '1px solid var(--t-border)',
        }}
      >
        <div
          className="sticky top-0 flex items-center justify-between px-5 py-4"
          style={{
            background: 'var(--t-bg-panel)',
            borderBottom: '1px solid var(--t-border-subtle)',
          }}
        >
          <h2 className="text-[16px] m-0" style={{ ...sans, fontWeight: 590, color: 'var(--t-fg)' }}>
            Ajouter à la whitelist
          </h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 flex items-center justify-center rounded-md disabled:opacity-40"
            style={{ color: 'var(--t-fg-3)' }}
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <p className="text-[13px]" style={{ ...sans, color: 'var(--t-fg-3)' }}>
            L'utilisateur pourra créer son compte sur <span style={{ ...mono, color: 'var(--t-fg)' }}>/register</span> avec cet email.
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px]" style={{ ...sans, fontWeight: 510, color: 'var(--t-fg-2)' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="exemple@orange.sn"
              autoFocus
              className="rounded-md px-3 py-2 text-[14px] outline-none"
              style={{
                ...sans,
                color: 'var(--t-fg)',
                background: 'var(--t-surface)',
                border: '1px solid var(--t-border)',
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px]" style={{ ...sans, fontWeight: 510, color: 'var(--t-fg-2)' }}>
              Rôle
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['client', 'speaker', 'admin'] as const).map(r => {
                const active = role === r
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className="text-[12px] h-[34px] rounded-md transition-colors"
                    style={{
                      ...sans,
                      fontWeight: 510,
                      color: active ? 'var(--t-fg)' : 'var(--t-fg-2)',
                      background: active ? 'var(--t-surface-active)' : 'var(--t-surface)',
                      border: `1px solid ${active ? 'var(--t-border-strong)' : 'var(--t-border)'}`,
                    }}
                  >
                    {r === 'client' ? 'Client' : r === 'speaker' ? 'Locuteur' : 'Admin'}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px]" style={{ ...sans, fontWeight: 510, color: 'var(--t-fg-2)' }}>
              Expire dans (jours, optionnel)
            </label>
            <input
              type="number"
              min={1}
              value={expiresInDays}
              onChange={e => {
                const v = e.target.value
                setExpiresInDays(v === '' ? '' : Math.max(1, parseInt(v, 10)))
              }}
              placeholder="Laisse vide pour ne jamais expirer"
              className="rounded-md px-3 py-2 text-[14px] outline-none"
              style={{
                ...sans,
                color: 'var(--t-fg)',
                background: 'var(--t-surface)',
                border: '1px solid var(--t-border)',
              }}
            />
          </div>

          {err && (
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
              <span>{err}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              disabled={submitting}
              className="h-[34px] px-3 text-[13px] rounded-md transition-colors"
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
              onClick={submit}
              disabled={submitting || !email}
              className="inline-flex items-center gap-1.5 h-[34px] px-4 text-[13px] rounded-md transition-colors disabled:opacity-40"
              style={{
                ...sans,
                fontWeight: 590,
                color: '#ffffff',
                background: 'var(--t-accent)',
                border: '1px solid var(--t-accent)',
              }}
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Ajouter
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <div
        className="w-12 h-12 rounded-[10px] flex items-center justify-center mb-5"
        style={{
          background: 'var(--t-surface-2)',
          border: '1px solid var(--t-border)',
        }}
      >
        <Mail className="w-5 h-5" strokeWidth={1.5} style={{ color: 'var(--t-fg-3)' }} />
      </div>
      <h3 className="text-[16px] m-0" style={{ ...sans, fontWeight: 590, color: 'var(--t-fg)' }}>
        Aucun email
      </h3>
      <p className="text-[13px] mt-2 max-w-[320px]" style={{ ...sans, color: 'var(--t-fg-3)' }}>
        Approuvez des demandes ou ajoutez manuellement des emails autorisés à s'inscrire.
      </p>
      <button
        onClick={onAdd}
        className="mt-5 inline-flex items-center gap-1.5 h-[34px] px-3 text-[12px] rounded-md transition-colors"
        style={{
          ...sans,
          fontWeight: 510,
          color: '#ffffff',
          background: 'var(--t-accent)',
          border: '1px solid var(--t-accent)',
        }}
      >
        <Plus className="w-3 h-3" strokeWidth={2} />
        Ajouter manuellement
      </button>
    </div>
  )
}
