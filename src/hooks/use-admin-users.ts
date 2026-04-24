import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type AdminUserRole = 'client' | 'speaker' | 'admin'
export type AdminUserStatus = 'active' | 'suspended' | 'revoked'

export interface AdminUserRow {
  id: string
  full_name: string | null
  email: string
  organization: string | null
  role: AdminUserRole
  status: AdminUserStatus
  suspended_reason: string | null
  suspended_at: string | null
  created_at: string
  last_sign_in_at: string | null
  // Stats client
  projects_count: number
  active_projects_count: number
  // Stats speaker
  speaker_city: string | null
  speaker_languages: string[] | null
  recordings_count: number
  validated_recordings_count: number
  wallet_balance_fcfa: number
  pending_withdrawal: boolean
}

export interface AdminUsersFilters {
  role?: AdminUserRole | 'all'
  status?: AdminUserStatus | 'all'
  search?: string
}

export function useAdminUsers(filters: AdminUsersFilters) {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    type RpcRes = {
      data: AdminUserRow[] | null
      error: { message: string; details?: string; hint?: string; code?: string } | null
    }
    const { data, error: err } = await (supabase as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<RpcRes>
    }).rpc('admin_list_users', {
      p_role: filters.role && filters.role !== 'all' ? filters.role : null,
      p_status: filters.status && filters.status !== 'all' ? filters.status : null,
      p_search: filters.search?.trim() || null,
      p_limit: 200,
      p_offset: 0,
    })
    if (err) {
      console.error('[useAdminUsers] RPC error full:', JSON.stringify(err, null, 2))
      setError([err.message, err.details, err.hint, err.code].filter(Boolean).join(' | '))
    }
    setUsers(data ?? [])
    setLoading(false)
  }, [filters.role, filters.status, filters.search])

  useEffect(() => { void fetchUsers() }, [fetchUsers])

  return { users, loading, error, refetch: fetchUsers }
}
