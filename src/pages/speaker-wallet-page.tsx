import { useState } from 'react'
import { useAuth } from '../hooks/use-auth'
import { useWallet } from '../hooks/use-wallet'
import { useCountUp } from '../hooks/use-count-up'
import {
  Wallet, ArrowUpRight, Loader2, AlertCircle, Check, X,
  TrendingUp, TrendingDown, Gift, ArrowDownLeft, Minus,
} from 'lucide-react'
import type { WithdrawalMethod, WalletTransactionType } from '../types/database'

const sans = { fontFamily: 'var(--font-body)', fontFeatureSettings: "'cv01','ss03'" }
const mono = { fontFamily: 'var(--font-mono)' }

const TX_TYPE_LABELS: Record<WalletTransactionType, string> = {
  recording_validated: 'Enregistrement validé',
  validation_reward: 'Validation croisée',
  bonus: 'Bonus',
  withdrawal_request: 'Demande de retrait',
  withdrawal_paid: 'Retrait confirmé',
  withdrawal_refund: 'Remboursement',
}

const TX_ICON: Record<WalletTransactionType, React.ReactNode> = {
  recording_validated: <TrendingUp className="w-3 h-3 text-[#10b981]" strokeWidth={2} />,
  validation_reward: <Check className="w-3 h-3 text-[#10b981]" strokeWidth={2} />,
  bonus: <Gift className="w-3 h-3 text-[#7170ff]" strokeWidth={2} />,
  withdrawal_request: <ArrowUpRight className="w-3 h-3 text-[#fbbf24]" strokeWidth={2} />,
  withdrawal_paid: <ArrowDownLeft className="w-3 h-3 text-[#8a8f98]" strokeWidth={2} />,
  withdrawal_refund: <TrendingDown className="w-3 h-3 text-[#8a8f98]" strokeWidth={2} />,
}

