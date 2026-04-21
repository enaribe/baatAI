import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { WalletTransaction, Withdrawal, WithdrawalMethod } from '../types/database'

interface UseWalletResult {
  transactions: WalletTransaction[]
  withdrawals: Withdrawal[]
  balance: number
  loading: boolean
  error: string | null
  requestWithdrawal: (amount: number, method: WithdrawalMethod, destination: string) => Promise<{ error: string | null }>
  refetch: () => Promise<void>
}

export function useWallet(speakerId: string | undefined): UseWalletResult {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetchData = useCallback(async () => {
    if (!speakerId) { setLoading(false); return }
    setLoading(true)
    const [txRes, wRes, spRes] = await Promise.all([
      supabase
        .from('wallet_transactions')
        .select('*')
        .eq('speaker_id', speakerId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('withdrawals')
        .select('*')
        .eq('speaker_id', speakerId)
        .order('created_at', { ascending: false }),
      supabase
        .from('speaker_profiles')
        .select('wallet_balance_fcfa')
        .eq('id', speakerId)
        .single() as unknown as Promise<{ data: { wallet_balance_fcfa: number } | null; error: unknown }>,
    ])
    if (txRes.error) setError(txRes.error.message)
    setTransactions(txRes.data ?? [])
    setWithdrawals(wRes.data ?? [])
    setBalance(spRes.data?.wallet_balance_fcfa ?? 0)
    setLoading(false)
  }, [speakerId])

  useEffect(() => { refetchData() }, [refetchData])

  const requestWithdrawal = useCallback(async (
    amount: number,
    method: WithdrawalMethod,
    destination: string,
  ) => {
    if (!speakerId) return { error: 'Non authentifié' }
    if (amount < 5000) return { error: 'Le montant minimum est de 5 000 FCFA' }
    if (balance < amount) return { error: 'Solde insuffisant' }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { error: 'Session expirée' }

    const globalFetch = globalThis.fetch
    const res = await globalFetch(`${supabaseUrl}/functions/v1/request-withdrawal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      },
      body: JSON.stringify({ amount_fcfa: amount, method, destination }),
    })
    const json = await res.json() as { data: unknown; error: string | null }
    if (!res.ok || json.error) return { error: json.error ?? 'Erreur serveur' }
    await refetchData()
    return { error: null }
  }, [speakerId, balance, refetchData])

  return { transactions, withdrawals, balance, loading, error, requestWithdrawal, refetch: refetchData }
}
