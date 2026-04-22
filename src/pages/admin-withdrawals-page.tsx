import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  Loader2, Check, X, Wallet, AlertCircle, ChevronDown,
} from 'lucide-react'
import type { Withdrawal, Profile, WithdrawalStatus } from '../types/database'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

interface WithdrawalWithProfile extends Withdrawal {
  speaker: Pick<Profile, 'full_name'> | null
}

const methodLabels: Record<string, string> = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  free_money: 'Free Money',
  bank: 'Virement',
}

export function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<WithdrawalStatus>('pending')
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({})
  const [showRejectInput, setShowRejectInput] = useState<string | null>(null)
  const [counts, setCounts] = useState<Record<WithdrawalStatus, number>>({
    pending: 0, approved: 0, paid: 0, rejected: 0, failed: 0,
  })

  const load = async () => {
    setLoading(true)
    type Row = WithdrawalWithProfile
    const { data, error: err } = await (supabase
      .from('withdrawals')
      .select('*, speaker:profiles(full_name)')
      .eq('status', filter)
      .order('created_at', { ascending: false }) as unknown as Promise<{ data: Row[] | null; error: { message: string } | null }>)
    if (err) setError(err.message)
    setWithdrawals(data ?? [])
    setLoading(false)
  }

  const loadCounts = async () => {
    const statuses: WithdrawalStatus[] = ['pending', 'approved', 'paid', 'rejected']
    const results = await Promise.all(
      statuses.map(async (s) => {
        const { count } = await (supabase
          .from('withdrawals')
          .select('id', { count: 'exact', head: true })
          .eq('status', s) as unknown as Promise<{ count: number | null }>)
        return [s, count ?? 0] as const
      }),
    )
    setCounts((c) => ({ ...c, ...Object.fromEntries(results) }))
  }

  useEffect(() => { load(); loadCounts() }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  const approve = async (id: string) => {
    setProcessing(id)
    type DbResult = Promise<{ error: { message: string } | null }>
    const { error: err } = await (supabase
      .from('withdrawals')
      .update({
        status: 'approved',
        processed_by: (await supabase.auth.getUser()).data.user?.id ?? null,
        processed_at: new Date().toISOString(),
      } as unknown as never)
      .eq('id', id) as unknown as DbResult)
    if (err) { setError(err.message); setProcessing(null); return }
    await load(); await loadCounts()
    setProcessing(null)
  }

  const markPaid = async (id: string) => {
    setProcessing(id)
    type DbResult = Promise<{ error: { message: string } | null }>
    const { error: err } = await (supabase
      .from('withdrawals')
      .update({ status: 'paid', processed_at: new Date().toISOString() } as unknown as never)
      .eq('id', id) as unknown as DbResult)
    if (err) { setError(err.message); setProcessing(null); return }
    await load(); await loadCounts()
    setProcessing(null)
  }

  const reject = async (id: string) => {
    setProcessing(id)
    type DbResult = Promise<{ error: { message: string } | null }>
    const { error: err } = await (supabase
      .from('withdrawals')
      .update({
        status: 'rejected',
        rejection_reason: rejectReason[id] || null,
        processed_by: (await supabase.auth.getUser()).data.user?.id ?? null,
        processed_at: new Date().toISOString(),
      } as unknown as never)
      .eq('id', id) as unknown as DbResult)
    if (err) { setError(err.message); setProcessing(null); return }
    setShowRejectInput(null)
    await load(); await loadCounts()
    setProcessing(null)
  }

  const tabs: { key: WithdrawalStatus; label: string }[] = [
    { key: 'pending', label: 'En attente' },
    { key: 'approved', label: 'Approuvés' },
    { key: 'paid', label: 'Payés' },
    { key: 'rejected', label: 'Rejetés' },
  ]

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center gap-3 px-5 lg:px-8 h-[52px] border-b border-[rgba(255,255,255,0.05)] bg-[rgba(8,9,10,0.9)] backdrop-blur-md">
        <Wallet className="w-[13px] h-[13px] text-[#8a8f98]" strokeWidth={1.75} />
        <span className="text-[13px] text-[#f7f8f8]" style={{ ...sans, fontWeight: 510 }}>
          Retraits
        </span>

        <div className="flex items-center gap-1 ml-4 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className="inline-flex items-center gap-1.5 px-2.5 h-[26px] text-[12px] rounded-md transition-colors whitespace-nowrap"
              style={{
                ...sans,
                fontWeight: 510,
                color: filter === t.key ? 'var(--t-fg)' : 'var(--t-fg-3)',
                background: filter === t.key ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: `1px solid ${filter === t.key ? 'rgba(255,255,255,0.08)' : 'transparent'}`,
              }}
            >
              {t.label}
              <span className="text-[10px] text-[#62666d] tabular-nums" style={mono}>
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>
      </header>

      {/* Stats row */}
      <div className="px-5 lg:px-8 py-5 flex items-center gap-6 flex-wrap">
        <Stat label="en attente" value={String(counts.pending)} color="var(--t-warning)" />
        <StatSep />
        <Stat label="approuvés" value={String(counts.approved)} color="var(--t-accent-text)" />
        <StatSep />
        <Stat label="payés" value={String(counts.paid)} color="var(--t-success)" />
        <StatSep />
        <Stat label="rejetés" value={String(counts.rejected)} color="#8a8f98" />
      </div>

      {error && (
        <div
          className="mx-5 lg:mx-8 mb-3 flex items-start gap-2 px-3 py-2.5 rounded-md text-[12px] text-[#fca5a5] border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.06)]"
          style={sans}
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Section header */}
      <div className="flex items-center gap-2 px-5 lg:px-8 h-[36px] border-t border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)]">
        <ChevronDown className="w-3 h-3 text-[#8a8f98]" strokeWidth={2} />
        <span className="text-[12px] text-[#f7f8f8]" style={{ ...sans, fontWeight: 510 }}>
          {tabs.find((t) => t.key === filter)?.label}
        </span>
        <span className="text-[11px] text-[#62666d]" style={mono}>
          {withdrawals.length}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-[#8a8f98]" />
        </div>
      ) : withdrawals.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          {withdrawals.map((w) => (
            <Row
              key={w.id}
              w={w}
              isRejecting={showRejectInput === w.id}
              rejectReason={rejectReason[w.id] ?? ''}
              onChangeRejectReason={(v) => setRejectReason((r) => ({ ...r, [w.id]: v }))}
              processing={processing === w.id}
              onApprove={() => approve(w.id)}
              onMarkPaid={() => markPaid(w.id)}
              onReject={() => reject(w.id)}
              onStartReject={() => setShowRejectInput(w.id)}
              onCancelReject={() => setShowRejectInput(null)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- Row ---------- */

function Row({
  w, isRejecting, rejectReason, onChangeRejectReason, processing,
  onApprove, onMarkPaid, onReject, onStartReject, onCancelReject,
}: {
  w: WithdrawalWithProfile
  isRejecting: boolean
  rejectReason: string
  onChangeRejectReason: (v: string) => void
  processing: boolean
  onApprove: () => void
  onMarkPaid: () => void
  onReject: () => void
  onStartReject: () => void
  onCancelReject: () => void
}) {
  const initials = (w.speaker?.full_name ?? '?')
    .split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
  const code = `WD-${w.id.slice(0, 4).toUpperCase()}`

  return (
    <div className="border-b border-[rgba(255,255,255,0.04)]">
      <div className="flex items-center gap-3 h-[52px] px-5 lg:px-8 hover:bg-[rgba(255,255,255,0.025)] transition-colors">
        <span className="text-[11px] text-[#62666d] w-[80px] shrink-0" style={mono}>
          {code}
        </span>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[#f7f8f8] text-[10px] shrink-0"
          style={{ background: 'var(--t-fg-5)', ...sans, fontWeight: 590 }}
        >
          {initials}
        </div>
        <span
          className="flex-1 min-w-0 truncate text-[13px] text-[#f7f8f8]"
          style={{ ...sans, fontWeight: 510 }}
        >
          {w.speaker?.full_name ?? 'Locuteur'}
        </span>
        <span className="text-[11px] text-[#8a8f98] hidden md:inline" style={sans}>
          {methodLabels[w.method] ?? w.method}
        </span>
        <span className="text-[11px] text-[#62666d] truncate max-w-[120px] hidden md:inline" style={mono}>
          {w.destination}
        </span>
        <span
          className="text-[13px] text-[#f7f8f8] tabular-nums"
          style={{ ...mono, fontWeight: 510 }}
        >
          {new Intl.NumberFormat('fr-SN').format(w.amount_fcfa)} FCFA
        </span>
        <span className="text-[11px] text-[#62666d] w-[56px] text-right hidden sm:inline" style={mono}>
          {new Date(w.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
        </span>

        {w.status === 'pending' && !isRejecting && (
          <div className="flex items-center gap-1.5 ml-2">
            <button
              onClick={onStartReject}
              className="inline-flex items-center gap-1 h-[26px] px-2 text-[11px] rounded-md transition-colors"
              style={{
                ...sans,
                fontWeight: 510,
                color: 'var(--t-danger-text)',
                background: 'var(--t-danger-muted-bg)',
                border: '1px solid var(--t-danger-muted-border)',
              }}
            >
              <X className="w-3 h-3" strokeWidth={1.75} />
              Rejeter
            </button>
            <button
              onClick={onApprove}
              disabled={processing}
              className="inline-flex items-center gap-1 h-[26px] px-2 text-[11px] rounded-md transition-colors disabled:opacity-40"
              style={{
                ...sans,
                fontWeight: 510,
                color: '#ffffff',
                background: '#5e6ad2',
              }}
            >
              {processing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" strokeWidth={2} />}
              Approuver
            </button>
          </div>
        )}
        {w.status === 'approved' && (
          <button
            onClick={onMarkPaid}
            disabled={processing}
            className="inline-flex items-center gap-1 h-[26px] px-2 text-[11px] rounded-md transition-colors disabled:opacity-40 ml-2"
            style={{
              ...sans,
              fontWeight: 510,
              color: 'var(--t-success)',
              background: 'var(--t-success-muted-bg)',
              border: '1px solid var(--t-success-muted-border)',
            }}
          >
            {processing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" strokeWidth={2} />}
            Marquer payé
          </button>
        )}
      </div>

      {/* Motif rejet inline */}
      {w.status === 'pending' && isRejecting && (
        <div
          className="px-5 lg:px-8 py-3 border-t border-[rgba(255,255,255,0.05)]"
          style={{ background: 'var(--t-danger-muted-bg)' }}
        >
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => onChangeRejectReason(e.target.value)}
              placeholder="Motif du rejet (optionnel)"
              className="flex-1 h-[30px] px-3 text-[12px] text-[#f7f8f8] placeholder:text-[#62666d] rounded-md bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[rgba(239,68,68,0.4)]"
              style={sans}
            />
            <button
              onClick={onCancelReject}
              className="h-[30px] px-2.5 text-[11px] text-[#8a8f98] hover:text-[#f7f8f8] rounded-md hover:bg-[rgba(255,255,255,0.04)] transition-colors"
              style={{ ...sans, fontWeight: 510 }}
            >
              Annuler
            </button>
            <button
              onClick={onReject}
              disabled={processing}
              className="inline-flex items-center gap-1 h-[30px] px-2.5 text-[11px] rounded-md transition-colors disabled:opacity-40"
              style={{
                ...sans,
                fontWeight: 510,
                color: 'var(--t-fg)',
                background: '#ef4444',
              }}
            >
              {processing ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" strokeWidth={2} />}
              Confirmer le rejet
            </button>
          </div>
        </div>
      )}

      {/* Motif rejet persistent */}
      {w.status === 'rejected' && w.rejection_reason && (
        <p className="px-5 lg:px-8 py-2 text-[11px] text-[#8a8f98] italic" style={sans}>
          Motif : {w.rejection_reason}
        </p>
      )}
      {w.status === 'paid' && w.transaction_reference && (
        <p className="px-5 lg:px-8 py-2 text-[11px] text-[#62666d]" style={mono}>
          Réf. {w.transaction_reference}
        </p>
      )}
    </div>
  )
}

/* ---------- Helpers ---------- */

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className="text-[15px] tabular-nums"
        style={{ ...sans, fontWeight: 590, color }}
      >
        {value}
      </span>
      <span className="text-[12px] text-[#62666d]" style={sans}>
        {label}
      </span>
    </div>
  )
}

function StatSep() {
  return <span className="w-px h-3 bg-[rgba(255,255,255,0.08)]" />
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
        <Wallet className="w-5 h-5 text-[#8a8f98]" strokeWidth={1.5} />
      </div>
      <p className="text-[14px] text-[#f7f8f8] m-0" style={{ ...sans, fontWeight: 590 }}>
        Aucun retrait dans cette catégorie
      </p>
    </div>
  )
}
