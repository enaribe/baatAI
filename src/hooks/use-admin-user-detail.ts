import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface AdminUserDetail {
  id: string
  full_name: string | null
  email: string
  organization: string | null
  role: 'client' | 'speaker' | 'admin'
  status: 'active' | 'suspended' | 'revoked'
  suspended_reason: string | null
  suspended_at: string | null
  suspended_by_name: string | null
  created_at: string
  last_sign_in_at: string | null
  email_confirmed_at: string | null
  speaker: {
    phone: string | null
    city: string | null
    gender: string | null
    date_of_birth: string | null
    languages: string[] | null
    dialects: Record<string, string[]> | null
    bio: string | null
    is_certified: boolean
    reliability_score: number | null
    wallet_balance_fcfa: number
    total_validated: number
    sample_storage_path: string | null
  } | null
  stats: {
    projects_total: number
    projects_active: number
    projects_completed: number
    recordings_total: number
    recordings_valid: number
    recordings_invalid: number
    invitations_received: number
    invitations_accepted: number
    withdrawals_total: number
    withdrawals_pending: number
    total_paid_fcfa: number
  }
}

export function useAdminUserDetail(userId: string | null) {
  const [detail, setDetail] = useState<AdminUserDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!userId) { setDetail(null); return }
    setLoading(true)
    setError(null)
    type RpcRes = {
      data: AdminUserDetail | null
      error: { message: string } | null
    }
    const { data, error: err } = await (supabase as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<RpcRes>
    }).rpc('admin_user_detail', { p_user_id: userId })
    if (err) setError(err.message)
    setDetail(data ?? null)
    setLoading(false)
  }, [userId])

  useEffect(() => { void fetch() }, [fetch])

  return { detail, loading, error, refetch: fetch }
}
