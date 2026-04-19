import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface MatchedSpeaker {
  speaker_id: string
  full_name: string | null
  avatar_url: string | null
  city: string | null
  gender: string | null
  languages: string[]
  dialects: Record<string, string[]>
  reliability_score: number
  is_certified: boolean
  total_validated: number
  match_score: number
  invitation_status: string | null
  has_active_session: boolean
}

export interface MatchFilters {
  search?: string
  gender?: string
  certifiedOnly?: boolean
}

interface UseMatchSpeakersResult {
  speakers: MatchedSpeaker[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useMatchSpeakers(
  projectId: string | undefined,
  filters: MatchFilters,
): UseMatchSpeakersResult {
  const [speakers, setSpeakers] = useState<MatchedSpeaker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMatches = useCallback(async () => {
    if (!projectId) { setLoading(false); return }
    setLoading(true)
    setError(null)

    const { data, error: err } = await (supabase as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{
        data: MatchedSpeaker[] | null
        error: { message: string } | null
      }>
    }).rpc('match_speakers_for_project', {
      p_project_id: projectId,
      p_search: filters.search ?? null,
      p_filter_gender: filters.gender ?? null,
      p_filter_certified: filters.certifiedOnly ?? false,
    })

    if (err) setError(err.message)
    setSpeakers(data ?? [])
    setLoading(false)
  }, [projectId, filters.search, filters.gender, filters.certifiedOnly])

  useEffect(() => { fetchMatches() }, [fetchMatches])

  return { speakers, loading, error, refetch: fetchMatches }
}
