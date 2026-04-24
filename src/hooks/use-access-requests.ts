import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type AccessRequestStatus = 'pending' | 'approved' | 'rejected' | 'waitlist'
export type AccessRequestRole = 'client' | 'speaker'

export interface AccessRequest {
  id: string
  email: string
  full_name: string
  phone: string | null
  intended_role: AccessRequestRole
  organization: string | null
  use_case: string | null
  expected_volume: string | null
  target_languages: string[] | null
  speaker_languages: string[] | null
  speaker_city: string | null
  speaker_age_range: string | null
  speaker_gender: string | null
  speaker_motivation: string | null
  status: AccessRequestStatus
  rejection_reason: string | null
  admin_notes: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  created_at: string
}

export interface UseAccessRequestsResult {
  requests: AccessRequest[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useAccessRequests(): UseAccessRequestsResult {
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await (supabase
      .from('access_requests')
      .select('*')
      .order('created_at', { ascending: false }) as unknown as Promise<{
        data: AccessRequest[] | null
        error: { message: string } | null
      }>)
    if (err) setError(err.message)
    setRequests(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { void fetchRequests() }, [fetchRequests])

  return { requests, loading, error, refetch: fetchRequests }
}
