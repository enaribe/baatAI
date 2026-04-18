import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Loader2, Check, X, Wallet, AlertCircle, Clock, Phone } from 'lucide-react'
import type { Withdrawal, Profile, WithdrawalStatus } from '../types/database'

interface WithdrawalWithProfile extends Withdrawal {
  speaker: Pick<Profile, 'full_name'> | null
}

const methodLabels: Record<string, string> = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  free_money: 'Free Money',
  bank: 'Virement bancaire',
}

const statusConfig: Record<WithdrawalStatus, { label: string; className: string }> = {
  pending: { label: 'En attente', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  approved: { label: 'Approuvé', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  paid: { label: 'Payé', className: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-300' },
  rejected: { label: 'Rejeté', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  failed: { label: 'Échoué', className: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
}

export function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<WithdrawalStatus>('pending')
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({})
  const [showRejectInput, setShowRejectInput] = useState<string | null>(null)

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

  useEffect(() => { load() }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  const approve = async (id: string) => {
    setProcessing(id)
    type DbResult = Promise<{ error: { message: string } | null }>
    const { error: err } = await (supabase
      .from('withdrawals')
      .update({ status: 'approved', processed_by: (await supabase.auth.getUser()).data.user?.id ?? null, processed_at: new Date().toISOString() } as unknown as never)
      .eq('id', id) as unknown as DbResult)
    if (err) { setError(err.message); setProcessing(null); return }
    await load()
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
    await load()
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
    await load()
    setProcessing(null)
  }

  const filterTabs: { key: WithdrawalStatus; label: string }[] = [
    { key: 'pending', label: 'En attente' },
    { key: 'approved', label: 'Approuvés' },
    { key: 'paid', label: 'Payés' },
    { key: 'rejected', label: 'Rejetés' },
  ]

  return (
    <div className="max-w-[56rem] mx-auto px-4 py-8">
      <h1
        className="text-2xl font-extrabold text-sand-900 dark:text-sand-100 mb-6"
        style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}
      >
        Gestion des retraits
      </h1>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filterTabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={[
              'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
              filter === key
                ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                : 'bg-white dark:bg-sand-900 border border-sand-200 dark:border-sand-700 text-sand-600 dark:text-sand-400 hover:border-sand-300',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
        </div>
      ) : withdrawals.length === 0 ? (
        <div className="text-center py-16">
          <Wallet className="w-10 h-10 text-sand-300 mx-auto mb-3" />
          <p className="text-sand-500 font-semibold">Aucun retrait dans cette catégorie</p>
        </div>
      ) : (
        <div className="space-y-3">
          {withdrawals.map(w => {
            const cfg = statusConfig[w.status]
            return (
              <div
                key={w.id}
                className="bg-white dark:bg-sand-900 rounded-2xl border border-sand-200/70 dark:border-sand-800/70 p-5"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold text-sand-900 dark:text-sand-100">
                        {w.speaker?.full_name ?? 'Locuteur'}
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.className}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-sand-500">
                      {new Date(w.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold text-sand-900 dark:text-sand-100 tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>
                      {new Intl.NumberFormat('fr-SN').format(w.amount_fcfa)}&nbsp;FCFA
                    </p>
                    <p className="text-xs text-sand-500">{methodLabels[w.method] ?? w.method}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-sand-600 dark:text-sand-400 mb-3">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-mono">{w.destination}</span>
                </div>

                {w.rejection_reason && (
                  <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg mb-3">
                    Motif : {w.rejection_reason}
                  </p>
                )}
                {w.transaction_reference && (
                  <p className="text-xs text-sand-400 mb-3">Réf. : {w.transaction_reference}</p>
                )}

                {/* Input motif rejet */}
                {showRejectInput === w.id && (
                  <div className="mb-3">
                    <input
                      type="text"
                      value={rejectReason[w.id] ?? ''}
                      onChange={e => setRejectReason(r => ({ ...r, [w.id]: e.target.value }))}
                      placeholder="Motif du rejet (optionnel)"
                      className="w-full px-3 py-2 rounded-xl border border-sand-200 dark:border-sand-700 bg-sand-50 dark:bg-sand-800 text-sand-900 dark:text-sand-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    />
                  </div>
                )}

                {/* Actions */}
                {filter === 'pending' && (
                  <div className="flex gap-2">
                    {showRejectInput === w.id ? (
                      <>
                        <button
                          onClick={() => setShowRejectInput(null)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-sand-200 dark:border-sand-700 text-sand-600 dark:text-sand-400 text-xs font-semibold hover:bg-sand-50 transition-all"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={() => reject(w.id)}
                          disabled={processing === w.id}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-all disabled:opacity-40"
                        >
                          {processing === w.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                          Confirmer le rejet
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setShowRejectInput(w.id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                          Rejeter
                        </button>
                        <button
                          onClick={() => approve(w.id)}
                          disabled={processing === w.id}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary-500 hover:bg-secondary-600 text-white text-xs font-semibold transition-all disabled:opacity-40"
                        >
                          {processing === w.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Approuver
                        </button>
                      </>
                    )}
                  </div>
                )}

                {filter === 'approved' && (
                  <button
                    onClick={() => markPaid(w.id)}
                    disabled={processing === w.id}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary-500 hover:bg-secondary-600 text-white text-xs font-semibold transition-all disabled:opacity-40"
                  >
                    {processing === w.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                    Marquer comme payé
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
