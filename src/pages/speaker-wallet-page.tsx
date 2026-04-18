import { useState } from 'react'
import { useAuth } from '../hooks/use-auth'
import { useWallet } from '../hooks/use-wallet'
import { useCountUp } from '../hooks/use-count-up'
import { Wallet, TrendingUp, ArrowDownCircle, Loader2, AlertCircle, Check } from 'lucide-react'
import type { WithdrawalMethod } from '../types/database'

const TX_TYPE_LABELS: Record<string, string> = {
  recording_validated: 'Enregistrement validé',
  validation_reward: 'Validation croisée',
  bonus: 'Bonus',
  withdrawal_request: 'Demande de retrait',
  withdrawal_paid: 'Retrait confirmé',
  withdrawal_refund: 'Remboursement retrait',
}

const TX_TYPE_COLOR: Record<string, string> = {
  recording_validated: 'text-secondary-600',
  validation_reward: 'text-secondary-500',
  bonus: 'text-primary-600',
  withdrawal_request: 'text-red-500',
  withdrawal_paid: 'text-sand-400',
  withdrawal_refund: 'text-secondary-400',
}

export function SpeakerWalletPage() {
  const { user } = useAuth()
  const { transactions, balance, loading, requestWithdrawal, refetch } = useWallet(user?.id)
  const animatedBalance = useCountUp(balance)

  const [showWithdraw, setShowWithdraw] = useState(false)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<WithdrawalMethod>('wave')
  const [destination, setDestination] = useState('')
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [withdrawError, setWithdrawError] = useState('')
  const [withdrawSuccess, setWithdrawSuccess] = useState(false)

  const handleWithdraw = async () => {
    setWithdrawError('')
    const amountNum = parseInt(amount)
    if (isNaN(amountNum) || amountNum < 5000) {
      setWithdrawError('Montant minimum : 5 000 FCFA')
      return
    }
    if (!destination.trim()) {
      setWithdrawError('Entrez votre numéro de téléphone ou IBAN')
      return
    }
    setWithdrawLoading(true)
    const { error } = await requestWithdrawal(amountNum, method, destination)
    setWithdrawLoading(false)
    if (error) { setWithdrawError(error); return }
    setWithdrawSuccess(true)
    setShowWithdraw(false)
    setAmount('')
    setDestination('')
    await refetch()
  }

  const formatAmount = (n: number) =>
    (n >= 0 ? '+' : '') + new Intl.NumberFormat('fr-SN').format(n) + '\u00a0FCFA'

  return (
    <div className="max-w-[42rem] mx-auto px-4 py-8">
      <h1
        className="text-2xl font-extrabold text-sand-900 dark:text-sand-100 mb-6"
        style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}
      >
        Mes gains
      </h1>

      {/* Solde principal */}
      <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-6 mb-6 text-white shadow-xl shadow-primary-500/25">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-4 h-4 opacity-80" />
          <span className="text-xs font-semibold opacity-80">Solde disponible</span>
        </div>
        <p
          className="text-4xl font-extrabold tabular-nums leading-none mb-4"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {new Intl.NumberFormat('fr-SN').format(animatedBalance)}
          <span className="text-lg font-bold opacity-70 ml-2">FCFA</span>
        </p>
        <button
          onClick={() => { setShowWithdraw(true); setWithdrawSuccess(false) }}
          disabled={balance < 5000}
          className="flex items-center gap-2 bg-white/20 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all"
        >
          <ArrowDownCircle className="w-4 h-4" />
          Retirer
        </button>
      </div>

      {/* Succès retrait */}
      {withdrawSuccess && (
        <div className="flex items-center gap-2.5 bg-secondary-50 border border-secondary-200 text-secondary-700 px-4 py-3 rounded-xl text-sm mb-5">
          <Check className="w-4 h-4 shrink-0" />
          Demande de retrait soumise. L'équipe vous paiera dans les 48h.
        </div>
      )}

      {/* Formulaire retrait */}
      {showWithdraw && (
        <div className="bg-white dark:bg-sand-900 rounded-2xl border border-sand-200/70 dark:border-sand-800/70 p-5 mb-6">
          <h2 className="text-sm font-bold text-sand-800 dark:text-sand-200 mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
            Demande de retrait
          </h2>
          {withdrawError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-xl text-sm mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {withdrawError}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-sand-700 dark:text-sand-300 mb-1.5">Montant (FCFA)</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min={5000}
                step={500}
                className="w-full px-4 py-3 rounded-xl border border-sand-200 bg-sand-50 dark:bg-sand-800 dark:border-sand-700 text-sand-900 dark:text-sand-100 focus:outline-none focus:ring-2 focus:ring-primary-400"
                placeholder="5000"
              />
              <p className="text-xs text-sand-400 mt-1">Minimum : 5{'\u202f'}000 FCFA · Disponible : {new Intl.NumberFormat('fr-SN').format(balance)} FCFA</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-sand-700 dark:text-sand-300 mb-1.5">Méthode</label>
              <div className="grid grid-cols-2 gap-2">
                {(['wave', 'orange_money', 'free_money', 'bank'] as WithdrawalMethod[]).map(m => {
                  const labels: Record<WithdrawalMethod, string> = {
                    wave: 'Wave', orange_money: 'Orange Money', free_money: 'Free Money', bank: 'Virement',
                  }
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={[
                        'py-2 rounded-xl border text-sm font-semibold transition-all',
                        method === m ? 'bg-primary-50 border-primary-400 text-primary-700' : 'border-sand-200 text-sand-600 hover:border-sand-300',
                      ].join(' ')}
                    >
                      {labels[m]}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-sand-700 dark:text-sand-300 mb-1.5">
                {method === 'bank' ? 'IBAN' : 'Numéro de téléphone'}
              </label>
              <input
                type="text"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-sand-200 bg-sand-50 dark:bg-sand-800 dark:border-sand-700 text-sand-900 dark:text-sand-100 focus:outline-none focus:ring-2 focus:ring-primary-400"
                placeholder={method === 'bank' ? 'SN28...' : '+221 77 000 00 00'}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowWithdraw(false)}
                className="px-5 py-2.5 rounded-xl border border-sand-200 text-sand-700 text-sm font-semibold hover:bg-sand-50 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleWithdraw}
                disabled={withdrawLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white text-sm font-bold shadow-md shadow-primary-500/20 hover:scale-[1.02] transition-all disabled:opacity-40"
              >
                {withdrawLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownCircle className="w-4 h-4" />}
                Confirmer le retrait
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historique */}
      <div>
        <h2 className="text-sm font-bold text-sand-700 dark:text-sand-300 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Historique des transactions
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-sand-400 text-sm text-center py-8">Aucune transaction pour l'instant</p>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => (
              <div
                key={tx.id}
                className="flex items-center justify-between py-3 border-b border-sand-100 dark:border-sand-800 last:border-0"
              >
                <div>
                  <p className="text-sm font-semibold text-sand-800 dark:text-sand-200">
                    {TX_TYPE_LABELS[tx.type] ?? tx.type}
                  </p>
                  {tx.description && (
                    <p className="text-xs text-sand-400">{tx.description}</p>
                  )}
                  <p className="text-[11px] text-sand-400 mt-0.5">
                    {new Date(tx.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span className={`text-sm font-bold tabular-nums ${TX_TYPE_COLOR[tx.type] ?? 'text-sand-600'}`}>
                  {formatAmount(tx.amount_fcfa)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
