import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type AllowedEmailRole = 'client' | 'speaker' | 'admin'
export type AllowedEmailSource = 'request' | 'manual' | 'invitation' | 'bootstrap'

export interface AllowedEmail {
  email: string
  role: AllowedEmailRole
  source: AllowedEmailSource
  request_id: string | null
  invitation_token: string | null
  approved_at: string
  approved_by: string | null
  expires_at: string | null
  used_at: string | null
  signed_up_user_id: string | null
}

export function useAllowedEmails() {
  const [list, setList] = useState<AllowedEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await (supabase
      .from('allowed_emails')
      .select('*')
      .order('approved_at', { ascending: false }) as unknown as Promise<{
        data: AllowedEmail[] | null
        error: { message: string } | null
      }>)
    if (err) setError(err.message)
    setList(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { void fetchList() }, [fetchList])

  return { list, loading, error, refetch: fetchList }
}