export function SpeakerWalletPage() {
  const { user } = useAuth()
  const { transactions, balance, loading, requestWithdrawal, refetch } = useWallet(user?.id)
  const animatedBalance = useCountUp(balance)

  const [showWithdraw, setShowWithdraw] = useState(false)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<WithdrawalMethod>('wave')
  const [destination, setDestination] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [success, setSuccess] = useState(false)

  const handleWithdraw = async () => {
    setErr('')
    const n = parseInt(amount, 10)
    if (isNaN(n) || n < 5000) {
      setErr('Montant minimum : 5 000 FCFA')
      return
    }
    if (!destination.trim()) {
      setErr('Entrez votre numéro ou IBAN')
      return
    }
    setBusy(true)
    const { error } = await requestWithdrawal(n, method, destination)
    setBusy(false)
    if (error) {
      setErr(error)
      return
    }
    setSuccess(true)
    setShowWithdraw(false)
    setAmount('')
    setDestination('')
    await refetch()
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center gap-3 px-5 lg:px-8 h-[52px] border-b border-[rgba(255,255,255,0.05)] bg-[rgba(8,9,10,0.9)] backdrop-blur-md">
        <Wallet className="w-[13px] h-[13px] text-[#8a8f98]" strokeWidth={1.75} />
        <span className="text-[13px] text-[#f7f8f8]" style={{ ...sans, fontWeight: 510 }}>
          Portefeuille
        </span>
      </header>

      <div className="max-w-[720px] mx-auto px-5 lg:px-8 py-8">
        {/* Balance hero */}
        <div
          className="rounded-[12px] p-7"
          style={{
            background: 'radial-gradient(ellipse at 20% 10%, rgba(255,255,255,0.05), transparent 60%), #0f1011',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <p
            className="text-[11px] text-[#62666d] uppercase"
            style={{ ...sans, fontWeight: 510, letterSpacing: '0.08em' }}
          >
            Solde disponible
          </p>
          <div className="flex items-end gap-3 mt-2">
            <p
              className="text-[40px] sm:text-[48px] text-[#f7f8f8] tabular-nums leading-none"
              style={{ ...sans, fontWeight: 510, letterSpacing: '-1.056px' }}
            >
              {new Intl.NumberFormat('fr-SN').format(animatedBalance)}
            </p>
            <span className="text-[18px] text-[#8a8f98] pb-1" style={{ ...sans, fontWeight: 510 }}>
              FCFA
            </span>
          </div>

          <div className="mt-5 flex items-center gap-6 flex-wrap">
            <div>
              <p className="text-[11px] text-[#62666d]" style={sans}>Total gagné</p>
              <p className="text-[14px] text-[#f7f8f8] tabular-nums mt-0.5" style={{ ...mono, fontWeight: 510 }}>
                —
              </p>
            </div>
            <div className="w-px h-8 bg-[rgba(255,255,255,0.08)]" />
            <div>
              <p className="text-[11px] text-[#62666d]" style={sans}>Total retiré</p>
              <p className="text-[14px] text-[#f7f8f8] tabular-nums mt-0.5" style={{ ...mono, fontWeight: 510 }}>
                —
              </p>
            </div>
            <button
              onClick={() => { setShowWithdraw(true); setSuccess(false) }}
              disabled={balance < 5000}
              className="ml-auto inline-flex items-center gap-1.5 h-[32px] px-3.5 text-[13px] rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                ...sans,
                fontWeight: 510,
                color: '#f7f8f8',
                background: '#5e6ad2',
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) e.currentTarget.style.background = '#6b77dd'
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.disabled) e.currentTarget.style.background = '#5e6ad2'
              }}
            >
              <ArrowUpRight className="w-[13px] h-[13px]" strokeWidth={1.75} />
              Retirer
            </button>
          </div>
        </div>

        {/* Succès */}
        {success && (
          <div
            className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-md text-[12px]"
            style={{
              ...sans,
              color: '#86efac',
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.2)',
            }}
          >
            <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
            Demande soumise. L'équipe vous paiera dans les 48h.
          </div>
        )}

        {/* Form retrait */}
        {showWithdraw && (
          <div
            className="mt-4 p-5 rounded-[10px]"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] text-[#f7f8f8]" style={{ ...sans, fontWeight: 510 }}>
                Demande de retrait
              </p>
              <button
                onClick={() => setShowWithdraw(false)}
                className="w-6 h-6 flex items-center justify-center rounded-sm text-[#8a8f98] hover:text-[#f7f8f8] hover:bg-[rgba(255,255,255,0.04)]"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            </div>

            {err && (
              <div className="flex items-start gap-2 px-3 py-2 mb-3 rounded-md text-[12px] text-[#fca5a5] border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.06)]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{err}</span>
              </div>
            )}

            <div className="flex flex-col gap-3.5">
              <div>
                <label className="block text-[12px] text-[#d0d6e0] mb-1.5" style={{ ...sans, fontWeight: 510 }}>
                  Montant
                </label>
                <div
                  className="relative rounded-md"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min={5000}
                    step={500}
                    placeholder="5000"
                    className="w-full h-[36px] px-3 pr-16 text-[14px] bg-transparent border-0 outline-none text-[#f7f8f8] tabular-nums"
                    style={{ ...sans }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[#62666d]" style={mono}>
                    FCFA
                  </span>
                </div>
                <p className="text-[11px] text-[#62666d] mt-1.5" style={sans}>
                  Minimum 5 000 FCFA · Disponible : {new Intl.NumberFormat('fr-SN').format(balance)} FCFA
                </p>
              </div>

              <div>
                <label className="block text-[12px] text-[#d0d6e0] mb-1.5" style={{ ...sans, fontWeight: 510 }}>
                  Méthode
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      ['wave', 'Wave'],
                      ['orange_money', 'Orange Money'],
                      ['free_money', 'Free Money'],
                      ['bank', 'Virement'],
                    ] as [WithdrawalMethod, string][]
                  ).map(([m, lbl]) => {
                    const on = method === m
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMethod(m)}
                        className="h-[32px] text-[12px] rounded-md transition-colors"
                        style={{
                          ...sans,
                          fontWeight: 510,
                          color: on ? '#f7f8f8' : '#d0d6e0',
                          background: on ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${on ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)'}`,
                        }}
                      >
                        {lbl}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[12px] text-[#d0d6e0] mb-1.5" style={{ ...sans, fontWeight: 510 }}>
                  {method === 'bank' ? 'IBAN' : 'Numéro de téléphone'}
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder={method === 'bank' ? 'SN28…' : '+221 77 000 00 00'}
                  className="w-full h-[36px] px-3 text-[14px] text-[#f7f8f8] placeholder:text-[#62666d] rounded-md bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.08)] focus:outline-none focus:border-[rgba(255,255,255,0.22)]"
                  style={sans}
                />
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setShowWithdraw(false)}
                  className="h-[34px] px-3 text-[13px] rounded-md text-[#d0d6e0] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                  style={{ ...sans, fontWeight: 510 }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={busy}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 h-[34px] px-3 text-[13px] rounded-md transition-colors disabled:opacity-40"
                  style={{
                    ...sans,
                    fontWeight: 510,
                    color: '#f7f8f8',
                    background: '#5e6ad2',
                  }}
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.75} />}
                  Confirmer le retrait
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Historique */}
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[13px] text-[#f7f8f8]" style={{ ...sans, fontWeight: 510 }}>
              Transactions récentes
            </span>
            <span className="text-[11px] text-[#62666d]" style={mono}>
              {transactions.length}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-[#8a8f98]" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-[13px] text-[#62666d]" style={sans}>
              Aucune transaction pour l'instant
            </div>
          ) : (
            <div
              className="rounded-[8px]"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              {transactions.map((tx, idx) => (
                <TxRow key={tx.id} tx={tx} last={idx === transactions.length - 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- TxRow ---------- */

function TxRow({
  tx, last,
}: {
  tx: ReturnType<typeof useWallet>['transactions'][number]
  last: boolean
}) {
  const type = tx.type as WalletTransactionType
  const label = TX_TYPE_LABELS[type] ?? type
  const icon = TX_ICON[type] ?? <Minus className="w-3 h-3 text-[#8a8f98]" strokeWidth={2} />
  const amount = tx.amount_fcfa
  const isNegative = amount < 0
  const sign = amount > 0 ? '+' : ''

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 text-[13px]"
      style={{
        ...sans,
        borderBottom: last ? 'none' : '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <span className="w-7 h-7 flex items-center justify-center rounded-md shrink-0"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-[#f7f8f8] truncate" style={{ ...sans, fontWeight: 510 }}>
          {label}
        </p>
        {tx.description && (
          <p className="text-[11px] text-[#62666d] truncate" style={sans}>
            {tx.description}
          </p>
        )}
      </div>
      <span className="text-[11px] text-[#62666d] hidden sm:inline" style={mono}>
        {new Date(tx.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
      </span>
      <span
        className="text-[13px] tabular-nums"
        style={{
          ...mono,
          color: isNegative ? '#8a8f98' : '#f7f8f8',
          fontWeight: 510,
        }}
      >
        {sign}{new Intl.NumberFormat('fr-SN').format(amount)} FCFA
      </span>
    </div>
  )
}
