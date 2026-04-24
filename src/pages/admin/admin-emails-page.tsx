import { useMemo, useState } from 'react'
import {
  Loader2, Send, AlertTriangle, ChevronDown, Check, X, Clock, RefreshCw,
} from 'lucide-react'
import { useEmailLogs, type EmailLog, type EmailStatus, type EmailTemplate } from '../../hooks/use-email-logs'

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
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

const TEMPLATE_LABELS: Record<EmailTemplate, string> = {
  request_received: 'Demande reçue',
  request_approved: 'Demande approuvée',
  request_rejected: 'Demande rejetée',
  request_waitlist: 'Mise en waitlist',
  account_suspended: 'Compte suspendu',
  account_revoked: 'Compte révoqué',
}

const STATUS_META: Record<EmailStatus, { label: string; color: string; bg: string; border: string; icon: typeof Check }> = {
  pending: { label: 'En cours', color: '#fbbf24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.22)', icon: Clock },
  sent:    { label: 'Envoyé',  color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.22)', icon: Check },
  failed:  { label: 'Échec',   color: '#fca5a5', bg: 'rgba(239,68,68,0.06)',  border: 'rgba(239,68,68,0.22)', icon: X },
}

type FilterStatus = 'all' | EmailStatus

export function AdminEmailsPage() {
  const { logs, loading, error, refetch } = useEmailLogs()
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [selected, setSelected] = useState<EmailLog | null>(null)

  const counts = useMemo(() => ({
    all: logs.length,
    pending: logs.filter(l => l.status === 'pending').length,
    sent: logs.filter(l => l.status === 'sent').length,
    failed: logs.filter(l => l.status === 'failed').length,
  }), [logs])

  const filtered = useMemo(() => {
    if (filterStatus === 'all') return logs
    return logs.filter(l => l.status === filterStatus)
  }, [logs, filterStatus])

  return (
    <div className="min-h-screen">
      <header
        className="sticky top-0 z-10 flex items-center gap-3 px-5 lg:px-8 h-[52px] backdrop-blur-md flex-wrap"
        style={{
          background: 'var(--t-topbar-bg)',
          borderBottom: '1px solid var(--t-border-subtle)',
        }}
      >
        <Send className="w-[13px] h-[13px]" strokeWidth={1.75} style={{ color: 'var(--t-fg-3)' }} />
        <span className="text-[13px]" style={{ ...sans, fontWeight: 510, color: 'var(--t-fg)' }}>
          Emails envoyés
        </span>
        <span className="text-[11px]" style={{ ...mono, color: 'var(--t-fg-4)' }}>
          {counts.all}
        </span>

        <div className="flex items-center gap-1 ml-2 flex-wrap">
          {(['all', 'sent', 'pending', 'failed'] as const).map(k => {
            const active = filterStatus === k
            const labels: Record<typeof k, string> = {
              all: `Tous`,
              sent: `Envoyés ${counts.sent || ''}`.trim(),
              pending: `En cours ${counts.pending || ''}`.trim(),
              failed: `Échec ${counts.failed || ''}`.trim(),
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

        <button
          onClick={() => { void refetch() }}
          className="ml-auto inline-flex items-center gap-1.5 h-[28px] px-3 text-[12px] rounded-md transition-colors"
          style={{
            ...sans,
            fontWeight: 510,
            color: 'var(--t-fg-2)',
            background: 'var(--t-surface)',
            border: '1px solid var(--t-border)',
          }}
        >
          <RefreshCw className="w-3 h-3" strokeWidth={1.75} />
          Rafraîchir
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
        <EmptyState />
      ) : (
        <div>
          {filtered.map(log => (
            <EmailRow key={log.id} log={log} onClick={() => setSelected(log)} />
          ))}
        </div>
      )}

      {selected && <EmailDetailDrawer log={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function EmailRow({ log, onClick }: { log: EmailLog; onClick: () => void }) {
  const meta = STATUS_META[log.status]
  const StatusIcon = meta.icon

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 h-[52px] px-5 lg:px-8 transition-colors"
      style={{ borderBottom: '1px solid var(--t-border-subtle)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--t-surface-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <StatusIcon
        className="w-3.5 h-3.5 shrink-0"
        strokeWidth={1.75}
        style={{ color: meta.color }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] truncate" style={{ ...sans, fontWeight: 510, color: 'var(--t-fg)' }}>
          {log.subject}
        </p>
        <p className="text-[11px] truncate" style={{ ...mono, color: 'var(--t-fg-4)' }}>
          → {log.recipient_email}
        </p>
      </div>
      <span className="hidden md:inline text-[11px]" style={{ ...sans, color: 'var(--t-fg-3)' }}>
        {TEMPLATE_LABELS[log.template] ?? log.template}
      </span>
      <span
        className="inline-flex items-center px-2 h-[22px] rounded-full text-[10px] shrink-0"
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
      <span className="hidden sm:inline text-[11px] w-[80px] text-right shrink-0" style={{ ...mono, color: 'var(--t-fg-4)' }}>
        {relativeTime(log.created_at)}
      </span>
    </button>
  )
}

function EmailDetailDrawer({ log, onClose }: { log: EmailLog; onClose: () => void }) {
  const meta = STATUS_META[log.status]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full sm:max-w-[560px] max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl"
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
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center px-2 h-[22px] rounded-full text-[10px]"
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
            <span className="text-[11px]" style={{ ...mono, color: 'var(--t-fg-4)' }}>
              {TEMPLATE_LABELS[log.template] ?? log.template}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md"
            style={{ color: 'var(--t-fg-3)' }}
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.04em]" style={{ ...sans, fontWeight: 510, color: 'var(--t-fg-4)' }}>
              Sujet
            </p>
            <p className="text-[15px] mt-1" style={{ ...sans, color: 'var(--t-fg)' }}>
              {log.subject}
            </p>
          </div>

          <Row label="Destinataire" value={log.recipient_email} mono />
          <Row label="Créé" value={new Date(log.created_at).toLocaleString('fr-FR')} mono />
          {log.sent_at && (
            <Row label="Envoyé" value={new Date(log.sent_at).toLocaleString('fr-FR')} mono />
          )}
          {log.resend_message_id && (
            <Row label="Resend ID" value={log.resend_message_id} mono />
          )}
          <Row label="Tentatives" value={String(log.attempts)} />

          {log.error_message && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.04em] mb-1" style={{ ...sans, fontWeight: 510, color: 'var(--t-fg-4)' }}>
                Erreur
              </p>
              <div
                className="px-3 py-2.5 rounded-md text-[12px] whitespace-pre-wrap"
                style={{
                  ...sans,
                  color: 'var(--t-danger-text)',
                  background: 'var(--t-danger-muted-bg)',
                  border: '1px solid var(--t-danger-muted-border)',
                }}
              >
                {log.error_message}
              </div>
            </div>
          )}

          {log.payload && Object.keys(log.payload).length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.04em] mb-1" style={{ ...sans, fontWeight: 510, color: 'var(--t-fg-4)' }}>
                Variables du template
              </p>
              <pre
                className="px-3 py-2.5 rounded-md text-[11px] overflow-x-auto"
                style={{
                  ...mono,
                  color: 'var(--t-fg-2)',
                  background: 'var(--t-surface)',
                  border: '1px solid var(--t-border-subtle)',
                }}
              >
                {JSON.stringify(log.payload, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, mono: isMono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-md"
      style={{ background: 'var(--t-surface)', border: '1px solid var(--t-border-subtle)' }}
    >
      <span className="text-[12px]" style={{ ...sans, color: 'var(--t-fg-3)' }}>{label}</span>
      <span className="ml-auto text-[12px] truncate"
        style={isMono
          ? { ...mono, color: 'var(--t-fg)' }
          : { ...sans, fontWeight: 510, color: 'var(--t-fg)' }}
      >
        {value}
      </span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <div
        className="w-12 h-12 rounded-[10px] flex items-center justify-center mb-5"
        style={{ background: 'var(--t-surface-2)', border: '1px solid var(--t-border)' }}
      >
        <Send className="w-5 h-5" strokeWidth={1.5} style={{ color: 'var(--t-fg-3)' }} />
      </div>
      <h3 className="text-[16px] m-0" style={{ ...sans, fontWeight: 590, color: 'var(--t-fg)' }}>
        Aucun email envoyé
      </h3>
      <p className="text-[13px] mt-2 max-w-[320px]" style={{ ...sans, color: 'var(--t-fg-3)' }}>
        Les emails apparaîtront ici dès qu'une demande sera traitée.
      </p>
    </div>
  )
}
